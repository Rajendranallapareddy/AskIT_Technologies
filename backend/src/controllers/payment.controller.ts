import { Response, NextFunction, Request } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { getPaymentGateway, getActivePaymentGateway } from '../services/paymentGateway';
import { calculateInternshipPrice, getPaymentSettings, splitIntoInstallments, PricingResult } from '../services/pricing.service';
import { getActiveManualPaymentAccounts } from '../services/paymentAccount.service';
import { generateReceiptPdf } from '../services/receipt.service';
import { generatePaymentNumber, generateReceiptNumber, generateRegistrationNumber } from '../utils/helpers';
import { generateSecureToken } from '../utils/crypto';
import { logActivity } from '../services/audit.service';
import { notifyUser, notifyAdmins } from '../services/notify.service';

const PENDING_ORDER_REUSE_WINDOW_MS = 20 * 60 * 1000; // reuse an unpaid order for 20 minutes instead of spawning a new one

// POST /api/payments/create-order
// Body: { internshipId, couponCode?, idempotencyKey, installments? }
// The idempotencyKey is a client-generated UUID kept for the lifetime of one
// checkout attempt (e.g. stored in component state) — resubmitting the same
// key returns the same order instead of creating a duplicate.
//
// `installments` (optional, 2-6): when set, the student is opting to split
// the fee into that many installments instead of paying in full. Only the
// FIRST installment is charged now; the rest are collected later (see
// createInstallmentOrder / payNextInstallment below).
export async function createOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { internshipId, couponCode, idempotencyKey, installments, paymentMethod } = req.body;
    if (!internshipId || !idempotencyKey) throw new AppError('internshipId and idempotencyKey are required', 400);
    const numberOfInstallments = installments ? Math.max(2, Math.min(6, Number(installments))) : null;
    // The student can explicitly ask to pay via UPI/bank transfer instead of
    // the online gateway (e.g. they'd rather scan the Super Admin's UPI QR
    // code than go through Razorpay) — 'MANUAL' forces the offline/pending
    // path below regardless of whether an online gateway is configured.
    const forceManual = paymentMethod === 'MANUAL';

    const userId = req.user!.id;

    const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
    if (!internship) throw new AppError('Internship not found', 404);
    if (internship.status !== 'OPEN') throw new AppError('Registrations are not open for this internship', 400);
    if (new Date() > new Date(internship.registrationDeadline)) throw new AppError('Registration deadline has passed', 400);
    if (internship.seatsFilled >= internship.totalSeats) throw new AppError('No seats available', 400);

    // Replay/duplicate protection: if this exact idempotency key was already
    // used, return the existing order instead of creating a new one.
    const existingByKey = await prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existingByKey) {
      return res.json({ success: true, data: await toOrderResponse(existingByKey) });
    }

    // Prevent duplicate registrations: reuse the existing registration row
    // for this user+internship if one already exists and hasn't succeeded.
    let registration = await prisma.registration.findUnique({
      where: { userId_internshipId: { userId, internshipId } },
    });
    if (registration && !['AWAITING_PAYMENT', 'PENDING', 'CANCELLED', 'REJECTED'].includes(registration.status)) {
      throw new AppError('You already have an active registration for this internship', 409);
    }

    // Reuse a still-fresh unpaid order for this registration rather than
    // spawning a second one at the gateway (avoids duplicate PENDING orders
    // from double-clicks or page refreshes) — but only if it matches what
    // the student is asking for right now. Without this check, someone who
    // abandoned an online Razorpay order and came back asking to pay via
    // UPI/bank transfer instead would just get the same stale online order
    // handed back to them, with no way to reach the manual payment screen.
    if (registration) {
      const recentPending = await prisma.payment.findFirst({
        where: {
          registrationId: registration.id,
          status: 'PENDING',
          gateway: forceManual ? 'MANUAL' : { not: 'MANUAL' },
          createdAt: { gte: new Date(Date.now() - PENDING_ORDER_REUSE_WINDOW_MS) },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (recentPending) {
        if (forceManual) {
          return res.json({
            success: true,
            data: {
              isFree: false,
              requiresOfflinePayment: true,
              registrationId: registration.id,
              registrationNo: registration.registrationNo,
              paymentId: recentPending.id,
              paymentNo: recentPending.paymentNo,
              amountDue: Number(recentPending.totalAmount),
              installmentPlanId: recentPending.installmentPlanId,
              manualAccounts: await getActiveManualPaymentAccounts(),
            },
          });
        }
        return res.json({ success: true, data: await toOrderResponse(recentPending) });
      }
    }

    // --- Resume an existing installment plan instead of creating a second
    // one -----------------------------------------------------------------
    // InstallmentPlan.registrationId is unique — one plan per registration,
    // ever. If the student already started a plan (picked "2/3
    // Installments" once before) and comes back — e.g. they closed the
    // Razorpay popup without paying, or are just re-clicking the button —
    // creating a fresh plan here crashed with a raw Prisma "unique
    // constraint failed on registrationId" error. Instead, pick up exactly
    // where they left off: find the next unpaid installment and hand back
    // an order for THAT, regardless of what the button was clicked as this
    // time (the plan's own schedule, set when it was first created, is
    // always the source of truth once it exists).
    const existingPlan = registration
      ? await prisma.installmentPlan.findUnique({
          where: { registrationId: registration.id },
          include: { payments: true },
        })
      : null;
    if (registration && existingPlan) {
      if (existingPlan.status !== 'ACTIVE') {
        throw new AppError('This registration has already been paid in full.', 400);
      }
      const gateway = forceManual ? getPaymentGateway('MANUAL') : await getActivePaymentGateway();
      const unpaid = existingPlan.payments
        .filter((p) => p.status !== 'SUCCESS')
        .sort((a, b) => (a.installmentIndex || 0) - (b.installmentIndex || 0));
      const nextDue = unpaid[0];

      if (nextDue) {
        return respondWithInstallmentOrder(res, nextDue, gateway, registration);
      }

      // Every created installment row succeeded but the plan hasn't reached
      // its full count yet (e.g. only installment 1 was ever created) —
      // create the next one using the plan's original amounts.
      const nextIndex = existingPlan.payments.length + 1;
      if (nextIndex > existingPlan.numberOfInstallments) {
        throw new AppError('This registration has already been paid in full.', 400);
      }
      const schedule = splitIntoInstallments(
        { baseAmount: Number(existingPlan.totalAmount), discountAmount: 0, taxAmount: 0, totalAmount: Number(existingPlan.totalAmount), isFree: false } as PricingResult,
        existingPlan.numberOfInstallments
      );
      const amounts = schedule[nextIndex - 1];
      const newPayment = await prisma.payment.create({
        data: {
          paymentNo: generatePaymentNumber(),
          idempotencyKey,
          userId,
          internshipId,
          registrationId: registration.id,
          installmentPlanId: existingPlan.id,
          installmentIndex: nextIndex,
          baseAmount: amounts.baseAmount,
          discountAmount: amounts.discountAmount,
          taxAmount: amounts.taxAmount,
          totalAmount: amounts.totalAmount,
          status: 'PENDING',
          gateway: gateway.isAvailable() ? (gateway.name as any) : 'MANUAL',
          method: gateway.isAvailable() ? undefined : 'OFFLINE',
          dueDate: new Date(),
        },
      });
      return respondWithInstallmentOrder(res, newPayment, gateway, registration);
    }

    const pricing = await calculateInternshipPrice(internshipId, couponCode);

    if (!registration) {
      registration = await prisma.registration.create({
        data: { userId, internshipId, status: 'AWAITING_PAYMENT', requiresPayment: !pricing.isFree },
      });
    } else {
      registration = await prisma.registration.update({
        where: { id: registration.id },
        data: { status: 'AWAITING_PAYMENT', requiresPayment: !pricing.isFree, cancelledAt: null, decidedAt: null },
      });
    }

    // Free internship — skip the gateway entirely, confirm immediately.
    if (pricing.isFree) {
      const settings = await getPaymentSettings();
      const regNo = generateRegistrationNumber();
      await prisma.registration.update({
        where: { id: registration.id },
        data: {
          status: settings.autoApproveOnPay ? 'APPROVED' : 'PENDING',
          registrationNo: regNo,
          decidedAt: settings.autoApproveOnPay ? new Date() : undefined,
        },
      });
      await prisma.notification.create({
        data: {
          userId,
          type: 'REGISTRATION',
          title: 'Registration Confirmed',
          message: `Your registration for "${internship.title}" is confirmed (no payment required).`,
        },
      });
      return res.json({ success: true, data: { isFree: true, registrationId: registration.id, registrationNo: regNo } });
    }

    // Consult the DB-backed active gateway (admin-configurable in Payment
    // Settings), not just the env var — see getActivePaymentGateway(). If
    // the student explicitly asked to pay manually (UPI QR / bank
    // transfer), skip straight past it — getPaymentGateway('MANUAL')'s
    // isAvailable() always returns false, so onlineAvailable naturally
    // becomes false and the offline/manual branch below runs.
    const gateway = forceManual ? getPaymentGateway('MANUAL') : await getActivePaymentGateway();
    const onlineAvailable = gateway.isAvailable();

    // Build the installment plan (if requested) up front, so both the
    // "online available" and "pay later / offline" branches below can share
    // the same amounts.
    let installmentPlanId: string | undefined;
    let installmentSchedule: ReturnType<typeof splitIntoInstallments> | null = null;
    let firstInstallmentAmounts: PricingResult = pricing;

    if (numberOfInstallments) {
      installmentSchedule = splitIntoInstallments(pricing, numberOfInstallments);
      const plan = await prisma.installmentPlan.create({
        data: {
          registrationId: registration.id,
          totalAmount: pricing.totalAmount,
          numberOfInstallments,
        },
      });
      installmentPlanId = plan.id;
      const first = installmentSchedule[0];
      firstInstallmentAmounts = {
        baseAmount: first.baseAmount,
        discountAmount: first.discountAmount,
        taxAmount: first.taxAmount,
        totalAmount: first.totalAmount,
        couponId: pricing.couponId,
        isFree: false,
        gstPercentage: pricing.gstPercentage,
        originalFee: pricing.originalFee,
        isEarlyBird: pricing.isEarlyBird,
      };

      // Pre-create Payment rows for every installment 2..N right now, up
      // front, each with its own due date staggered 30 days apart. This is
      // what lets the full schedule (due dates, upcoming reminders, "My
      // Courses" progress) be shown and reminded on before the student has
      // touched anything beyond installment 1 — they aren't created lazily
      // the moment the student happens to click "Pay Now" on each one.
      // They stay un-linked to any payment gateway (no gatewayOrderId)
      // until the student actually pays — payInstallment() creates the
      // real gateway order at that point.
      const INSTALLMENT_INTERVAL_DAYS = 30;
      for (let i = 1; i < installmentSchedule.length; i++) {
        const amounts = installmentSchedule[i];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + INSTALLMENT_INTERVAL_DAYS * i);
        await prisma.payment.create({
          data: {
            paymentNo: generatePaymentNumber(),
            idempotencyKey: `installment_${generateSecureToken(12)}`,
            userId,
            internshipId,
            registrationId: registration.id,
            installmentPlanId,
            installmentIndex: amounts.index,
            baseAmount: amounts.baseAmount,
            discountAmount: amounts.discountAmount,
            taxAmount: amounts.taxAmount,
            totalAmount: amounts.totalAmount,
            status: 'PENDING',
            gateway: onlineAvailable ? (gateway.name as any) : 'MANUAL',
            method: onlineAvailable ? undefined : 'OFFLINE',
            dueDate,
          },
        });
      }
    }

    const paymentNo = generatePaymentNumber();

    // Online gateway is up and configured — create a real order the same as
    // before, just now correctly gated on the *active* gateway rather than
    // whatever the env var happened to say.
    if (onlineAvailable) {
      const order = await gateway.createOrder({
        amountInPaise: Math.round(firstInstallmentAmounts.totalAmount * 100),
        currency: 'INR',
        receipt: paymentNo,
        notes: { internshipId, userId, paymentNo },
      });

      const payment = await prisma.payment.create({
        data: {
          paymentNo,
          idempotencyKey,
          userId,
          internshipId,
          registrationId: registration.id,
          couponId: firstInstallmentAmounts.couponId || undefined,
          baseAmount: firstInstallmentAmounts.baseAmount,
          discountAmount: firstInstallmentAmounts.discountAmount,
          taxAmount: firstInstallmentAmounts.taxAmount,
          totalAmount: firstInstallmentAmounts.totalAmount,
          status: 'PENDING',
          gateway: gateway.name as any,
          gatewayOrderId: order.gatewayOrderId,
          installmentPlanId,
          installmentIndex: installmentPlanId ? 1 : undefined,
          dueDate: installmentPlanId ? new Date() : undefined,
        },
      });

      const responseData: any = await toOrderResponse(payment);
      if (installmentSchedule) {
        responseData.installmentPlanId = installmentPlanId;
        responseData.installmentSchedule = installmentSchedule;
      }
      return res.status(201).json({ success: true, data: responseData });
    }

    // --- Online payment isn't available right now (no gateway configured,
    // or the admin has deliberately switched to Manual/offline-only). This
    // used to be a dead end: the student got an error and could not
    // register at all. Now the registration is confirmed immediately —
    // exactly like the offline-payment flow an admin uses — with the fee
    // (or the first installment) recorded as due, so a student is never
    // blocked from enrolling just because online checkout isn't set up yet.
    // An admin can settle it later from Admin → Payments → Record Offline
    // Payment (or the student can retry online once it's configured).
    const settings = await getPaymentSettings();
    const regNo = registration.registrationNo || generateRegistrationNumber();
    registration = await prisma.registration.update({
      where: { id: registration.id },
      data: { status: 'PENDING', registrationNo: regNo, requiresPayment: true },
    });

    const pendingPayment = await prisma.payment.create({
      data: {
        paymentNo,
        idempotencyKey,
        userId,
        internshipId,
        registrationId: registration.id,
        couponId: firstInstallmentAmounts.couponId || undefined,
        baseAmount: firstInstallmentAmounts.baseAmount,
        discountAmount: firstInstallmentAmounts.discountAmount,
        taxAmount: firstInstallmentAmounts.taxAmount,
        totalAmount: firstInstallmentAmounts.totalAmount,
        status: 'PENDING',
        gateway: 'MANUAL',
        method: 'OFFLINE',
        installmentPlanId,
        installmentIndex: installmentPlanId ? 1 : undefined,
        dueDate: new Date(),
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: 'REGISTRATION',
        title: 'Registration Received — Payment Pending',
        message:
          `Your registration for "${internship.title}" is confirmed (${regNo}). Online payment isn't set up yet, ` +
          `so ₹${firstInstallmentAmounts.totalAmount}${installmentPlanId ? ' (Installment 1)' : ''} is due — ` +
          `ASK IT Technologies will contact you to collect it, or you can retry online payment later if it becomes available.`,
      },
    });

    await logActivity({
      actorId: userId,
      action: 'REGISTRATION_PENDING_PAYMENT',
      description: `Registered for "${internship.title}" with payment due offline (${gateway.name === 'MANUAL' ? 'manual gateway' : 'gateway not configured'})`,
      newValue: { registrationId: registration.id, paymentId: pendingPayment.id, amount: firstInstallmentAmounts.totalAmount },
    });

    const manualAccounts = await getActiveManualPaymentAccounts();

    return res.status(201).json({
      success: true,
      message: forceManual
        ? 'Registration confirmed! Scan the QR code or use the UPI/bank details below to pay, then submit your reference number so it can be verified.'
        : settings.activeGateway === 'MANUAL'
        ? 'Registration confirmed! Online payments are currently offline-only for this program — pay via the UPI/bank details below, or ASK IT Technologies will reach out to collect payment.'
        : 'Registration confirmed! Online payment is temporarily unavailable, so your payment is pending — pay via the UPI/bank details below, or check back shortly to try online payment again.',
      data: {
        isFree: false,
        requiresOfflinePayment: true,
        registrationId: registration.id,
        registrationNo: regNo,
        paymentId: pendingPayment.id,
        paymentNo: pendingPayment.paymentNo,
        amountDue: Number(pendingPayment.totalAmount),
        installmentPlanId,
        installmentSchedule,
        manualAccounts,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function toOrderResponse(payment: any) {
  const gateway = getPaymentGateway(payment.gateway);
  return {
    isFree: false,
    paymentId: payment.id,
    paymentNo: payment.paymentNo,
    gatewayOrderId: payment.gatewayOrderId,
    amount: Number(payment.totalAmount),
    currency: payment.currency,
    keyId: gateway.getPublicKey(),
    status: payment.status,
  };
}

// Shared by the "resume an existing installment plan" branch of
// createOrder and could equally serve payInstallment — given one specific
// PENDING/FAILED Payment row that's due, either opens a fresh gateway order
// for it (online available) or falls back to the offline/"pay later" flow,
// confirming the registration if this is the very first time it's being
// confirmed.
async function respondWithInstallmentOrder(res: Response, payment: any, gateway: any, registration: any) {
  if (gateway.isAvailable()) {
    const order = await gateway.createOrder({
      amountInPaise: Math.round(Number(payment.totalAmount) * 100),
      currency: 'INR',
      receipt: payment.paymentNo,
      notes: { internshipId: payment.internshipId, userId: payment.userId, paymentNo: payment.paymentNo },
    });
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PENDING', gateway: gateway.name as any, gatewayOrderId: order.gatewayOrderId, failureReason: null },
    });
    const responseData: any = await toOrderResponse(updated);
    responseData.installmentPlanId = updated.installmentPlanId;
    return res.status(201).json({ success: true, data: responseData });
  }

  const regNo = registration.registrationNo || generateRegistrationNumber();
  if (!registration.registrationNo) {
    registration = await prisma.registration.update({
      where: { id: registration.id },
      data: { status: 'PENDING', registrationNo: regNo, requiresPayment: true },
    });
  }
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'PENDING', gateway: 'MANUAL', method: 'OFFLINE', gatewayOrderId: null, failureReason: null },
  });
  return res.status(201).json({
    success: true,
    message: 'Scan the QR code or use the UPI/bank details below to pay this installment, then submit your reference number so it can be verified.',
    data: {
      isFree: false,
      requiresOfflinePayment: true,
      registrationId: registration.id,
      registrationNo: regNo,
      paymentId: updated.id,
      paymentNo: updated.paymentNo,
      amountDue: Number(updated.totalAmount),
      installmentPlanId: updated.installmentPlanId,
      manualAccounts: await getActiveManualPaymentAccounts(),
    },
  });
}

