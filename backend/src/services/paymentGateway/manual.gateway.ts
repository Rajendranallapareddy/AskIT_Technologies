import { PaymentGatewayAdapter, CreateOrderParams, CreateOrderResult, VerifyPaymentParams, RefundParams, RefundResult } from './types';
import { generateSecureToken } from '../../utils/crypto';

// Represents offline payments (direct bank transfer, cash at office) that an
// admin manually reviews and approves — see the "Offline payment approval
// workflow" requirement. No real gateway call happens; verification is done
// by an admin action instead of a signature.
export class ManualGateway implements PaymentGatewayAdapter {
  readonly name = 'MANUAL';

  getPublicKey(): string {
    return '';
  }

  isAvailable(): boolean {
    return false;
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    return { gatewayOrderId: `manual_${generateSecureToken(8)}`, amountInPaise: params.amountInPaise, currency: params.currency };
  }

  verifyPaymentSignature(_params: VerifyPaymentParams): boolean {
    // Manual payments are never "verified" via signature — an admin approves
    // them explicitly through the offline approval workflow instead.
    return false;
  }

  verifyWebhookSignature(): boolean {
    return false;
  }

  async initiateRefund(_params: RefundParams): Promise<RefundResult> {
    return { gatewayRefundId: `manual_refund_${generateSecureToken(8)}`, status: 'processed' };
  }
}
