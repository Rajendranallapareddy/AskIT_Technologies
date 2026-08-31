// Common interface every payment gateway adapter must implement. This is
// what lets the rest of the app (controllers, services) stay gateway-agnostic
// — swapping Razorpay for Stripe or Cashfree means writing one new adapter
// file and registering it in gatewayFactory.ts, with zero changes elsewhere.

export interface CreateOrderParams {
  amountInPaise: number; // smallest currency unit (paise for INR, cents for USD)
  currency: string;
  receipt: string; // our internal payment number, shown on the gateway dashboard
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  gatewayOrderId: string;
  amountInPaise: number;
  currency: string;
  raw?: unknown;
}

export interface VerifyPaymentParams {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}

export interface RefundParams {
  gatewayPaymentId: string;
  amountInPaise: number; // omit / pass full amount for a full refund
  notes?: Record<string, string>;
}

export interface RefundResult {
  gatewayRefundId: string;
  status: string;
  raw?: unknown;
}

export interface PaymentGatewayAdapter {
  readonly name: string;
  /** The public key safe to expose to the frontend checkout widget. */
  getPublicKey(): string;
  /**
   * Whether this adapter can actually take an online payment right now
   * (real credentials configured, etc). MANUAL always returns false — it
   * has no real checkout widget. Lets callers decide to fall back to an
   * offline/"pay later" flow instead of throwing a dead-end error.
   */
  isAvailable(): boolean;
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  /** Verifies the signature returned by the client-side checkout callback. Server-side only. */
  verifyPaymentSignature(params: VerifyPaymentParams): boolean;
  /** Verifies an inbound webhook's signature against the raw request body. */
  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string): boolean;
  initiateRefund(params: RefundParams): Promise<RefundResult>;
}
