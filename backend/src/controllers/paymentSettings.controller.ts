import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { getPaymentSettings } from '../services/pricing.service';
import { logActivity } from '../services/audit.service';

// ---------------------------------------------------------------------------
// PAYMENT SETTINGS (singleton row) — GST, active gateway, allowed methods
// ---------------------------------------------------------------------------

// GET /api/admin/payment-settings
export async function getSettings(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const settings = await getPaymentSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/payment-settings
export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { gstPercentage, currency, activeGateway, allowedMethods, autoApproveOnPay } = req.body;
    const data: any = {};
    if (gstPercentage !== undefined) data.gstPercentage = gstPercentage;
    if (currency !== undefined) data.currency = currency;
    if (activeGateway !== undefined) data.activeGateway = activeGateway;
    if (allowedMethods !== undefined) data.allowedMethods = allowedMethods;
    if (autoApproveOnPay !== undefined) data.autoApproveOnPay = autoApproveOnPay;

    const settings = await prisma.paymentSettings.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });

    await logActivity({ actorId: req.user!.id, action: 'PAYMENT_SETTINGS_UPDATE', description: 'Updated payment settings', newValue: settings, ipAddress: req.ip });

    res.json({ success: true, message: 'Payment settings updated', data: settings });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// COURSE / INTERNSHIP FEE MANAGEMENT
// ---------------------------------------------------------------------------

// PUT /api/admin/internships/:id/pricing
export async function updateInternshipPricing(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { fee, earlyBirdFee, earlyBirdDeadline, gstPercentage } = req.body;
    const data: any = {};
    if (fee !== undefined) data.fee = fee;
    if (earlyBirdFee !== undefined) data.earlyBirdFee = earlyBirdFee || null;
    if (earlyBirdDeadline !== undefined) data.earlyBirdDeadline = earlyBirdDeadline ? new Date(earlyBirdDeadline) : null;
    if (gstPercentage !== undefined) data.gstPercentage = gstPercentage;

    const internship = await prisma.internship.update({ where: { id: req.params.id }, data });

    await logActivity({ actorId: req.user!.id, action: 'INTERNSHIP_PRICING_UPDATE', description: `Updated pricing for "${internship.title}"`, newValue: data, ipAddress: req.ip });

    res.json({ success: true, message: 'Pricing updated', data: internship });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// COUPONS
// ---------------------------------------------------------------------------

// GET /api/admin/coupons
export async function listCoupons(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: coupons });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/coupons
export async function createCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      code, description, discountType, discountValue, maxDiscountAmount, minOrderAmount,
      usageLimit, validFrom, validUntil, applicableInternshipIds,
    } = req.body;

    if (!code || discountValue === undefined) throw new AppError('code and discountValue are required', 400);

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        description,
        discountType: discountType || 'PERCENTAGE',
        discountValue,
        maxDiscountAmount: maxDiscountAmount || undefined,
        minOrderAmount: minOrderAmount || undefined,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        applicableInternshipIds: applicableInternshipIds || [],
      },
    });

    await logActivity({ actorId: req.user!.id, action: 'COUPON_CREATE', description: `Created coupon ${coupon.code}`, ipAddress: req.ip });

    res.status(201).json({ success: true, message: 'Coupon created', data: coupon });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/coupons/:id
export async function updateCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const allowed = ['description', 'discountType', 'discountValue', 'maxDiscountAmount', 'minOrderAmount', 'usageLimit', 'isActive', 'applicableInternshipIds'];
    const data: any = {};
    for (const key of allowed) if (req.body[key] !== undefined) data[key] = req.body[key];
    if (req.body.validFrom !== undefined) data.validFrom = req.body.validFrom ? new Date(req.body.validFrom) : null;
    if (req.body.validUntil !== undefined) data.validUntil = req.body.validUntil ? new Date(req.body.validUntil) : null;

    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data });
    res.json({ success: true, message: 'Coupon updated', data: coupon });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/coupons/:id
export async function deleteCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    next(err);
  }
}

// POST /api/public/coupons/validate — lets the checkout UI preview a
// discount before creating a payment order (still re-validated server-side
// again inside calculateInternshipPrice when the order is actually created).
export async function validateCouponPublic(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { internshipId, couponCode } = req.body;
    const { calculateInternshipPrice } = await import('../services/pricing.service');
    const pricing = await calculateInternshipPrice(internshipId, couponCode);
    res.json({ success: true, data: pricing });
  } catch (err) {
    next(err);
  }
}