// POST /api/payments/verify
// Body: { paymentId, gatewayOrderId, gatewayPaymentId, gatewaySignature, method? }
// This is the critical trust boundary: the frontend only tells us a payment
// happened; the signature check below is what actually proves it, using a
// secret the browser never sees.
export async function verifyPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { paymentId, gatewayOrderId, gatewayPaymentId, gatewaySignature, method } = req.body;
    if (!paymentId || !gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
      throw new AppError('Missing payment verification fields', 400);
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { internship: { include: { trainer: { include: { user: true } } } }, user: true, registration: true },
    });
    if (!payment || payment.userId !== req.user!.id) throw new AppError('Payment not found', 404);

    // Idempotent: if this payment already succeeded (e.g. the browser
    // retried after a network blip), just return the existing receipt
    // instead of re-processing or double-crediting anything.
    if (payment.status === 'SUCCESS') {
      const receipt = await prisma.receipt.findUnique({ where: { paymentId: payment.id } });
      return res.json({ success: true, message: 'Payment already verified', data: { receiptNo: receipt?.receiptNo } });
    }
    if (payment.status === 'PENDING_APPROVAL') {
      return res.json({ success: true, message: 'Payment already submitted and awaiting Super Admin approval', data: { pendingApproval: true } });
    }
    if (payment.gatewayOrderId !== gatewayOrderId) throw new AppError('Order mismatch', 400);

    const gateway = getPaymentGateway(payment.gateway);
    const isValid = gateway.verifyPaymentSignature({ gatewayOrderId, gatewayPaymentId, gatewaySignature });
    if (!isValid) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: 'Signature verification failed' } });
      throw new AppError('Payment verification failed', 400);
    }

    // Every installment payment — regardless of how it was paid — must be
    // reviewed and approved by the Super Admin before it's credited as
    // paid, the student is enrolled (first installment) or a receipt is
    // issued. Cryptographic gateway verification above already proves the
    // charge went through; PENDING_APPROVAL is a business approval gate on
    // top of that, not a trust/security check.
    if (payment.installmentPlanId) {
      const result = await markInstallmentPendingApproval(payment, gatewayPaymentId, gatewaySignature, method);
      return res.json({ success: true, message: 'Payment received! It is now pending Super Admin approval.', data: result });
    }

    // gatewayPaymentId has a unique constraint — this atomically blocks the
    // same gateway payment ID from ever being attached to a second Payment
    // row, which is what stops replay/duplicate-credit attempts.
    const result = await finalizePaymentSuccess(payment, gatewayPaymentId, gatewaySignature, method);
    res.json({ success: true, message: 'Payment verified successfully', data: result });
  } catch (err) {
    next(err);
  }
}

