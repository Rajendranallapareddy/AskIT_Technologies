import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { encrypt, maskAccountNumber } from '../utils/crypto';
import { logActivity } from '../services/audit.service';

// Strips encrypted secrets from the response — the frontend should never
// receive gateway secrets or full account numbers, even for a Super Admin
// viewing the list (they see the masked/display version only).
function toSafeAccount(account: any) {
  const { accountNumberEnc, gatewayKeySecretEnc, ...safe } = account;
  return { ...safe, hasGatewaySecret: !!gatewayKeySecretEnc };
}

// Converts empty-string form fields to `undefined` so Prisma omits them
// instead of trying to save "" into an optional field. This matters most
// for `gatewayName`, which is a Prisma *enum* column — sending an empty
// string there (instead of a real enum value or nothing at all) is what
// previously crashed account creation with "Invalid value for argument
// gatewayName. Expected PaymentGateway."
function cleanOptionalFields<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    cleaned[key] = value === '' ? undefined : value;
  }
  return cleaned as T;
}

// GET /api/admin/payment-accounts
export async function listPaymentAccounts(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const accounts = await prisma.paymentAccount.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: accounts.map(toSafeAccount) });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/payment-accounts
// Accepts multipart/form-data when a QR code image file is attached
// (field name "qrCode"), or a plain JSON body without one.
export async function createPaymentAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      type, label, upiId, accountHolderName, accountNumber, ifsc, branch,
      gatewayName, merchantId, gatewayKeyId, gatewayKeySecret,
    } = req.body;

    if (!type || !label) throw new AppError('type and label are required', 400);

    // A real uploaded QR image takes priority; fall back to a manually
    // pasted URL only if no file was attached.
    const qrCodeUrl = req.file ? `/uploads/qrcodes/${req.file.filename}` : (req.body.qrCodeUrl || undefined);

    const data = cleanOptionalFields({
      type, label, upiId, qrCodeUrl, accountHolderName, ifsc, branch,
      gatewayName, merchantId, gatewayKeyId,
    });
    (data as any).createdById = req.user!.id;

    if (accountNumber) {
      (data as any).accountNumberMasked = maskAccountNumber(accountNumber);
      (data as any).accountNumberEnc = encrypt(accountNumber);
    }
    if (gatewayKeySecret) {
      (data as any).gatewayKeySecretEnc = encrypt(gatewayKeySecret);
    }

    const account = await prisma.paymentAccount.create({ data });

    await logActivity({ actorId: req.user!.id, action: 'PAYMENT_ACCOUNT_CREATE', description: `Added payment account "${label}"`, ipAddress: req.ip });

    res.status(201).json({ success: true, message: 'Payment account added', data: toSafeAccount(account) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/payment-accounts/:id
export async function updatePaymentAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      label, upiId, accountHolderName, accountNumber, ifsc, branch,
      gatewayName, merchantId, gatewayKeyId, gatewayKeySecret, isActive,
    } = req.body;

    const qrCodeUrl = req.file ? `/uploads/qrcodes/${req.file.filename}` : req.body.qrCodeUrl;

    const data = cleanOptionalFields({ label, upiId, qrCodeUrl, accountHolderName, ifsc, branch, gatewayName, merchantId, gatewayKeyId, isActive });
    Object.keys(data).forEach((k) => (data as any)[k] === undefined && delete (data as any)[k]);

    if (accountNumber) {
      (data as any).accountNumberMasked = maskAccountNumber(accountNumber);
      (data as any).accountNumberEnc = encrypt(accountNumber);
    }
    if (gatewayKeySecret) {
      (data as any).gatewayKeySecretEnc = encrypt(gatewayKeySecret);
    }

    const account = await prisma.paymentAccount.update({ where: { id: req.params.id }, data });

    await logActivity({ actorId: req.user!.id, action: 'PAYMENT_ACCOUNT_UPDATE', description: `Updated payment account "${account.label}"`, ipAddress: req.ip });

    res.json({ success: true, message: 'Payment account updated', data: toSafeAccount(account) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/payment-accounts/:id/toggle
export async function togglePaymentAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.paymentAccount.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Payment account not found', 404);
    const account = await prisma.paymentAccount.update({ where: { id: req.params.id }, data: { isActive: !existing.isActive } });
    res.json({ success: true, message: `Account ${account.isActive ? 'enabled' : 'disabled'}`, data: toSafeAccount(account) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/payment-accounts/:id
export async function deletePaymentAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.paymentAccount.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Payment account not found', 404);
    await prisma.paymentAccount.delete({ where: { id: req.params.id } });
    await logActivity({ actorId: req.user!.id, action: 'PAYMENT_ACCOUNT_DELETE', description: `Deleted payment account "${existing.label}"`, ipAddress: req.ip });
    res.json({ success: true, message: 'Payment account deleted' });
  } catch (err) {
    next(err);
  }
}
