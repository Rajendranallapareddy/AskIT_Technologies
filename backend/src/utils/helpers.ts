import { v4 as uuidv4 } from 'uuid';

export function slugify(text: string): string {
  return (
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') +
    '-' +
    uuidv4().slice(0, 6)
  );
}

export function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `ASKIT-CERT-${year}-${random}`;
}

// Human-friendly reference numbers. These are for display only — they are
// NOT used as the unpredictable secret behind receipt verification (see
// generateSecureToken in crypto.ts for that).
function friendlyRef(prefix: string): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `ASKIT-${prefix}-${year}-${random}`;
}

export const generatePaymentNumber = () => friendlyRef('PAY');
export const generateReceiptNumber = () => friendlyRef('RCPT');
export const generateRefundNumber = () => friendlyRef('RFND');
export const generateRegistrationNumber = () => friendlyRef('REG');

export function computePaymentAmounts(baseAmount: number, gstPercentage = 0, discountAmount = 0) {
  const discounted = Math.max(baseAmount - discountAmount, 0);
  const tax = Math.round(discounted * (gstPercentage / 100) * 100) / 100;
  const total = Math.round((discounted + tax) * 100) / 100;
  return { baseAmount, discountAmount, taxAmount: tax, totalAmount: total };
}

export function paginate(page = 1, limit = 10) {
  const take = Math.min(limit, 100);
  const skip = (Math.max(page, 1) - 1) * take;
  return { skip, take };
}

export function buildMeta(total: number, page = 1, limit = 10) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function sanitizeUser<T extends { passwordHash?: string; resetToken?: string | null; emailVerifyToken?: string | null }>(
  user: T
) {
  const { passwordHash, resetToken, emailVerifyToken, ...rest } = user;
  return rest;
}
