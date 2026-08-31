import { prisma } from '../config/db';

// The student-facing subset of a PaymentAccount — never includes anything
// gateway-secret or a full account number, only what someone needs to
// actually send money: a UPI VPA + QR code, or bank transfer details.
export interface ManualPaymentAccount {
  id: string;
  type: 'UPI' | 'BANK_ACCOUNT';
  label: string;
  upiId: string | null;
  qrCodeUrl: string | null;
  accountHolderName: string | null;
  accountNumberMasked: string | null;
  ifsc: string | null;
  branch: string | null;
}

// Returns every active UPI/bank PaymentAccount a Super Admin has configured,
// safe to show a student on the "Pay via UPI / Bank Transfer" screen.
// GATEWAY_KEYS-type accounts (Razorpay credentials etc.) are never returned
// here — those aren't a manual payment method, and this function is the one
// place that decides what's safe to expose publicly, so callers never need
// to remember to filter secrets themselves.
export async function getActiveManualPaymentAccounts(): Promise<ManualPaymentAccount[]> {
  const accounts = await prisma.paymentAccount.findMany({
    where: { isActive: true, type: { in: ['UPI', 'BANK_ACCOUNT'] } },
    orderBy: { createdAt: 'asc' },
  });
  return accounts.map((a) => ({
    id: a.id,
    type: a.type as 'UPI' | 'BANK_ACCOUNT',
    label: a.label,
    upiId: a.upiId,
    qrCodeUrl: a.qrCodeUrl,
    accountHolderName: a.accountHolderName,
    accountNumberMasked: a.accountNumberMasked,
    ifsc: a.ifsc,
    branch: a.branch,
  }));
}
