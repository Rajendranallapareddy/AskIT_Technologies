import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { paginate, buildMeta } from '../utils/helpers';
import { logActivity } from '../services/audit.service';
import { getReceiptSignedUrl, } from '../services/receipt.service';

// GET /api/admin/payments — search + filter + paginate
export async function listPayments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { skip, take } = paginate(page, limit);
    const { search, status, method, gateway, internshipId, from, to, userId, installmentsOnly } = req.query as Record<string, string>;

    const where: any = {};
    if (status) where.status = status;
    if (method) where.method = method;
    if (gateway) where.gateway = gateway;
    if (internshipId) where.internshipId = internshipId;
    if (userId) where.userId = userId;
    if (installmentsOnly === 'true') where.installmentPlanId = { not: null };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { paymentNo: { contains: search, mode: 'insensitive' } },
        { gatewayPaymentId: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { user: true, internship: true, receipt: true, refunds: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({ success: true, data: payments, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/payments/student/:userId — a single student's complete
// payment picture: every payment they've ever made (across every
// internship), grouped by installment plan where applicable, plus their
// recent payment-related notifications (submitted/approved/rejected/
// reminders) — everything a Super Admin needs to review one student
// without hunting through the flat payments table.
export async function getStudentPaymentHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;

    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, mobileNumber: true, profilePicture: true, createdAt: true },
    });
    if (!student) throw new AppError('Student not found', 404);

    const [payments, plans, notifications, registrations] = await Promise.all([
      prisma.payment.findMany({
        where: { userId },
        include: { internship: true, receipt: true, refunds: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.installmentPlan.findMany({
        where: { registration: { userId } },
        include: { registration: { include: { internship: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: { userId, type: 'PAYMENT' },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      prisma.registration.findMany({
        where: { userId },
        include: { internship: true },
        orderBy: { appliedAt: 'desc' },
      }),
    ]);

    const totalPaid = payments.filter((p) => p.status === 'SUCCESS').reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const totalDue = payments.filter((p) => ['PENDING', 'FAILED', 'PENDING_APPROVAL'].includes(p.status)).reduce((sum, p) => sum + Number(p.totalAmount), 0);

    res.json({
      success: true,
      data: {
        student,
        summary: { totalPaid, totalDue, paymentCount: payments.length, registrationCount: registrations.length },
        payments,
        plans,
        registrations,
        notifications,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/payments/:id
export async function getPaymentDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { user: true, internship: true, receipt: true, refunds: true, coupon: true, registration: true },
    });
    if (!payment) throw new AppError('Payment not found', 404);
    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/payments/export?format=csv|excel
export async function exportPayments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, from, to, format = 'csv' } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { user: true, internship: true },
      orderBy: { createdAt: 'desc' },
      take: 5000, // safety cap
    });

    await logActivity({ actorId: req.user!.id, action: 'PAYMENTS_EXPORT', description: `Exported ${payments.length} payments as ${format}`, ipAddress: req.ip });

    const rows = payments.map((p) => ({
      PaymentNo: p.paymentNo,
      Student: p.user.fullName,
      Email: p.user.email,
      Internship: p.internship.title,
      BaseAmount: Number(p.baseAmount),
      Discount: Number(p.discountAmount),
      Tax: Number(p.taxAmount),
      Total: Number(p.totalAmount),
      Status: p.status,
      Method: p.method || '',
      GatewayPaymentId: p.gatewayPaymentId || '',
      PaidAt: p.paidAt ? p.paidAt.toISOString() : '',
      CreatedAt: p.createdAt.toISOString(),
    }));

    if (format === 'excel') {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Payments');
      if (rows.length) {
        sheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: 20 }));
        sheet.addRows(rows);
        sheet.getRow(1).font = { bold: true };
      }
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="payments-export.xlsx"');
      await workbook.xlsx.write(res);
      return res.end();
    }

    // Default: CSV
    const header = rows.length ? Object.keys(rows[0]).join(',') : 'No data';
    const csvBody = rows
      .map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const csv = [header, csvBody].filter(Boolean).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payments-export.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/payments/analytics
export async function paymentAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [totalRevenueAgg, successCount, failedCount, refundedCount, pendingCount, pendingApprovalCount] = await Promise.all([
      prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { totalAmount: true } }),
      prisma.payment.count({ where: { status: 'SUCCESS' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.payment.count({ where: { status: { in: ['REFUNDED', 'PARTIALLY_REFUNDED'] } } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'PENDING_APPROVAL' } }),
    ]);

    // Revenue by internship (course-wise revenue)
    const byInternship = await prisma.payment.groupBy({
      by: ['internshipId'],
      where: { status: 'SUCCESS' },
      _sum: { totalAmount: true },
      _count: { _all: true },
    });
    const internships = await prisma.internship.findMany({
      where: { id: { in: byInternship.map((b) => b.internshipId) } },
      select: { id: true, title: true },
    });
    const courseWiseRevenue = byInternship.map((b) => ({
      internshipId: b.internshipId,
      title: internships.find((i) => i.id === b.internshipId)?.title || 'Unknown',
      revenue: Number(b._sum.totalAmount || 0),
      transactions: b._count._all,
    }));

    // Monthly revenue for the last 12 months (computed in JS to stay
    // portable across Postgres versions without raw SQL date_trunc quirks).
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    const recentPayments = await prisma.payment.findMany({
      where: { status: 'SUCCESS', paidAt: { gte: twelveMonthsAgo } },
      select: { paidAt: true, totalAmount: true },
    });
    const monthlyMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(twelveMonthsAgo);
      d.setMonth(d.getMonth() + i);
      monthlyMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0);
    }
    for (const p of recentPayments) {
      if (!p.paidAt) continue;
      const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(p.totalAmount));
    }
    const monthlyRevenue = Array.from(monthlyMap.entries()).map(([month, revenue]) => ({ month, revenue }));

    res.json({
      success: true,
      data: {
        totalRevenue: Number(totalRevenueAgg._sum.totalAmount || 0),
        successCount,
        failedCount,
        refundedCount,
        pendingCount,
        pendingApprovalCount,
        courseWiseRevenue,
        monthlyRevenue,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/payments/offline — record + immediately approve an offline
// payment (cash / direct bank transfer) collected outside the gateway.
//
// Body: { userId, internshipId, amount, method, notes } to record a brand
// new payment, OR { paymentId, method, notes } to settle an EXISTING
// pending payment — most commonly an installment, or a registration that
// was confirmed with "pay later" while online payment was unavailable. When
// paymentId is given, userId/internshipId/amount are all read from that
// payment record instead of the request body, so the collected amount can
// never drift from what was actually due.
export async function recordOfflinePayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { paymentId, method, notes } = req.body;
    let { userId, internshipId, amount } = req.body;

    const { generatePaymentNumber, generateReceiptNumber, generateRegistrationNumber } = await import('../utils/helpers');
    const { generateSecureToken } = await import('../utils/crypto');
    const { generateReceiptPdf } = await import('../services/receipt.service');

    let existingPending: any = null;
    if (paymentId) {
      existingPending = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (!existingPending) throw new AppError('Payment not found', 404);
      if (existingPending.status === 'SUCCESS') throw new AppError('This payment has already been settled', 400);
      userId = existingPending.userId;
      internshipId = existingPending.internshipId;
      amount = Number(existingPending.totalAmount);
    }

    if (!userId || !internshipId || !amount) throw new AppError('userId, internshipId, and amount are required', 400);

    const [user, internship] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.internship.findUnique({ where: { id: internshipId } }),
    ]);
    if (!user || !internship) throw new AppError('User or internship not found', 404);

    let registration = existingPending?.registrationId
      ? await prisma.registration.findUnique({ where: { id: existingPending.registrationId } })
      : await prisma.registration.findUnique({ where: { userId_internshipId: { userId, internshipId } } });
    const regNo = registration?.registrationNo || generateRegistrationNumber();
    registration = registration
      ? await prisma.registration.update({ where: { id: registration.id }, data: { status: registration.status === 'AWAITING_PAYMENT' ? 'PENDING' : registration.status, registrationNo: regNo, requiresPayment: true } })
      : await prisma.registration.create({ data: { userId, internshipId, status: 'PENDING', registrationNo: regNo, requiresPayment: true } });

    // Settle the existing pending payment (installment or offline-pending
    // full payment) instead of creating a duplicate one.
    const payment = existingPending
      ? await prisma.payment.update({
          where: { id: existingPending.id },
          data: {
            status: 'SUCCESS',
            gateway: 'MANUAL',
            method: (method as any) || 'OFFLINE',
            paidAt: new Date(),
            gatewayPaymentId: existingPending.gatewayPaymentId || `OFFLINE-${existingPending.paymentNo}`,
            failureReason: notes || existingPending.failureReason || undefined,
            approvedById: req.user!.id,
            approvedAt: new Date(),
            rejectionReason: null,
          },
        })
      : await prisma.payment.create({
          data: {
            paymentNo: generatePaymentNumber(),
            idempotencyKey: `offline_${generateSecureToken(12)}`,
            userId,
            internshipId,
            registrationId: registration.id,
            baseAmount: amount,
            totalAmount: amount,
            status: 'SUCCESS',
            gateway: 'MANUAL',
            method: (method as any) || 'OFFLINE',
            paidAt: new Date(),
            failureReason: notes || undefined,
          },
        });

    // If this settled the last unpaid installment in a plan, mark it done.
    if (payment.installmentPlanId) {
      const remaining = await prisma.payment.count({ where: { installmentPlanId: payment.installmentPlanId, status: { not: 'SUCCESS' } } });
      if (remaining === 0) await prisma.installmentPlan.update({ where: { id: payment.installmentPlanId }, data: { status: 'COMPLETED' } });
    }

    const installmentLabel = payment.installmentIndex ? ` (Installment ${payment.installmentIndex})` : '';
    const receiptNo = generateReceiptNumber();
    const verifyToken = generateSecureToken();
    const fileUrl = await generateReceiptPdf({
      receiptNo,
      verifyToken,
      studentName: user.fullName,
      studentEmail: user.email,
      internshipTitle: internship.title + installmentLabel,
      baseAmount: Number(payment.baseAmount),
      discountAmount: Number(payment.discountAmount),
      taxAmount: Number(payment.taxAmount),
      totalAmount: Number(payment.totalAmount),
      gstPercentage: 0,
      method: method || 'Offline',
      gatewayPaymentId: payment.gatewayPaymentId || `OFFLINE-${payment.paymentNo}`,
      paidAt: new Date(),
    });
    await prisma.receipt.upsert({
      where: { paymentId: payment.id },
      update: { receiptNo, verifyToken, fileUrl },
      create: { receiptNo, paymentId: payment.id, verifyToken, fileUrl },
    });

    // Deliver the receipt immediately, same as the online-payment path —
    // this used to only happen when an admin separately clicked "Resend
    // Receipt", which is why offline payments looked like they never sent one.
    let emailSent = false;
    let whatsappSent = false;
    try {
      const { sendMail } = await import('../services/email.service');
      const { sendWhatsApp, receiptWhatsAppMessage } = await import('../services/whatsapp.service');
      const fullDownloadUrl = await getReceiptSignedUrl(fileUrl);

      emailSent = await sendMail({
        to: user.email,
        subject: `Payment Receipt — ${receiptNo} | AskIT Technologies`,
        html: `
          <!DOCTYPE html>
          <html>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f1f5f9;padding:30px 15px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:#ffffff;border-radius:12px;overflow:hidden;">
                      <tr>
                        <td style="background:#0b2868;padding:25px 30px;">
                          <div style="color:#ffffff;font-size:24px;font-weight:700;">
                            AskIT <span style="color:#f97316;">Technologies</span>
                          </div>
                          <div style="margin-top:7px;color:#cbd5e1;font-size:10px;">
                            LEARN TODAY | GROW TOMORROW | SUCCEED ALWAYS
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:32px 30px;">
                          <h2 style="margin:0 0 20px;color:#0b2868;font-size:22px;">Payment Successful</h2>
                          <p style="font-size:14px;line-height:1.7;">
                            Hi <strong>${user.fullName}</strong>,
                          </p>
                          <p style="font-size:14px;line-height:1.7;color:#475569;">
                            Your payment for <strong>${internship.title}</strong> has been recorded successfully.
                          </p>

                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:22px 0;">
                            <tr>
                              <td style="padding:14px 16px;color:#64748b;border-bottom:1px solid #e2e8f0;">Receipt Number</td>
                              <td align="right" style="padding:14px 16px;font-weight:700;color:#0b2868;border-bottom:1px solid #e2e8f0;">${receiptNo}</td>
                            </tr>
                            <tr>
                              <td style="padding:14px 16px;color:#64748b;border-bottom:1px solid #e2e8f0;">Program</td>
                              <td align="right" style="padding:14px 16px;font-weight:600;border-bottom:1px solid #e2e8f0;">${internship.title}${installmentLabel}</td>
                            </tr>
                            <tr>
                              <td style="padding:14px 16px;color:#64748b;">Amount Paid</td>
                              <td align="right" style="padding:14px 16px;font-size:18px;font-weight:700;color:#15803d;">
                                ₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </table>

                          <div style="text-align:center;margin:28px 0;">
                            <a href="${fullDownloadUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:13px 25px;border-radius:8px;font-weight:700;">
                              Download Receipt
                            </a>
                          </div>

                          <p style="font-size:12px;color:#64748b;line-height:1.6;">
                            This secure download link is temporary. If it expires, sign in to your AskIT Technologies account and download the receipt again from Payment History.
                          </p>

                          <p style="margin-top:25px;">
                            Regards,<br/>
                            <strong style="color:#0b2868;">AskIT Technologies</strong>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      });
      if (user.mobileNumber) {
        whatsappSent = await sendWhatsApp({
          to: user.mobileNumber,
          body: receiptWhatsAppMessage({
            studentName: user.fullName,
            internshipTitle: internship.title,
            amount: Number(amount),
            receiptNo,
            downloadUrl: fullDownloadUrl,
          }),
        });
      }
    } catch (deliveryErr) {
      console.error('Receipt delivery (email/WhatsApp) failed:', deliveryErr);
    }

    await logActivity({
      actorId: req.user!.id,
      action: 'OFFLINE_PAYMENT_RECORDED',
      description: `Recorded offline payment of ₹${amount} for ${user.fullName} ("${internship.title}")`,
      ipAddress: req.ip,
    });

    const deliveryNote = emailSent
      ? whatsappSent ? ' Receipt emailed and sent via WhatsApp.' : ' Receipt emailed (WhatsApp not configured).'
      : ' Note: email/WhatsApp are not configured on this server, so the receipt was only saved, not sent — see backend/.env.';

    res.status(201).json({
      success: true,
      message: `Offline payment recorded and registration confirmed.${deliveryNote}`,
      data: payment,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/payments/:id/resend-receipt
export async function resendReceipt(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const payment =
      await prisma.payment.findUnique({
        where: {
          id: req.params.id,
        },

        include: {
          user: true,
          internship: true,
          receipt: true,
        },
      });

    if (
      !payment ||
      !payment.receipt
    ) {
      throw new AppError(
        'Receipt not found',
        404
      );
    }

    if (
      payment.status !==
      'SUCCESS'
    ) {
      throw new AppError(
        'Receipt is only available for successful payments',
        400
      );
    }

    const receiptFileUrl =
      payment.receipt.fileUrl;

    if (!receiptFileUrl) {
      throw new AppError(
        'Receipt file is not available',
        404
      );
    }

    const downloadUrl =
      await getReceiptSignedUrl(
        receiptFileUrl
      );

    const {
      sendMail,
    } = await import(
      '../services/email.service'
    );

    const sent =
      await sendMail({
        to:
          payment.user.email,

        subject:
          `Your ASK IT Receipt ${payment.receipt.receiptNo}`,

        html: `
          <div style="
            font-family:Arial,Helvetica,sans-serif;
            max-width:640px;
            margin:0 auto;
            color:#1f2937;
          ">

            <div style="
              background:#0b2868;
              padding:22px 28px;
              border-radius:12px 12px 0 0;
              color:white;
            ">
              <div style="
                font-size:22px;
                font-weight:700;
              ">
                AskIT Technologies
              </div>

              <div style="
                color:#cbd5e1;
                font-size:11px;
                margin-top:5px;
              ">
                LEARN TODAY | GROW TOMORROW | SUCCEED ALWAYS
              </div>
            </div>

            <div style="
              padding:28px;
              border:1px solid #e2e8f0;
              border-top:none;
              border-radius:0 0 12px 12px;
            ">

              <h2 style="
                color:#0b2868;
                margin-top:0;
              ">
                Payment Receipt
              </h2>

              <p>
                Hi
                <strong>
                  ${payment.user.fullName}
                </strong>,
              </p>

              <p>
                Your AskIT Technologies payment receipt is ready.
              </p>

              <p>
                <strong>
                  Receipt No:
                </strong>
                ${payment.receipt.receiptNo}
              </p>

              <p>
                <strong>
                  Program:
                </strong>
                ${payment.internship.title}
              </p>

              <div style="
                text-align:center;
                margin:28px 0;
              ">
                <a
                  href="${downloadUrl}"
                  target="_blank"
                  style="
                    display:inline-block;
                    background:#f97316;
                    color:#ffffff;
                    padding:13px 25px;
                    text-decoration:none;
                    border-radius:8px;
                    font-weight:700;
                  "
                >
                  Download Receipt
                </a>
              </div>

              <p style="
                color:#64748b;
                font-size:12px;
              ">
                This secure link is temporary.
                If it expires, login to your account and
                download the receipt from Payment History.
              </p>

              <p style="
                margin-top:25px;
              ">
                Regards,
                <br/>
                <strong style="color:#0b2868;">
                  AskIT Technologies
                </strong>
              </p>

            </div>
          </div>
        `,
      });

    if (!sent) {
      throw new AppError(
        'Unable to send receipt email',
        503
      );
    }

    await prisma.receipt.update({
      where: {
        id:
          payment.receipt.id,
      },

      data: {
        emailedAt:
          new Date(),
      },
    });

    return res.json({
      success: true,

      message:
        `Receipt sent successfully to ${payment.user.email}`,
    });
  } catch (err) {
    next(err);
  }
}
