import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { USER_LINKS } from './_links';
import { useApiQuery } from '../../hooks/useQuery';
import { userApi, paymentApi } from '../../api/endpoints';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useRazorpayCheckout } from '../../hooks/useRazorpayCheckout';
import { getErrorMessage } from '../../utils/helpers';
import { formatDate, formatMoney } from '../../utils/formatters';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import ManualPaymentModal from '../../components/payments/ManualPaymentModal';
import { Briefcase, Layers, CreditCard, QrCode, ChevronDown, ChevronUp } from 'lucide-react';

const DISPLAY_LABEL: Record<string, string> = {
  PAID: 'Paid',
  PENDING_APPROVAL: 'Pending Approval',
  DUE: 'Due',
  UPCOMING: 'Upcoming',
  FAILED: 'Failed',
  OVERDUE: 'Overdue',
};

// Every installment of every plan the student has, keyed by registration id
// — lets each course card show its own schedule without a second render
// pass per card.
function groupPlansByRegistration(plans: any[]) {
  const map: Record<string, any> = {};
  for (const plan of plans) {
    if (plan.registrationId) map[plan.registrationId] = plan;
  }
  return map;
}

export default function MyInternships() {
  const { data, isLoading, refetch, error } = useApiQuery<any>(() => userApi.dashboard());
  const { data: plansData, refetch: refetchPlans } = useApiQuery<any[]>(() => paymentApi.myInstallmentPlans());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [manualPayment, setManualPayment] = useState<{ paymentId: string; amountDue: number; manualAccounts: any[] } | null>(null);
  const toast = useToast();
  const { user } = useAuth();
  const { payExisting, payManually, isProcessing } = useRazorpayCheckout();

  const handleCancel = async (id: string) => {
    try {
      await userApi.cancelRegistration(id);
      toast.success('Registration cancelled');
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const plansByRegistration = groupPlansByRegistration(plansData || []);

  const payNow = (payment: any, internshipTitle: string) => {
    payExisting(payment.id, {
      title: internshipTitle,
      prefillName: user?.fullName,
      prefillEmail: user?.email,
      prefillContact: user?.mobileNumber,
      onSuccess: (result) => {
        toast.success(result.pendingApproval ? 'Payment received! Pending Super Admin approval.' : 'Installment paid!');
        refetch();
        refetchPlans();
      },
      onError: (msg) => toast.error(msg),
    });
  };

  const payViaUpiOrBank = (paymentId: string) => {
    payManually(
      paymentId,
      (result) => setManualPayment({ paymentId, amountDue: result.amountDue, manualAccounts: result.manualAccounts }),
      (msg) => toast.error(msg)
    );
  };

  return (
    <DashboardLayout links={USER_LINKS} title="Student Portal" pageTitle="My Internships">
      {isLoading || !data ? (
        <LoadingSpinner />
      ) : data.registrations.length === 0 ? (
        <EmptyState icon={<Briefcase className="w-8 h-8" />} title="No internships yet" description="Browse open internships and register to get started." action={<a href="/internships" className="btn-primary">Browse Internships</a>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.registrations.map((r: any) => {
            const plan = plansByRegistration[r.id];
            const isOpen = !!expanded[r.id];
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <StatusBadge status={r.status} />
                </div>
                <h3 className="font-bold text-navy-900 mt-3">{r.internship.title}</h3>
                {r.registrationNo && <p className="text-xs text-navy-400 mt-1 font-mono">{r.registrationNo}</p>}
                <p className="text-xs text-navy-500 mt-2">Starts {formatDate(r.internship.startDate)} • {r.internship.duration}</p>
                <p className="text-xs text-navy-400 mt-1">Applied {formatDate(r.appliedAt)}</p>

                {r.status === 'AWAITING_PAYMENT' && (
                  <Link to={`/internships/${r.internship.slug}`} className="btn-primary w-full mt-4 !py-2 text-xs">Complete Payment</Link>
                )}
                {r.status === 'PENDING' && !plan && (
                  <Button variant="outline" className="w-full mt-4 !py-2 text-xs" onClick={() => handleCancel(r.id)}>Cancel Registration</Button>
                )}

                {/* Installment schedule — full breakdown per requirement:
                    total fee, count, per-installment amount, due dates,
                    paid/remaining amounts, and next-due summary. */}
                {plan && (
                  <div className="mt-4 pt-4 border-t border-navy-50">
                    <button
                      onClick={() => setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))}
                      className="w-full flex items-center justify-between text-xs font-bold text-navy-700"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-orange-500" /> Installment Plan ({plan.numberOfInstallments}x)
                      </span>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <div className="bg-navy-50 rounded-lg py-2">
                        <p className="text-[10px] text-navy-400 font-semibold uppercase">Total</p>
                        <p className="text-sm font-extrabold text-navy-900">{formatMoney(plan.totalAmount)}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg py-2">
                        <p className="text-[10px] text-green-500 font-semibold uppercase">Paid</p>
                        <p className="text-sm font-extrabold text-green-700">{formatMoney(plan.paidAmount)}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg py-2">
                        <p className="text-[10px] text-orange-500 font-semibold uppercase">Remaining</p>
                        <p className="text-sm font-extrabold text-orange-700">{formatMoney(plan.remainingAmount)}</p>
                      </div>
                    </div>

                    {plan.pendingApprovalInstallment && (
                      <div className="mt-3 bg-sky-50 border border-sky-200 rounded-lg p-3">
                        <p className="text-xs text-sky-700">
                          <b>Installment {plan.pendingApprovalInstallment.installmentIndex}</b> ({formatMoney(plan.pendingApprovalInstallment.totalAmount)}) was submitted and is pending Super Admin approval. It'll count toward Paid once approved.
                        </p>
                      </div>
                    )}

                    {plan.nextInstallment && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-700">
                          Next: <b>Installment {plan.nextInstallment.installmentIndex}</b> — {formatMoney(plan.nextInstallment.totalAmount)}, due {formatDate(plan.nextInstallment.dueDate)}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button className="!py-1.5 text-[11px]" icon={<CreditCard className="w-3 h-3" />} isLoading={isProcessing} onClick={() => payNow(plan.nextInstallment, r.internship.title)}>
                            Pay Now
                          </Button>
                          <Button variant="outline" className="!py-1.5 text-[11px]" icon={<QrCode className="w-3 h-3" />} onClick={() => payViaUpiOrBank(plan.nextInstallment.id)}>
                            UPI / Bank
                          </Button>
                        </div>
                      </div>
                    )}

                    {isOpen && (
                      <div className="mt-3 space-y-2">
                        {plan.payments.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between text-xs bg-navy-50/60 rounded-lg px-3 py-2">
                            <div>
                              <p className="font-semibold text-navy-800">Installment {p.installmentIndex}</p>
                              <p className="text-navy-400">
                                {p.status === 'SUCCESS' ? `Paid ${formatDate(p.paidAt)}` : `Due ${formatDate(p.dueDate)}`}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <span className="font-bold text-navy-800">{formatMoney(p.totalAmount)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.displayStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                                p.displayStatus === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700' :
                                p.displayStatus === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                p.displayStatus === 'DUE' ? 'bg-orange-100 text-orange-700' :
                                p.displayStatus === 'FAILED' ? 'bg-red-100 text-red-700' :
                                'bg-sky-100 text-sky-700'
                              }`}>
                                {DISPLAY_LABEL[p.displayStatus] || p.displayStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {plan.status === 'COMPLETED' && plan.remainingAmount <= 0 && (
                      <p className="text-xs text-green-600 font-semibold mt-3">🎉 All installments paid — plan complete!</p>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      <ManualPaymentModal
        isOpen={!!manualPayment}
        onClose={() => { setManualPayment(null); refetch(); refetchPlans(); }}
        amountDue={manualPayment?.amountDue || 0}
        paymentId={manualPayment?.paymentId || ''}
        accounts={manualPayment?.manualAccounts || []}
        onReferenceSubmitted={() => { refetch(); refetchPlans(); }}
      />
    </DashboardLayout>
  );
}
