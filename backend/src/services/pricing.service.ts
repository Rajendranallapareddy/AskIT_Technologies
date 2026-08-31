import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { computePaymentAmounts } from '../utils/helpers';

export interface PricingResult {
  baseAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  couponId: string | null;
  isFree: boolean;
  gstPercentage: number;
  originalFee: number; // the internship's normal (non-early-bird) fee, for showing "was ₹X"
  isEarlyBird: boolean;
}

// Computes the amount payable for an internship entirely from data already
// in the database — course fee, early-bird window, GST, and (optionally) a
// coupon. The client can request a coupon code, but it can never dictate an
// amount; every number here is recalculated server-side right before the
// payment order is created, which is what prevents price tampering.
export async function calculateInternshipPrice(internshipId: string, couponCode?: string): Promise<PricingResult> {
  const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
  if (!internship) throw new AppError('Internship not found', 404);

  const settings = await getPaymentSettings();

  const originalFee = Number(internship.fee || 0);
  let baseAmount = originalFee;
  const isEarlyBird = !!(
    internship.earlyBirdFee &&
    internship.earlyBirdDeadline &&
    new Date() <= new Date(internship.earlyBirdDeadline)
  );
  if (isEarlyBird) {
    baseAmount = Number(internship.earlyBirdFee);
  }

  const gstPercentage = Number(internship.gstPercentage || settings.gstPercentage || 0);

  if (baseAmount <= 0) {
    return {
      baseAmount: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0, couponId: null, isFree: true,
      gstPercentage, originalFee, isEarlyBird,
    };
  }

  let discountAmount = 0;
  let couponId: string | null = null;

  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
    if (!coupon || !coupon.isActive) throw new AppError('Invalid or expired coupon code', 400);
    if (coupon.validFrom && new Date() < new Date(coupon.validFrom)) throw new AppError('This coupon is not active yet', 400);
    if (coupon.validUntil && new Date() > new Date(coupon.validUntil)) throw new AppError('This coupon has expired', 400);
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new AppError('This coupon has reached its usage limit', 400);
    if (coupon.minOrderAmount && baseAmount < Number(coupon.minOrderAmount)) {
      throw new AppError(`This coupon requires a minimum order of ₹${coupon.minOrderAmount}`, 400);
    }
    if (coupon.applicableInternshipIds.length > 0 && !coupon.applicableInternshipIds.includes(internshipId)) {
      throw new AppError('This coupon is not valid for this internship', 400);
    }

    discountAmount =
      coupon.discountType === 'PERCENTAGE' ? (baseAmount * Number(coupon.discountValue)) / 100 : Number(coupon.discountValue);
    if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
    discountAmount = Math.min(discountAmount, baseAmount);
    couponId = coupon.id;
  }

  const amounts = computePaymentAmounts(baseAmount, gstPercentage, discountAmount);

  return { ...amounts, couponId, isFree: amounts.totalAmount <= 0, gstPercentage, originalFee, isEarlyBird };
}

// PaymentSettings is a singleton row — fetch-or-create keeps callers simple.
export async function getPaymentSettings() {
  const existing = await prisma.paymentSettings.findUnique({ where: { id: 'singleton' } });
  if (existing) return existing;
  return prisma.paymentSettings.create({ data: { id: 'singleton' } });
}

export interface InstallmentSplit {
  index: number; // 1-based
  baseAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

// Splits a priced total into N roughly-equal installments. Rounding
// remainders (paise) are dumped into the LAST installment so the sum of all
// installments always exactly equals the original total — never a rupee
// more, never a rupee less.
export function splitIntoInstallments(pricing: PricingResult, numberOfInstallments: number): InstallmentSplit[] {
  const n = Math.max(1, Math.min(6, Math.floor(numberOfInstallments)));
  const round2 = (v: number) => Math.round(v * 100) / 100;

  const perBase = round2(pricing.baseAmount / n);
  const perDiscount = round2(pricing.discountAmount / n);
  const perTax = round2(pricing.taxAmount / n);
  const perTotal = round2(pricing.totalAmount / n);

  const splits: InstallmentSplit[] = [];
  for (let i = 1; i <= n; i++) {
    splits.push({ index: i, baseAmount: perBase, discountAmount: perDiscount, taxAmount: perTax, totalAmount: perTotal });
  }

  // Push rounding remainders onto the final installment.
  const last = splits[splits.length - 1];
  last.baseAmount = round2(last.baseAmount + (pricing.baseAmount - perBase * n));
  last.discountAmount = round2(last.discountAmount + (pricing.discountAmount - perDiscount * n));
  last.taxAmount = round2(last.taxAmount + (pricing.taxAmount - perTax * n));
  last.totalAmount = round2(last.totalAmount + (pricing.totalAmount - perTotal * n));

  return splits;
}
