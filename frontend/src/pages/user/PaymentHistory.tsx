import { useState } from 'react';
import { Receipt, Download, RotateCcw, CreditCard, Layers, QrCode } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { USER_LINKS } from './_links';
import { useApiQuery } from '../../hooks/useQuery';
import { paymentApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { useRazorpayCheckout } from '../../hooks/useRazorpayCheckout';
import { getErrorMessage } from '../../utils/helpers';
import { formatDateTime, formatMoney } from '../../utils/formatters';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ManualPaymentModal from '../../components/payments/ManualPaymentModal';
import type { Payment } from '../../types';

export default function PaymentHistory() {
  const { data, isLoading, refetch, error } = useApiQuery<Payment[]>(() => paymentApi.history());
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualPayment, setManualPayment] = useState<{ paymentId: string; amountDue: number; manualAccounts: any[] } | null>(null);
  const toast = useToast();
  const { user } = useAuth();
  const { payExisting, payManually, isProcessing } = useRazorpayCheckout();

  const submitRefundRequest = async () => {
    if (!refundTarget) return;
    setIsSubmitting(true);
    try {
      await paymentApi.requestRefund(refundTarget.id, reason);
      toast.success('Refund request submitted — an admin will review it shortly.');
      setRefundTarget(null);
      setReason('');
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const payNow = (p: any) => {
    payExisting(p.id, {
      title: p.internship.title,
      prefillName: user?.fullName,
      prefillEmail: user?.email,
      prefillContact: user?.mobileNumber,
      onSuccess: (result) => {
        toast.success(result.pendingApproval ? 'Payment received! Pending Super Admin approval.' : 'Payment successful!');
        refetch();
      },
      onError: (msg) => toast.error(msg),
    });
  };

  const payViaUpiOrBank = (p: any) => {
    payManually(
      p.id,
      (result) => setManualPayment({ paymentId: p.id, amountDue: result.amountDue, manualAccounts: result.manualAccounts }),
      (msg) => toast.error(msg)
    );
  };

  return (
    <DashboardLayout links={USER_LINKS} title="Student Portal" pageTitle="Payment History">
      {isLoading || !data ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState icon={<Receipt className="w-8 h-8" />} title="No payments yet" description="Payments for paid internships will appear here." />
      ) : (
        <div className="space-y-4">
          {data.map((p: any) => {
            const isPending = p.status === 'PENDING';
            const isInstallment = !!p.installmentPlanId;
            return (
              <div key={p.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy-900">{p.internship.title}</p>
                    <p className="text-xs text-navy-400 mt-1 font-mono">{p.paymentNo}</p>
                    <p className="text-xs text-navy-500 mt-1">{formatDateTime(p.createdAt)}</p>
                    {isInstallment && (
                      <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        <Layers className="w-3 h-3" /> Installment {p.installmentIndex}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-[11px] font-bold uppercase tracking-wide ${p.status === 'SUCCESS' ? 'text-green-600' : isPending ? 'text-amber-600' : p.status === 'PENDING_APPROVAL' ? 'text-amber-600' : 'text-navy-400'}`}>
                      {p.status === 'SUCCESS' ? 'Amount Paid' : p.status === 'PENDING_APPROVAL' ? 'Awaiting Approval' : isPending ? 'Amount Due' : 'Amount'}
                    </p>
                    <p className="text-2xl font-extrabold text-navy-900 leading-tight">{formatMoney(p.totalAmount)}</p>
                    <div className="mt-1"><StatusBadge status={p.status} /></div>
                  </div>
                </div>
                {p.status === 'SUCCESS' && p.receipt && (
                  <div className="mt-4 pt-4 border-t border-navy-50 flex flex-wrap gap-2">
                    <a href={p.receipt.fileUrl || '#'} target="_blank" rel="noreferrer" className="btn-outline !py-2 text-xs">
                      <Download className="w-3.5 h-3.5" /> Download Receipt
                    </a>
                    <Button variant="ghost" className="!py-2 text-xs !text-navy-600 !border-navy-200" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={() => setRefundTarget(p)}>
                      Request Refund
                    </Button>
                  </div>
                )}
                {isPending && (
                  <div className="mt-4 pt-4 border-t border-navy-50">
                    <p className="text-xs text-amber-600 mb-2">
                      {isInstallment ? 'This installment is still due.' : 'Payment is still pending — pay online now, or scan a UPI QR code / pay by bank transfer.'}
                    </p>
                    {p.studentReference && (
                      <p className="text-xs text-navy-500 mb-2">
                        Reference submitted: <span className="font-mono font-semibold text-navy-700">{p.studentReference}</span> — awaiting admin verification.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button className="!py-2 text-xs" icon={<CreditCard className="w-3.5 h-3.5" />} isLoading={isProcessing} onClick={() => payNow(p)}>
                        Pay {formatMoney(p.totalAmount)} Now
                      </Button>
                      <Button variant="outline" className="!py-2 text-xs" icon={<QrCode className="w-3.5 h-3.5" />} onClick={() => payViaUpiOrBank(p)}>
                        UPI QR / Bank Transfer
                      </Button>
                    </div>
                  </div>
                )}
                {p.status === 'PENDING_APPROVAL' && (
                  <div className="mt-4 pt-4 border-t border-navy-50">
                    <p className="text-xs text-amber-600 mb-1 font-semibold">
                      Payment received — pending Super Admin approval. You'll be notified once it's verified.
                    </p>
                    {p.studentReference && (
                      <p className="text-xs text-navy-500">
                        Reference: <span className="font-mono font-semibold text-navy-700">{p.studentReference}</span>
                      </p>
                    )}
                  </div>
                )}
                {p.status === 'FAILED' && (
                  <div className="mt-4 pt-4 border-t border-navy-50">
                    <p className="text-xs text-red-500 mb-2">
                      {p.rejectionReason
                        ? `Rejected by Super Admin: ${p.rejectionReason}`
                        : `This payment attempt failed${p.failureReason ? `: ${p.failureReason}` : '.'}`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button className="!py-2 text-xs" icon={<CreditCard className="w-3.5 h-3.5" />} isLoading={isProcessing} onClick={() => payNow(p)}>
                        Retry Payment
                      </Button>
                      <Button variant="outline" className="!py-2 text-xs" icon={<QrCode className="w-3.5 h-3.5" />} onClick={() => payViaUpiOrBank(p)}>
                        UPI QR / Bank Transfer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!refundTarget} onClose={() => setRefundTarget(null)} title="Request Refund">
        <div className="space-y-4">
          <p className="text-sm text-navy-600">
            Requesting a refund for <b>{refundTarget?.internship.title}</b> ({formatMoney(refundTarget?.totalAmount)}).
            An admin will review and process this request.
          </p>
          <div>
            <label className="label">Reason</label>
            <textarea rows={3} className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you requesting a refund?" />
          </div>
          <Button className="w-full" isLoading={isSubmitting} onClick={submitRefundRequest}>Submit Request</Button>
        </div>
      </Modal>

      <ManualPaymentModal
        isOpen={!!manualPayment}
        onClose={() => { setManualPayment(null); refetch(); }}
        amountDue={manualPayment?.amountDue || 0}
        paymentId={manualPayment?.paymentId || ''}
        accounts={manualPayment?.manualAccounts || []}
        onReferenceSubmitted={refetch}
      />
    </DashboardLayout>
  );
}
