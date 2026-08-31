import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { paymentApi } from '../api/endpoints';
import { getErrorMessage } from '../utils/helpers';

declare global {
  interface Window {
    Razorpay: any;
  }
}

let scriptPromise: Promise<void> | null = null;

// Loads the Razorpay checkout script once and reuses it across the app —
// this is the only piece of gateway code that runs in the browser; the
// actual charge and every trust decision happens server-side.
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load payment gateway. Check your connection and try again.'));
    document.body.appendChild(script);
  });
  return scriptPromise;
}

interface CheckoutParams {
  internshipId: string;
  internshipTitle: string;
  couponCode?: string;
  installments?: number; // 2-6 to split the fee, omit to pay in full
  paymentMethod?: 'ONLINE' | 'MANUAL'; // 'MANUAL' = student wants to pay via UPI QR / bank transfer, not the online gateway
  prefillName?: string;
  prefillEmail?: string;
  prefillContact?: string;
  onSuccess: (result: CheckoutSuccessResult) => void;
  onFree: (result: { registrationNo: string }) => void;
  // Called when online payment isn't available right now (or the student
  // asked to pay manually) — the registration is still created with the
  // (first) payment marked as due, so the student is enrolled and just
  // needs to pay via the returned UPI/bank details.
  onOfflinePending?: (result: {
    registrationNo: string;
    amountDue: number;
    message: string;
    paymentId: string;
    manualAccounts: any[];
  }) => void;
  onError: (message: string) => void;
}

// registrationNo/receiptNo are only present once a payment is fully
// credited. Installment/manual payments come back with pendingApproval
// instead — awaiting Super Admin review — so callers must check that flag
// before assuming the payment (and enrollment, for a first installment)
// is finalized.
interface CheckoutSuccessResult {
  paymentNo: string;
  registrationNo?: string;
  receiptNo?: string;
  pendingApproval?: boolean;
  status?: string;
}

interface RetryParams {
  title: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillContact?: string;
  onSuccess: (result: CheckoutSuccessResult) => void;
  onError: (message: string) => void;
}

export function useRazorpayCheckout() {
  const [isProcessing, setIsProcessing] = useState(false);

  // Shared by both a brand-new checkout (startCheckout) and retrying an
  // already-created pending payment, such as a later installment
  // (payExisting) — same Razorpay widget, same verify/failure wiring.
  const openCheckoutForOrder = async (order: any, opts: { title: string; prefillName?: string; prefillEmail?: string; prefillContact?: string; onSuccess: RetryParams['onSuccess']; onError: (m: string) => void }) => {
    await loadRazorpayScript();

    const razorpay = new window.Razorpay({
      key: order.keyId,
      amount: Math.round(order.amount * 100),
      currency: order.currency,
      name: 'ASK IT Technologies',
      description: opts.title,
      order_id: order.gatewayOrderId,
      prefill: { name: opts.prefillName, email: opts.prefillEmail, contact: opts.prefillContact },
      theme: { color: '#f97316' },
      handler: async (response: any) => {
        try {
          const verifyRes = await paymentApi.verify({
            paymentId: order.paymentId,
            gatewayOrderId: response.razorpay_order_id,
            gatewayPaymentId: response.razorpay_payment_id,
            gatewaySignature: response.razorpay_signature,
          });
          opts.onSuccess(verifyRes.data.data);
        } catch (err) {
          opts.onError(getErrorMessage(err));
        } finally {
          setIsProcessing(false);
        }
      },
      modal: {
        ondismiss: async () => {
          await paymentApi.reportFailure(order.paymentId, 'User closed the checkout window');
          setIsProcessing(false);
        },
      },
    });

    razorpay.on('payment.failed', async (response: any) => {
      await paymentApi.reportFailure(order.paymentId, response.error?.description || 'Payment failed at gateway');
      opts.onError(response.error?.description || 'Payment failed. Please try again.');
      setIsProcessing(false);
    });

    razorpay.open();
  };

  const startCheckout = async (params: CheckoutParams) => {
    setIsProcessing(true);
    try {
      const idempotencyKey = uuidv4();
      const orderRes = await paymentApi.createOrder({
        internshipId: params.internshipId,
        couponCode: params.couponCode || undefined,
        idempotencyKey,
        installments: params.installments,
        paymentMethod: params.paymentMethod,
      });
      const order = orderRes.data.data;

      if (order.isFree) {
        params.onFree({ registrationNo: order.registrationNo });
        setIsProcessing(false);
        return;
      }

      if (order.requiresOfflinePayment) {
        params.onOfflinePending?.({
          registrationNo: order.registrationNo,
          amountDue: order.amountDue,
          message: orderRes.data.message,
          paymentId: order.paymentId,
          manualAccounts: order.manualAccounts || [],
        });
        setIsProcessing(false);
        return;
      }

      await openCheckoutForOrder(order, { ...params, title: params.internshipTitle });
    } catch (err) {
      params.onError(getErrorMessage(err));
      setIsProcessing(false);
    }
  };

  // Pays an already-existing PENDING payment — a later installment, or a
  // full payment that was marked "pay later" because online checkout wasn't
  // available when the student registered.
  const payExisting = async (paymentId: string, params: RetryParams) => {
    setIsProcessing(true);
    try {
      const orderRes = await paymentApi.payInstallment(paymentId);
      const order = orderRes.data.data;
      await openCheckoutForOrder(order, params);
    } catch (err) {
      params.onError(getErrorMessage(err));
      setIsProcessing(false);
    }
  };

  // Switches an already-pending payment over to the manual UPI-QR / bank
  // transfer path — e.g. the student started an online checkout, backed
  // out, and would rather scan a QR code instead.
  const payManually = async (
    paymentId: string,
    onReady: (result: { amountDue: number; manualAccounts: any[]; message: string }) => void,
    onError: (message: string) => void
  ) => {
    try {
      const res = await paymentApi.switchToManual(paymentId);
      onReady({ amountDue: res.data.data.amountDue, manualAccounts: res.data.data.manualAccounts || [], message: res.data.message });
    } catch (err) {
      onError(getErrorMessage(err));
    }
  };

  return { startCheckout, payExisting, payManually, isProcessing };
}
