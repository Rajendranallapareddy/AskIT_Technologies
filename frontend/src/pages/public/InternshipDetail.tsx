import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Users, Clock, MapPin, CheckCircle2, Tag, ShieldCheck, Receipt, CreditCard, QrCode } from 'lucide-react';
import { publicApi, paymentApi } from '../../api/endpoints';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useRazorpayCheckout } from '../../hooks/useRazorpayCheckout';
import { formatDate, formatMoney } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/helpers';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import ManualPaymentModal from '../../components/payments/ManualPaymentModal';
import Seo from '../../components/common/Seo';

// Splits a total into N installments the same way the backend does
// (splitIntoInstallments in pricing.service.ts): an even share each, with
// any rounding remainder pushed onto the last installment. This is purely
// for display before checkout — the authoritative split is always
// recomputed server-side when the order is actually created.
function previewInstallments(pricing: any, n: number) {
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const per = round2(pricing.totalAmount / n);
  const rows = Array.from({ length: n }, (_, i) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30 * i); // matches the backend's 30-day stagger
    return { index: i + 1, amount: per, dueDate };
  });
  rows[rows.length - 1].amount = round2(rows[rows.length - 1].amount + (pricing.totalAmount - per * n));
  return rows;
}

export default function InternshipDetail() {
  const { slug } = useParams();
  const [internship, setInternship] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [pricing, setPricing] = useState<any>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [payPlan, setPayPlan] = useState<1 | 2 | 3>(1); // 1 = pay in full
  const [payVia, setPayVia] = useState<'ONLINE' | 'MANUAL'>('ONLINE');
  const [manualPayment, setManualPayment] = useState<{ paymentId: string; amountDue: number; manualAccounts: any[] } | null>(null);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { startCheckout, isProcessing } = useRazorpayCheckout();

  useEffect(() => {
    if (slug) publicApi.internship(slug).then((res) => setInternship(res.data.data)).catch(() => setInternship(false));
  }, [slug]);

  // Fetch the server-computed price breakdown (base fee, GST, total) as
  // soon as we know the internship — this is the SAME calculation used at
  // checkout, so what the student sees here always matches what they're
  // actually charged, including GST pulled from the correct source (the
  // internship's own GST rate, falling back to the site-wide default).
  useEffect(() => {
    if (internship && Number(internship.fee) > 0) {
      paymentApi.validateCoupon(internship.id).then((res) => setPricing(res.data.data)).catch(() => {});
    }
  }, [internship]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsCheckingCoupon(true);
    setCouponError('');
    try {
      const res = await paymentApi.validateCoupon(internship.id, couponCode.trim());
      setPricing(res.data.data);
      toast.success('Coupon applied!');
    } catch (err) {
      setCouponError(getErrorMessage(err));
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const clearCoupon = async () => {
    setCouponCode('');
    setCouponError('');
    if (internship) {
      const res = await paymentApi.validateCoupon(internship.id);
      setPricing(res.data.data);
    }
  };

  const effectiveFee = (() => {
    if (!internship) return 0;
    if (internship.earlyBirdFee && internship.earlyBirdDeadline && new Date() <= new Date(internship.earlyBirdDeadline)) {
      return Number(internship.earlyBirdFee);
    }
    return Number(internship.fee || 0);
  })();

  const handleRegister = async () => {
    if (!isAuthenticated) return navigate('/login', { state: { from: `/internships/${slug}` } });
    if (user?.role !== 'USER') return toast.error('Only student accounts can register for internships.');

    if (effectiveFee <= 0) {
      startCheckout({
        internshipId: internship.id,
        internshipTitle: internship.title,
        onFree: () => { toast.success('Registration confirmed — no payment required!'); navigate('/my-internships'); },
        onSuccess: () => {},
        onError: (msg) => toast.error(msg),
      });
      return;
    }

    startCheckout({
      internshipId: internship.id,
      internshipTitle: internship.title,
      couponCode: pricing?.couponId ? couponCode.trim() : undefined,
      installments: payPlan > 1 ? payPlan : undefined,
      paymentMethod: payVia,
      prefillName: user?.fullName,
      prefillEmail: user?.email,
      prefillContact: user?.mobileNumber,
      onFree: () => { toast.success('Registration confirmed — no payment required!'); navigate('/my-internships'); },
      onSuccess: (result) => {
        if (result.pendingApproval) {
          toast.success('Payment received! Your registration will be confirmed as soon as the Super Admin approves it.');
        } else {
          toast.success(`Payment successful! Registration ID: ${result.registrationNo}`);
        }
        navigate('/my-internships');
      },
      onOfflinePending: (result) => {
        toast.success(`Registered! ID: ${result.registrationNo}.`);
        if (result.manualAccounts.length > 0) {
          setManualPayment({ paymentId: result.paymentId, amountDue: result.amountDue, manualAccounts: result.manualAccounts });
        } else {
          toast.info(result.message);
          navigate('/payment-history');
        }
      },
      onError: (msg) => toast.error(msg),
    });
  };

  if (internship === null) return (
    <>
      <Seo title="Internship" description="Loading internship details…" path={`/internships/${slug || ''}`} noIndex />
      <LoadingSpinner label="Loading internship…" />
    </>
  );
  if (internship === false) return (
    <>
      <Seo title="Internship Not Found" description="This internship could not be found." path={`/internships/${slug || ''}`} noIndex />
      <div className="py-24 text-center text-navy-500">Internship not found.</div>
    </>
  );

  // Fall back to a rough client-side estimate only until the server
  // breakdown has loaded (avoids a layout jump / blank price on first paint).
  const displayTotal = pricing ? pricing.totalAmount : effectiveFee;
  const gstPercentage = pricing ? pricing.gstPercentage : Number(internship.gstPercentage || 0);
  const installmentRows = pricing && payPlan > 1 ? previewInstallments(pricing, payPlan) : null;

  return (
    <section className="py-16">
      <Seo
        title={internship.title}
        description={(internship.description || '').slice(0, 155) || `Apply for the ${internship.title} internship at ASK IT Technologies — ${internship.mode} mode, ${internship.duration}.`}
        path={`/internships/${internship.slug}`}
        keywords={[internship.title, internship.mode]}
      />
      <div className="container-page grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <StatusBadge status={internship.status} />
          <h1 className="text-3xl font-extrabold text-navy-900 mt-4">{internship.title}</h1>
          <p className="mt-4 text-navy-600 leading-relaxed whitespace-pre-line">{internship.description}</p>

          {internship.trainer?.user && (
            <div className="mt-8 card p-5 flex items-center gap-4">
              <span className="w-12 h-12 rounded-full bg-navy-700 text-white flex items-center justify-center font-bold">
                {internship.trainer.user.fullName[0]}
              </span>
              <div>
                <p className="text-xs text-navy-400">Trainer</p>
                <p className="font-bold text-navy-900">{internship.trainer.user.fullName}</p>
              </div>
            </div>
          )}

          {effectiveFee > 0 && (
            <div className="mt-8 card p-5">
              <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-orange-500" /> Payment Structure
              </h3>
              {!pricing ? (
                <p className="text-sm text-navy-400">Loading fee breakdown…</p>
              ) : (
                <div className="text-sm">
                  <div className="flex items-baseline justify-between py-1.5">
                    <span className="text-navy-500">{pricing.isEarlyBird ? 'Early-Bird Course Fee' : 'Course Fee'}</span>
                    <span className="font-semibold text-navy-800 flex items-baseline gap-2">
                      {pricing.isEarlyBird && pricing.originalFee > pricing.baseAmount && (
                        <span className="text-xs text-navy-400 line-through">{formatMoney(pricing.originalFee)}</span>
                      )}
                      {formatMoney(pricing.baseAmount)}
                    </span>
                  </div>
                  {pricing.isEarlyBird && (
                    <p className="text-xs text-green-600 -mt-1 mb-1">🎉 Early-bird pricing applied — offer ends {formatDate(internship.earlyBirdDeadline)}</p>
                  )}

                  {pricing.discountAmount > 0 && (
                    <div className="flex items-baseline justify-between py-1.5">
                      <span className="text-navy-500">Coupon Discount {couponCode ? `(${couponCode.trim().toUpperCase()})` : ''}</span>
                      <span className="font-semibold text-green-600">− {formatMoney(pricing.discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between py-1.5">
                    <span className="text-navy-500">GST {gstPercentage > 0 ? `(${gstPercentage}%)` : ''}</span>
                    <span className="font-semibold text-navy-800">{gstPercentage > 0 ? formatMoney(pricing.taxAmount) : 'Not applicable'}</span>
                  </div>

                  <div className="border-t border-navy-100 mt-2 pt-2 flex items-baseline justify-between">
                    <span className="font-bold text-navy-900">Total Payable</span>
                    <span className="text-xl font-extrabold text-navy-900">{formatMoney(pricing.totalAmount)}</span>
                  </div>

                  {installmentRows && (
                    <div className="mt-4 pt-4 border-t border-dashed border-navy-100">
                      <p className="text-xs font-bold text-navy-500 mb-2">Split into {payPlan} installments</p>
                      <div className="space-y-1.5">
                        {installmentRows.map((row) => (
                          <div key={row.index} className="flex items-center justify-between text-xs bg-navy-50 rounded-lg px-3 py-2">
                            <span className="font-semibold text-navy-700">
                              Installment {row.index}{row.index === 1 ? ' (due now)' : ` (due ~${formatDate(row.dueDate)})`}
                            </span>
                            <span className="font-bold text-navy-900">{formatMoney(row.amount)}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-navy-400 mt-2">
                        Later installments are collected online (from Payment History) or by ASK IT Technologies — no extra fee for splitting.
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-navy-400 mt-3">
                    All fees are in Indian Rupees (₹) and inclusive of applicable taxes as shown above. This is the exact amount charged at checkout — no hidden charges.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card p-6 h-fit sticky top-24">
          <ul className="space-y-4 text-sm">
            <li className="flex items-center gap-3"><Calendar className="w-4 h-4 text-orange-500" /> Starts {formatDate(internship.startDate)}</li>
            <li className="flex items-center gap-3"><Calendar className="w-4 h-4 text-orange-500" /> Ends {formatDate(internship.endDate)}</li>
            <li className="flex items-center gap-3"><Clock className="w-4 h-4 text-orange-500" /> Duration: {internship.duration}</li>
            <li className="flex items-center gap-3"><MapPin className="w-4 h-4 text-orange-500" /> Mode: {internship.mode}</li>
            <li className="flex items-center gap-3"><Users className="w-4 h-4 text-orange-500" /> {Math.max(internship.totalSeats - internship.seatsFilled, 0)} of {internship.totalSeats} seats left</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Apply before {formatDate(internship.registrationDeadline)}</li>
          </ul>

          <div className="mt-5 pt-5 border-t border-navy-100">
            {effectiveFee > 0 ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-navy-500">Total Payable {gstPercentage > 0 ? '(incl. GST)' : ''}</span>
                  <span className="text-2xl font-extrabold text-navy-900">{formatMoney(displayTotal)}</span>
                </div>
                {pricing && pricing.discountAmount > 0 && (
                  <p className="text-xs text-green-600 font-semibold mt-1">Coupon saved you {formatMoney(pricing.discountAmount)}</p>
                )}

                <div className="mt-4 flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="input-field pl-9 !py-2 text-sm"
                    />
                  </div>
                  {pricing?.couponId ? (
                    <Button variant="outline" className="!py-2 text-xs shrink-0" onClick={clearCoupon}>Remove</Button>
                  ) : (
                    <Button variant="outline" className="!py-2 text-xs shrink-0" isLoading={isCheckingCoupon} onClick={applyCoupon}>Apply</Button>
                  )}
                </div>
                {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}

                <div className="mt-5">
                  <p className="text-xs font-bold text-navy-500 mb-2">Pay Via</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayVia('ONLINE')}
                      className={`py-2.5 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        payVia === 'ONLINE' ? 'bg-navy-700 border-navy-700 text-white' : 'border-navy-200 text-navy-500 hover:border-navy-300'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Card / UPI / Netbanking
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayVia('MANUAL')}
                      className={`py-2.5 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        payVia === 'MANUAL' ? 'bg-navy-700 border-navy-700 text-white' : 'border-navy-200 text-navy-500 hover:border-navy-300'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" /> UPI QR / Bank Transfer
                    </button>
                  </div>
                  {payVia === 'MANUAL' && (
                    <p className="text-xs text-navy-500 mt-2">
                      You'll be shown a UPI QR code and bank details to pay directly — your registration is confirmed right away, and an admin verifies the payment once you submit your transaction reference.
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <p className="text-xs font-bold text-navy-500 mb-2">Payment Option</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([1, 2, 3] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPayPlan(n)}
                        className={`py-2 px-2 rounded-lg text-xs font-bold border transition ${
                          payPlan === n ? 'bg-orange-500 border-orange-500 text-white' : 'border-navy-200 text-navy-500 hover:border-orange-300'
                        }`}
                      >
                        {n === 1 ? 'Pay in Full' : `${n} Installments`}
                      </button>
                    ))}
                  </div>
                  {payPlan > 1 && pricing && (
                    <p className="text-xs text-navy-500 mt-2">
                      Pay {formatMoney(displayTotal / payPlan)} now, and the rest in {payPlan - 1} more installment{payPlan > 2 ? 's' : ''} — see the full breakdown on the left.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-lg font-extrabold text-green-600">Free Enrollment</p>
            )}
          </div>

          <Button className="w-full mt-6" onClick={handleRegister} isLoading={isProcessing} disabled={internship.status !== 'OPEN'}>
            {internship.status !== 'OPEN'
              ? 'Registrations Closed'
              : effectiveFee > 0
              ? payVia === 'MANUAL'
                ? 'Register & Show UPI/Bank Details'
                : payPlan > 1
                ? `Pay ${formatMoney(displayTotal / payPlan)} & Register`
                : `Pay ${formatMoney(displayTotal)} & Register`
              : 'Register Now'}
          </Button>
          <p className="text-xs text-navy-400 mt-3 flex items-center gap-1.5 justify-center">
            <ShieldCheck className="w-3.5 h-3.5" />
            {payVia === 'MANUAL' ? "You'll get a UPI QR code and bank details on the next step" : 'Secure payments powered by Razorpay — Card, UPI, Netbanking & more'}
          </p>
        </div>
      </div>

      <ManualPaymentModal
        isOpen={!!manualPayment}
        onClose={() => { setManualPayment(null); navigate('/payment-history'); }}
        amountDue={manualPayment?.amountDue || 0}
        paymentId={manualPayment?.paymentId || ''}
        accounts={manualPayment?.manualAccounts || []}
      />
    </section>
  );
}