// Marks an installment payment as paid-but-unverified: the gateway has
// already confirmed the charge (signature checked by the caller), but per
// the installment approval workflow this must still wait for a Super Admin
// to review and approve it before it's credited, a receipt is issued, or
// (for the very first installment) the student is enrolled.
async function markInstallmentPendingApproval(payment: any, gatewayPaymentId: string, gatewaySignature: string, method?: string) {
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'PENDING_APPROVAL',
      gatewayPaymentId,
      gatewaySignature,
      method: (method as any) || 'UNKNOWN',
    },
  });

  const installmentLabel = payment.installmentIndex ? ` (Installment ${payment.installmentIndex})` : '';

  await notifyUser({
    userId: payment.userId,
    type: 'PAYMENT',
    title: 'Payment Submitted — Pending Approval',
    message: `Your payment of ₹${payment.totalAmount}${installmentLabel} for "${payment.internship.title}" was received and is pending Super Admin approval. You'll be notified once it's verified.`,
    link: '/payment-history',
  });

  await notifyAdmins({
    type: 'PAYMENT',
    title: 'Installment Payment Awaiting Approval',
    message: `${payment.user.fullName} paid ₹${payment.totalAmount}${installmentLabel} for "${payment.internship.title}" (${payment.paymentNo}). Review and approve from Admin → Payments.`,
    link: '/admin/payments',
  });

  await logActivity({
    actorId: payment.userId,
    action: 'PAYMENT_PENDING_APPROVAL',
    description: `Payment ${payment.paymentNo} submitted (₹${payment.totalAmount}${installmentLabel}) and is awaiting Super Admin approval`,
    newValue: { paymentId: payment.id, gatewayPaymentId },
  });

  return { paymentNo: updated.paymentNo, status: updated.status, pendingApproval: true };
}

