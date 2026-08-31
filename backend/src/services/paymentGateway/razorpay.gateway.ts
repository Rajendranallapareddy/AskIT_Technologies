import crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  PaymentGatewayAdapter, CreateOrderParams, CreateOrderResult,
  VerifyPaymentParams, RefundParams, RefundResult,
} from './types';
import { AppError } from '../../middleware/error.middleware';

// The literal placeholder shipped in .env.example — if this is still set,
// the person hasn't configured real keys yet. Checking for it explicitly
// lets us fail with a clear setup instruction instead of a cryptic
// "Authentication failed" error from Razorpay's API.
const PLACEHOLDER_KEY_ID = 'rzp_test_xxxxxxxxxxxx';

// Razorpay natively supports UPI, cards, netbanking, and wallets under a
// single integration, which covers most of the required payment methods for
// an Indian business without stitching together multiple gateways.
export class RazorpayGateway implements PaymentGatewayAdapter {
  readonly name = 'RAZORPAY';
  private client: Razorpay;
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  private isConfigured: boolean;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    this.isConfigured = !!this.keyId && !!this.keySecret && this.keyId !== PLACEHOLDER_KEY_ID;

    if (!this.isConfigured) {
      // We don't throw here so the app can still boot in dev without a
      // gateway configured; requests that need it fail with a clear error
      // (see createOrder below) instead of crashing the whole server.
      console.warn(
        '[payments] Razorpay is not configured — RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in backend/.env are ' +
        'missing or still the placeholder values. Paid checkout will fail until you set real test/live keys ' +
        'from https://dashboard.razorpay.com (Settings → API Keys). Free internships and the MANUAL gateway ' +
        '(offline payments) still work.'
      );
    }
    this.client = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });
  }

  getPublicKey(): string {
    return this.keyId;
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    if (!this.isConfigured) {
      throw new AppError(
        'Online payments are not set up yet. An administrator needs to add real Razorpay API keys to the ' +
        'backend .env file (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) before checkout will work.',
        503
      );
    }
    try {
      const order = await this.client.orders.create({
        amount: params.amountInPaise,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
      });
      return { gatewayOrderId: order.id, amountInPaise: Number(order.amount), currency: order.currency, raw: order };
    } catch (err: any) {
      // Surface Razorpay's own error description (e.g. "Authentication
      // failed", "Amount must be at least ₹1") instead of a generic 500.
      const description = err?.error?.description || err?.message || 'Failed to create payment order with Razorpay.';
      throw new AppError(description, err?.statusCode || 502);
    }
  }

  // HMAC-SHA256 of "order_id|payment_id" signed with the key secret — this is
  // the standard Razorpay checkout verification and MUST happen server-side.
  // Never trust a "payment succeeded" message from the client alone.
  verifyPaymentSignature({ gatewayOrderId, gatewayPaymentId, gatewaySignature }: VerifyPaymentParams): boolean {
    if (!this.keySecret) return false;
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${gatewayOrderId}|${gatewayPaymentId}`)
      .digest('hex');
    return timingSafeEqualHex(expected, gatewaySignature);
  }

  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string): boolean {
    if (!this.webhookSecret || !signatureHeader) return false;
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return timingSafeEqualHex(expected, signatureHeader);
  }

  async initiateRefund({ gatewayPaymentId, amountInPaise, notes }: RefundParams): Promise<RefundResult> {
    if (!this.isConfigured) {
      throw new AppError('Cannot process a gateway refund: Razorpay is not configured on this server.', 503);
    }
    try {
      const refund = await this.client.payments.refund(gatewayPaymentId, {
        amount: amountInPaise || undefined, // omit for full refund
        notes,
      });
      return { gatewayRefundId: refund.id, status: refund.status, raw: refund };
    } catch (err: any) {
      const description = err?.error?.description || err?.message || 'Failed to process refund with Razorpay.';
      throw new AppError(description, err?.statusCode || 502);
    }
  }
}

// Constant-time comparison to avoid leaking signature-matching timing info.
function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
