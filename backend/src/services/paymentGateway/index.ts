import { PaymentGatewayAdapter } from './types';
import { RazorpayGateway } from './razorpay.gateway';
import { ManualGateway } from './manual.gateway';

export * from './types';

// Add new adapters here (StripeGateway, CashfreeGateway, PhonePeGateway…)
// as they're implemented — each one just needs to satisfy PaymentGatewayAdapter.
const adapters: Record<string, () => PaymentGatewayAdapter> = {
  RAZORPAY: () => new RazorpayGateway(),
  MANUAL: () => new ManualGateway(),
};

const cache: Map<string, PaymentGatewayAdapter> = new Map();

// Returns the requested gateway adapter (a specific payment's own `gateway`
// column, when re-verifying/refunding an existing payment), or — when no
// name is given — the currently *active* gateway.
//
// IMPORTANT: which gateway is "active" is a database setting
// (PaymentSettings.activeGateway, editable from Admin → Payment Settings),
// NOT just the PAYMENT_GATEWAY env var. The env var only supplies the
// default the very first time the settings row is created. Previously this
// read only the env var, which meant the admin's "Active Payment Gateway"
// dropdown had no effect on checkout at all — flipping it in the UI changed
// the database row but the running server kept using whatever
// PAYMENT_GATEWAY happened to be set to in the container/host environment.
// Call getActivePaymentGateway() from request-handling code instead of this
// function directly whenever you want "whatever gateway is active right
// now" rather than a specific historical payment's gateway.
export function getPaymentGateway(name?: string): PaymentGatewayAdapter {
  const gatewayName = (name || process.env.PAYMENT_GATEWAY || 'RAZORPAY').toUpperCase();
  const existing = cache.get(gatewayName);
  if (existing) return existing;
  const factory = adapters[gatewayName];
  if (!factory) throw new Error(`Unsupported payment gateway: ${gatewayName}`);
  const instance = factory();
  cache.set(gatewayName, instance);
  return instance;
}

// Resolves the gateway that should be used for a NEW checkout, consulting
// the DB-backed PaymentSettings singleton first.
export async function getActivePaymentGateway(): Promise<PaymentGatewayAdapter> {
  const { getPaymentSettings } = await import('../pricing.service');
  const settings = await getPaymentSettings();
  return getPaymentGateway(settings.activeGateway);
}
