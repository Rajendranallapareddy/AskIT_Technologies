import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { generateRefundNumber, paginate, buildMeta } from '../utils/helpers';
import { getPaymentGateway } from '../services/paymentGateway';
import { logActivity } from '../services/audit.service';

// GET /api/admin/refunds
export async function listRefunds(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { skip, take } = paginate(page, limit);
    const { status } = req.query as Record<string, string>;

    const where: any = {};
    if (status) where.status = status;

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: { payment: { include: { user: true, internship: true } }, decidedBy: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.refund.count({ where }),
    ]);

    res.json({ success: true, data: refunds, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/refunds — admin-initiated refund (full or partial)
export async function createRefund(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { paymentId, amount, type, reason } = req.body;
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.status !== 'SUCCESS' && payment.status !== 'PARTIALLY_REFUNDED') {
      throw new AppError('Only successful payments can be refunded', 400);
    }

    const alreadyRefunded = await prisma.refund.aggregate({
      where: { paymentId, status: 'PROCESSED' },
      _sum: { amount: true },
    });
    const refundedSoFar = Number(alreadyRefunded._sum.amount || 0);
    const requestedAmount = type === 'FULL' ? Number(payment.totalAmount) - refundedSoFar : Number(amount);

    if (requestedAmount <= 0 || requestedAmount > Number(payment.totalAmount) - refundedSoFar) {
      throw new AppError('Invalid refund amount', 400);
    }

    const refund = await prisma.refund.create({
      data: {
        refundNo: generateRefundNumber(),
        paymentId,
        amount: requestedAmount,
        type: type || 'FULL',
        reason: (reason || 'Admin-initiated refund').slice(0, 500),
        status: 'REQUESTED',
        requestedById: req.user!.id,
      },
    });

    res.status(201).json({ success: true, message: 'Refund request created', data: refund });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/refunds/:id/approve — approves AND processes the refund at the gateway
export async function approveRefund(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const refund = await prisma.refund.findUnique({ where: { id: req.params.id }, include: { payment: { include: { user: true, internship: true } } } });
    if (!refund) throw new AppError('Refund not found', 404);
    if (refund.status !== 'REQUESTED') throw new AppError('Only pending refund requests can be approved', 400);

    const gateway = getPaymentGateway(refund.payment.gateway);
    let gatewayRefundId = `manual_${refund.refundNo}`;

    if (refund.payment.gateway !== 'MANUAL' && refund.payment.gatewayPaymentId) {
      const result = await gateway.initiateRefund({
        gatewayPaymentId: refund.payment.gatewayPaymentId,
        amountInPaise: Math.round(Number(refund.amount) * 100),
        notes: { refundNo: refund.refundNo, reason: refund.reason },
      });
      gatewayRefundId = result.gatewayRefundId;
    }

    const isFullRefund = refund.type === 'FULL' || Number(refund.amount) >= Number(refund.payment.totalAmount);

    // payment.registrationId is nullable (e.g. offline payments recorded
    // before a registration existed, or historical data) — forcing it with
    // `!` and always including a registration.update crashed the whole
    // transaction (and, with it, the refund + payment updates that should
    // have gone through regardless) whenever it was actually null. Only
    // include that statement when there's a real registration to update,
    // and only flip it to REFUNDED on a full refund — a partial refund
    // shouldn't kick the student out of an otherwise-active registration.
    const ops: any[] = [
      prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'PROCESSED', decidedById: req.user!.id, decidedAt: new Date(), gatewayRefundId },
      }),
      prisma.payment.update({
        where: { id: refund.paymentId },
        data: { status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
      }),
    ];
    if (refund.payment.registrationId && isFullRefund) {
      ops.push(
        prisma.registration.update({
          where: { id: refund.payment.registrationId },
          data: { status: 'REFUNDED' },
        })
      );
    }
    ops.push(
      prisma.notification.create({
        data: {
          userId: refund.payment.userId,
          type: 'SYSTEM',
          title: 'Refund Processed',
          message: `Your refund of ₹${refund.amount} for "${refund.payment.internship.title}" has been processed.`,
        },
      })
    );

    const [updatedRefund] = await prisma.$transaction(ops);

    await logActivity({
      actorId: req.user!.id,
      action: 'REFUND_APPROVED',
      description: `Approved & processed refund ${refund.refundNo} (₹${refund.amount}) for ${refund.payment.user.fullName}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Refund approved and processed', data: updatedRefund });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/refunds/:id/reject
export async function rejectRefund(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body;
    const refund = await prisma.refund.findUnique({ where: { id: req.params.id }, include: { payment: true } });
    if (!refund) throw new AppError('Refund not found', 404);
    if (refund.status !== 'REQUESTED') throw new AppError('Only pending refund requests can be rejected', 400);

    const updated = await prisma.refund.update({
      where: { id: refund.id },
      data: { status: 'REJECTED', decidedById: req.user!.id, decidedAt: new Date(), reason: reason || refund.reason },
    });

    await prisma.notification.create({
      data: {
        userId: refund.payment.userId,
        type: 'SYSTEM',
        title: 'Refund Request Declined',
        message: `Your refund request for payment ${refund.payment.paymentNo} was declined.${reason ? ` Reason: ${reason}` : ''}`,
      },
    });

    await logActivity({ actorId: req.user!.id, action: 'REFUND_REJECTED', description: `Rejected refund ${refund.refundNo}`, ipAddress: req.ip });

    res.json({ success: true, message: 'Refund request rejected', data: updated });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/refunds — student's own refund history
export async function getMyRefunds(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const refunds = await prisma.refund.findMany({
      where: { payment: { userId: req.user!.id } },
      include: { payment: { include: { internship: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: refunds });
  } catch (err) {
    next(err);
  }
}