async function finalizePaymentSuccess(payment: any, gatewayPaymentId: string, gatewaySignature: string, method?: string, approvedById?: string) {
  const settings = await getPaymentSettings();

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'SUCCESS',
      gatewayPaymentId,
      gatewaySignature,
      method: (method as any) || 'UNKNOWN',
      paidAt: new Date(),
      ...(approvedById ? { approvedById, approvedAt: new Date(), rejectionReason: null } : {}),
    },
  });

  if (payment.couponId) {
    await prisma.coupon.update({ where: { id: payment.couponId }, data: { usedCount: { increment: 1 } } });
  }

  // A registration can now receive several successful payments (one per
  // installment). Only the FIRST one should move it out of
  // AWAITING_PAYMENT / assign a registration number — later installments on
  // an already-confirmed registration must not regress its status or
  // overwrite a registration number a student may already be relying on
  // (e.g. it's printed on their receipt / ID card).
  const existingRegistration = payment.registration || (await prisma.registration.findUnique({ where: { id: payment.registrationId } }));
  const isFirstConfirmation = !existingRegistration?.registrationNo;
  const regNo = existingRegistration?.registrationNo || generateRegistrationNumber();

  const registration = await prisma.registration.update({
    where: { id: payment.registrationId },
    data: isFirstConfirmation
      ? {
          status: settings.autoApproveOnPay ? 'APPROVED' : 'PENDING',
          registrationNo: regNo,
          decidedAt: settings.autoApproveOnPay ? new Date() : undefined,
        }
      : {}, // registration already confirmed by an earlier installment — leave status untouched
  });

  // If this payment belongs to an installment plan, check whether every
  // installment is now paid so the plan can be marked COMPLETED.
  //
  // IMPORTANT: this must compare the number of SUCCESS payments against
  // plan.numberOfInstallments — NOT "how many non-SUCCESS Payment rows
  // currently exist" — because a plan can (for older data, or before all
  // installment rows exist yet) have fewer Payment rows than
  // numberOfInstallments at any given moment. Counting "0 unpaid rows
  // exist" was wrongly marking a 3-installment plan COMPLETED after only
  // the first installment was approved, whenever installments 2/3 hadn't
  // been created as rows yet.
  let installmentLabel = '';
  let planJustCompleted = false;
  if (payment.installmentPlanId) {
    const plan = await prisma.installmentPlan.findUnique({ where: { id: payment.installmentPlanId } });
    if (plan) {
      installmentLabel = ` (Installment ${payment.installmentIndex || '?'} of ${plan.numberOfInstallments})`;
      const paidCount = await prisma.payment.count({
        where: { installmentPlanId: plan.id, status: 'SUCCESS' },
      });
      if (paidCount >= plan.numberOfInstallments && plan.status !== 'COMPLETED') {
        await prisma.installmentPlan.update({ where: { id: plan.id }, data: { status: 'COMPLETED' } });
        planJustCompleted = true;
      }
    }
  }

  const receiptNo = generateReceiptNumber();
  const verifyToken = generateSecureToken();
  const fileUrl = await generateReceiptPdf({
    receiptNo,
    verifyToken,
    studentName: payment.user.fullName,
    studentEmail: payment.user.email,
    internshipTitle: payment.internship.title + installmentLabel,
    baseAmount: Number(payment.baseAmount),
    discountAmount: Number(payment.discountAmount),
    taxAmount: Number(payment.taxAmount),
    totalAmount: Number(payment.totalAmount),
    gstPercentage: Number(payment.internship.gstPercentage || 0),
    method: method || null,
    gatewayPaymentId,
    paidAt: new Date(),
  });

  const receipt = await prisma.receipt.create({
    data: { receiptNo, paymentId: payment.id, verifyToken, fileUrl },
  });

  await notifyUser({
    userId: payment.userId,
    type: 'PAYMENT',
    title: approvedById ? 'Payment Approved' : 'Payment Successful',
    message: approvedById
      ? `Your payment of ₹${payment.totalAmount}${installmentLabel} for "${payment.internship.title}" has been approved by the Super Admin and marked as Paid. Registration ID: ${regNo}.`
      : `Your payment of ₹${payment.totalAmount}${installmentLabel} for "${payment.internship.title}" was successful. Registration ID: ${regNo}.`,
    link: '/payment-history',
  });

  if (planJustCompleted) {
    await notifyUser({
      userId: payment.userId,
      type: 'PAYMENT',
      title: 'All Installments Paid',
      message: `🎉 You've completed every installment for "${payment.internship.title}". Your payment plan is fully paid off — thank you!`,
      link: '/my-internships',
    });
  }

  // Best-effort receipt delivery over email + WhatsApp. Failures here must
  // never roll back the payment itself — the payment already succeeded and
  // the receipt/registration are already saved, so we just log and move on.
  try {
    const { sendMail } = await import('../services/email.service');
    const { sendWhatsApp, receiptWhatsAppMessage } = await import('../services/whatsapp.service');
    const fullDownloadUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}${fileUrl}`;

    await sendMail({
      to: payment.user.email,
      subject: `Payment Receipt — ${receiptNo}`,
      html: `<p>Hi ${payment.user.fullName},</p><p>Your payment of ₹${payment.totalAmount} for "${payment.internship.title}" was successful.</p><p>Download your receipt: <a href="${fullDownloadUrl}">${fullDownloadUrl}</a></p>`,
    });

    if (payment.user.mobileNumber) {
      await sendWhatsApp({
        to: payment.user.mobileNumber,
        body: receiptWhatsAppMessage({
          studentName: payment.user.fullName,
          internshipTitle: payment.internship.title,
          amount: Number(payment.totalAmount),
          receiptNo,
          downloadUrl: fullDownloadUrl,
        }),
      });
    }
    await prisma.receipt.update({ where: { id: receipt.id }, data: { emailedAt: new Date() } });
  } catch (deliveryErr) {
    console.error('Receipt delivery (email/WhatsApp) failed:', deliveryErr);
  }

  await logActivity({
    actorId: payment.userId,
    action: 'PAYMENT_SUCCESS',
    description: `Payment ${payment.paymentNo} succeeded for "${payment.internship.title}" (₹${payment.totalAmount})`,
    newValue: { paymentId: payment.id, gatewayPaymentId },
  });

  return { paymentNo: updatedPayment.paymentNo, registrationNo: regNo, registrationStatus: registration.status, receiptNo, fileUrl };
}

// POST /api/payments/failure
// Body: { paymentId, reason }
// Called by the frontend when the gateway checkout reports failure/cancel.
// The registration stays AWAITING_PAYMENT so the user can simply retry —
// no duplicate registration is created.
export async function reportFailure(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { paymentId, reason } = req.body;
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.userId !== req.user!.id) throw new AppError('Payment not found', 404);
    if (payment.status === 'SUCCESS') return res.json({ success: true, message: 'Payment already succeeded' });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: (reason || 'Payment failed or cancelled by user').slice(0, 300) },
    });

    await notifyUser({
      userId: payment.userId,
      type: 'PAYMENT',
      title: 'Payment Failed',
      message: `Your payment attempt (${payment.paymentNo}) was not completed. You can retry anytime before the registration deadline.`,
      link: '/payment-history',
      push: false,
    });

    res.json({ success: true, message: 'Failure recorded. You can retry payment.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/webhook — server-to-server confirmation from the
// gateway. This is a defense-in-depth complement to /verify: even if a user
// closes the browser mid-checkout, the webhook still confirms the payment.
// Must be mounted with the raw body parser (see routes file) so the
// signature can be verified against the exact bytes the gateway sent.
export async function handleWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    // Webhooks only ever arrive from Razorpay regardless of which gateway is
    // currently "active" for new checkouts, so this intentionally always
    // resolves the Razorpay adapter rather than getActivePaymentGateway().
    const gateway = getPaymentGateway('RAZORPAY');
    const rawBody = (req as any).rawBody as Buffer;

    if (!gateway.verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity;
    if (!paymentEntity) return res.status(200).json({ success: true }); // nothing to do

    const payment = await prisma.payment.findUnique({
      where: { gatewayOrderId: paymentEntity.order_id },
      include: { internship: true, user: true, registration: true },
    });
    if (!payment) return res.status(200).json({ success: true }); // unknown order, ignore

    // Idempotency: skip if we've already finalized (or are awaiting
    // approval for) this payment.
    if ((payment.status === 'SUCCESS' || payment.status === 'PENDING_APPROVAL') && eventType === 'payment.captured') {
      return res.status(200).json({ success: true });
    }

    if (eventType === 'payment.captured') {
      if (payment.installmentPlanId) {
        await markInstallmentPendingApproval(payment, paymentEntity.id, 'webhook-verified', paymentEntity.method);
      } else {
        await finalizePaymentSuccess(payment, paymentEntity.id, 'webhook-verified', paymentEntity.method);
      }
    } else if (eventType === 'payment.failed') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureReason: paymentEntity.error_description || 'Payment failed at gateway' },
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ success: false });
  }
}

// GET /api/payments/history
export async function getPaymentHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.id },
      include: { internship: true, receipt: true, refunds: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
}

// GET /api/payments/:id
export async function getPaymentById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { internship: true, receipt: true, refunds: true, user: true },
    });
    if (!payment) throw new AppError('Payment not found', 404);
    const isOwner = payment.userId === req.user!.id;
    const isAdmin = ['SUPER_ADMIN', 'SUB_ADMIN'].includes(req.user!.role);
    if (!isOwner && !isAdmin) throw new AppError('You do not have access to this payment', 403); // IDOR guard
    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
}

// GET /api/payments/receipts/:paymentId/download
export async function downloadReceipt(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.paymentId }, include: { receipt: true } });
    if (!payment || !payment.receipt) throw new AppError('Receipt not found', 404);
    const isOwner = payment.userId === req.user!.id;
    const isAdmin = ['SUPER_ADMIN', 'SUB_ADMIN'].includes(req.user!.role);
    if (!isOwner && !isAdmin) throw new AppError('You do not have access to this receipt', 403);
    res.json({ success: true, data: { fileUrl: payment.receipt.fileUrl, receiptNo: payment.receipt.receiptNo } });
  } catch (err) {
    next(err);
  }
}

// GET /api/payments/verify-receipt/:token — PUBLIC, no auth. Lets anyone
// (e.g. a company checking a student's proof of payment) confirm a receipt
// is genuine without exposing the student's full account details.
export async function verifyReceiptPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { verifyToken: req.params.token },
      include: { payment: { include: { user: true, internship: true } } },
    });
    if (!receipt || receipt.payment.status !== 'SUCCESS') {
      return res.json({ success: true, data: { valid: false } });
    }

    await prisma.receipt.update({ where: { id: receipt.id }, data: { verifiedCount: { increment: 1 } } });

    const maskedEmail = receipt.payment.user.email.replace(/(.{2}).+(@.+)/, '$1***$2');
    res.json({
      success: true,
      data: {
        valid: true,
        receiptNo: receipt.receiptNo,
        studentName: receipt.payment.user.fullName,
        studentEmail: maskedEmail,
        internshipTitle: receipt.payment.internship.title,
        amount: Number(receipt.payment.totalAmount),
        paidAt: receipt.payment.paidAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/:id/refund-request — student-initiated refund request;
// an admin must still approve it (see refund.controller.ts).
export async function requestRefund(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body;
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment || payment.userId !== req.user!.id) throw new AppError('Payment not found', 404);
    if (payment.status !== 'SUCCESS') throw new AppError('Only successful payments can be refunded', 400);

    const existing = await prisma.refund.findFirst({ where: { paymentId: payment.id, status: { in: ['REQUESTED', 'APPROVED'] } } });
    if (existing) throw new AppError('A refund request is already in progress for this payment', 409);

    const { generateRefundNumber } = await import('../utils/helpers');
    const refund = await prisma.refund.create({
      data: {
        refundNo: generateRefundNumber(),
        paymentId: payment.id,
        amount: payment.totalAmount,
        type: 'FULL',
        reason: (reason || 'Requested by student').slice(0, 500),
        status: 'REQUESTED',
        requestedById: req.user!.id,
      },
    });

    res.status(201).json({ success: true, message: 'Refund request submitted for admin review', data: refund });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// INSTALLMENTS
// ---------------------------------------------------------------------------

// GET /api/payments/installments/my — every installment plan belonging to
// the current student, with each installment's payment status, so the
// student portal can show "2 of 3 paid, ₹4,719.61 due on installment 3".
export async function getMyInstallmentPlans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let plans = await prisma.installmentPlan.findMany({
      where: { registration: { userId: req.user!.id } },
      include: {
        registration: { include: { internship: true } },
        payments: { orderBy: { installmentIndex: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Self-heal any plan affected by the old completion-check bug (which
    // could mark a plan COMPLETED after only the first installment was
    // approved) or missing installment rows (created before every
    // installment row was pre-created upfront) — recompute both from the
    // authoritative payment data every time this is loaded, so a plan
    // that's already wrong in the DB gets corrected retroactively, not
    // just prevented going forward.
    const needsRepair = plans.filter((p) => {
      const paidCount = p.payments.filter((pay) => pay.status === 'SUCCESS').length;
      const missingRows = p.payments.length < p.numberOfInstallments;
      const wronglyCompleted = p.status === 'COMPLETED' && paidCount < p.numberOfInstallments;
      const shouldBeCompleted = p.status === 'ACTIVE' && paidCount >= p.numberOfInstallments && !missingRows;
      return missingRows || wronglyCompleted || shouldBeCompleted;
    });

    if (needsRepair.length > 0) {
      await Promise.all(
        needsRepair.map(async (p) => {
          if (p.payments.length < p.numberOfInstallments) {
            await backfillMissingInstallments(p);
          }
          const paidCount = await prisma.payment.count({ where: { installmentPlanId: p.id, status: 'SUCCESS' } });
          const correctStatus = paidCount >= p.numberOfInstallments ? 'COMPLETED' : 'ACTIVE';
          if (p.status !== correctStatus) {
            await prisma.installmentPlan.update({ where: { id: p.id }, data: { status: correctStatus } });
          }
        })
      );
      plans = await prisma.installmentPlan.findMany({
        where: { registration: { userId: req.user!.id } },
        include: {
          registration: { include: { internship: true } },
          payments: { orderBy: { installmentIndex: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json({ success: true, data: plans.map(annotateInstallmentPlan) });
  } catch (err) {
    next(err);
  }
}

// Creates any missing installment Payment rows for a plan (up to
// numberOfInstallments), each due 30 days after the previous one relative
// to today. Safe to call repeatedly — it only ever fills in gaps, never
// touches rows that already exist.
async function backfillMissingInstallments(plan: any) {
  const existingIndexes = new Set(plan.payments.map((p: any) => p.installmentIndex));
  const registration = await prisma.registration.findUnique({ where: { id: plan.registrationId } });
  if (!registration) return;

  const schedule = splitIntoInstallments(
    { baseAmount: Number(plan.totalAmount), discountAmount: 0, taxAmount: 0, totalAmount: Number(plan.totalAmount), isFree: false } as PricingResult,
    plan.numberOfInstallments
  );

  const INSTALLMENT_INTERVAL_DAYS = 30;
  for (const amounts of schedule) {
    if (existingIndexes.has(amounts.index)) continue;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + INSTALLMENT_INTERVAL_DAYS * (amounts.index - 1));
    await prisma.payment.create({
      data: {
        paymentNo: generatePaymentNumber(),
        idempotencyKey: `installment_backfill_${generateSecureToken(12)}`,
        userId: registration.userId,
        internshipId: registration.internshipId,
        registrationId: registration.id,
        installmentPlanId: plan.id,
        installmentIndex: amounts.index,
        baseAmount: amounts.baseAmount,
        discountAmount: amounts.discountAmount,
        taxAmount: amounts.taxAmount,
        totalAmount: amounts.totalAmount,
        status: 'PENDING',
        gateway: 'MANUAL',
        dueDate,
      },
    });
  }
}

// Adds display-only fields on top of the raw plan/payment rows: each
// installment's human status (Paid / Pending Approval / Due / Upcoming /
// Overdue / Failed), plus a plan-level summary (paid amount, remaining
// amount, and which installment is due next) so the frontend never has to
// re-derive this date/amount logic itself.
function annotateInstallmentPlan(plan: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const payments = plan.payments.map((p: any) => {
    let displayStatus: string;
    if (p.status === 'SUCCESS') displayStatus = 'PAID';
    else if (p.status === 'PENDING_APPROVAL') displayStatus = 'PENDING_APPROVAL';
    else if (p.status === 'FAILED') displayStatus = 'FAILED';
    else if (p.dueDate && new Date(p.dueDate) < today) displayStatus = 'OVERDUE';
    else if (p.dueDate && new Date(p.dueDate).getTime() === today.getTime()) displayStatus = 'DUE';
    else displayStatus = 'UPCOMING';
    return { ...p, displayStatus };
  });

  const paidAmount = payments.filter((p: any) => p.status === 'SUCCESS').reduce((sum: number, p: any) => sum + Number(p.totalAmount), 0);
  const remainingAmount = Number(plan.totalAmount) - paidAmount;
  const nextInstallment = payments.find((p: any) => !['SUCCESS', 'PENDING_APPROVAL'].includes(p.status)) || null;
  const pendingApprovalInstallment = payments.find((p: any) => p.status === 'PENDING_APPROVAL') || null;

  return { ...plan, payments, paidAmount, remainingAmount, nextInstallment, pendingApprovalInstallment };
}

// POST /api/payments/installments/:paymentId/pay — (re)starts checkout for
// one specific pending installment (or any other pending payment, such as
// an offline-pending full payment created when the gateway was
// unavailable). Reuses the same order-creation logic as createOrder so the
// frontend can drive it with the exact same Razorpay checkout flow.
export async function payInstallment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.paymentId },
      include: { internship: true },
    });
    if (!payment || payment.userId !== req.user!.id) throw new AppError('Payment not found', 404);
    if (payment.status === 'SUCCESS') throw new AppError('This installment has already been paid', 400);
    if (payment.status === 'PENDING_APPROVAL') throw new AppError('This installment was already submitted and is pending Super Admin approval', 400);
    if (!['PENDING', 'FAILED'].includes(payment.status)) {
      throw new AppError('This payment cannot be retried in its current state', 400);
    }

    const gateway = await getActivePaymentGateway();
    if (!gateway.isAvailable()) {
      throw new AppError(
        'Online payment is still not available right now. Please contact ASK IT Technologies to pay this installment, ' +
          'or ask an administrator to enable an online gateway.',
        503
      );
    }

    const order = await gateway.createOrder({
      amountInPaise: Math.round(Number(payment.totalAmount) * 100),
      currency: 'INR',
      receipt: payment.paymentNo,
      notes: { internshipId: payment.internshipId, userId: payment.userId, paymentNo: payment.paymentNo },
    });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PENDING', gateway: gateway.name as any, gatewayOrderId: order.gatewayOrderId, failureReason: null },
    });

    res.json({ success: true, data: await toOrderResponse(updated) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// MANUAL PAYMENTS (UPI QR / bank transfer)
// ---------------------------------------------------------------------------

// GET /api/payments/manual-accounts — the active UPI/bank accounts a Super
// Admin has configured, safe to show a student. Used by the "Pay via UPI /
// Bank Transfer" screen; createOrder's response already includes this list
// inline for a fresh checkout, but the retry screen in Payment History
// needs to fetch it on its own for an already-pending payment.
export async function getManualAccounts(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await getActiveManualPaymentAccounts() });
  } catch (err) {
    next(err);
  }
}

// PUT /api/payments/:id/switch-to-manual — switches an already-pending
// (online) payment over to the manual/UPI-QR path, e.g. the student started
// an online checkout, closed it, and decided to pay via UPI QR instead.
// Mirrors what createOrder does for a brand-new payment, but for one that
// already exists.
export async function switchToManual(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { registration: true } });
    if (!payment || payment.userId !== req.user!.id) throw new AppError('Payment not found', 404);
    if (payment.status === 'SUCCESS') throw new AppError('This payment has already been paid', 400);

    const regNo = payment.registration?.registrationNo || generateRegistrationNumber();
    let registration = payment.registration;
    if (registration && !registration.registrationNo) {
      registration = await prisma.registration.update({
        where: { id: registration.id },
        data: { status: 'PENDING', registrationNo: regNo, requiresPayment: true },
      });
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PENDING', gateway: 'MANUAL', method: 'OFFLINE', gatewayOrderId: null, failureReason: null },
    });

    res.json({
      success: true,
      message: 'Scan the QR code or use the UPI/bank details below to pay, then submit your reference number so it can be verified.',
      data: {
        isFree: false,
        requiresOfflinePayment: true,
        registrationId: payment.registrationId,
        registrationNo: regNo,
        paymentId: updated.id,
        paymentNo: updated.paymentNo,
        amountDue: Number(updated.totalAmount),
        installmentPlanId: updated.installmentPlanId,
        manualAccounts: await getActiveManualPaymentAccounts(),
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/:id/submit-reference
// Body: { reference, note? }
// A student, after scanning the QR / making a UPI or bank transfer,
// records the UTR/reference number here so an admin can cross-check it
// against their bank statement before marking the payment as received
// (Admin → Payments → Mark Paid). This does NOT mark the payment as paid
// by itself — money only actually moves once an admin confirms it — it
// just closes the loop so the admin isn't hunting through bank statements
// with zero context.
export async function submitPaymentReference(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { reference } = req.body;
    if (!reference || !String(reference).trim()) throw new AppError('A transaction reference (UTR) is required', 400);

    const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { user: true, internship: true } });
    if (!payment || payment.userId !== req.user!.id) throw new AppError('Payment not found', 404);
    if (payment.status === 'SUCCESS') throw new AppError('This payment has already been verified as paid', 400);
    if (payment.status === 'PENDING_APPROVAL') throw new AppError('This payment has already been submitted and is awaiting approval', 400);
    if (payment.status !== 'PENDING') throw new AppError('This payment cannot be updated in its current state', 400);

    const installmentLabel = payment.installmentIndex ? ` (Installment ${payment.installmentIndex})` : '';

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        studentReference: String(reference).trim().slice(0, 100),
        status: 'PENDING_APPROVAL',
        method: payment.method || 'UPI',
      },
    });

    await notifyUser({
      userId: payment.userId,
      type: 'PAYMENT',
      title: 'Payment Submitted — Pending Approval',
      message: `Your reference "${updated.studentReference}" for ₹${payment.totalAmount}${installmentLabel} ("${payment.internship.title}") was submitted and is pending Super Admin approval.`,
      link: '/payment-history',
    });

    // Let admins with payment management access know a reference came in,
    // so approving isn't a blind guess of which pending row to check.
    await notifyAdmins({
      type: 'PAYMENT',
      title: 'Payment Reference Submitted',
      message: `${payment.user.fullName} submitted reference "${updated.studentReference}" for ${payment.paymentNo}${installmentLabel} (₹${payment.totalAmount}, "${payment.internship.title}"). Review and approve from Admin → Payments.`,
      link: '/admin/payments',
    });

    res.json({ success: true, message: 'Thanks! Your payment reference was submitted and is pending approval by the Super Admin.', data: { paymentId: updated.id, studentReference: updated.studentReference, status: updated.status } });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// SUPER ADMIN APPROVAL — the trust boundary for every installment/manual
// payment: nothing counts as "Paid", credits the plan's paid total, issues
// a receipt, or (for a first installment) enrolls the student until a
// Super Admin/Admin explicitly approves it here.
// ---------------------------------------------------------------------------

// POST /api/admin/payments/:id/approve
export async function approvePendingPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { internship: { include: { trainer: { include: { user: true } } } }, user: true, registration: true },
    });
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.status === 'SUCCESS') throw new AppError('This payment has already been approved', 400);
    if (payment.status !== 'PENDING_APPROVAL') throw new AppError('Only payments pending approval can be approved', 400);

    const gatewayPaymentId = payment.gatewayPaymentId || `OFFLINE-${payment.paymentNo}`;
    const gatewaySignature = payment.gatewaySignature || 'admin-approved';

    const result = await finalizePaymentSuccess(payment, gatewayPaymentId, gatewaySignature, payment.method || undefined, req.user!.id);

    await logActivity({
      actorId: req.user!.id,
      action: 'PAYMENT_APPROVED',
      description: `Approved payment ${payment.paymentNo} (₹${payment.totalAmount}) for ${payment.user.fullName} ("${payment.internship.title}")`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Payment approved and marked as paid.', data: result });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/payments/:id/reject
// Body: { reason }
export async function rejectPendingPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body;
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { user: true, internship: true } });
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.status === 'SUCCESS') throw new AppError('A payment that has already been approved cannot be rejected — issue a refund instead', 400);
    if (payment.status !== 'PENDING_APPROVAL') throw new AppError('Only payments pending approval can be rejected', 400);

    const cleanReason = (reason || 'Payment could not be verified').toString().slice(0, 500);
    const installmentLabel = payment.installmentIndex ? ` (Installment ${payment.installmentIndex})` : '';

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        rejectionReason: cleanReason,
        failureReason: cleanReason,
        approvedById: req.user!.id,
        approvedAt: new Date(),
      },
    });

    await notifyUser({
      userId: payment.userId,
      type: 'PAYMENT',
      title: 'Payment Rejected',
      message: `Your payment of ₹${payment.totalAmount}${installmentLabel} for "${payment.internship.title}" was rejected: ${cleanReason}. Please retry payment or contact ASK IT Technologies.`,
      link: '/payment-history',
    });

    await logActivity({
      actorId: req.user!.id,
      action: 'PAYMENT_REJECTED',
      description: `Rejected payment ${payment.paymentNo} (₹${payment.totalAmount}) for ${payment.user.fullName}: ${cleanReason}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Payment rejected. The student has been notified and can retry.', data: updated });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/payments/:id/due-date
// Body: { dueDate: "2026-09-20" }
// Lets a Super Admin/Admin set or move an installment's due date instead
// of relying only on the automatic 30-day stagger — e.g. to line it up
// with a batch's actual schedule, or give a specific student more time.
// Re-arms the reminder sweep for the new date by clearing
// lastReminderSentAt, so a changed date isn't silently skipped until the
// old date's reminder window would have passed.
export async function updateInstallmentDueDate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { dueDate } = req.body;
    if (!dueDate || isNaN(new Date(dueDate).getTime())) throw new AppError('A valid due date is required', 400);

    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) throw new AppError('Payment not found', 404);
    if (!payment.installmentPlanId) throw new AppError('Only installment payments have a due date', 400);
    if (payment.status === 'SUCCESS') throw new AppError('This installment is already paid', 400);

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { dueDate: new Date(dueDate), lastReminderSentAt: null },
    });

    await logActivity({
      actorId: req.user!.id,
      action: 'INSTALLMENT_DUE_DATE_UPDATED',
      description: `Set due date for installment ${payment.installmentIndex} of ${payment.paymentNo} to ${new Date(dueDate).toLocaleDateString('en-IN')}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Due date updated', data: updated });
  } catch (err) {
    next(err);
  }
}