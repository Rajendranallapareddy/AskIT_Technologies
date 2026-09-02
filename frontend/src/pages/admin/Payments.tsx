import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download, TrendingUp, CheckCircle2, XCircle, Clock, Plus, ShieldCheck,
  MoreVertical, Receipt, CalendarClock, ThumbsUp, ThumbsDown, Layers, X, Filter,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi, adminPaymentApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage, classNames } from '../../utils/helpers';
import { formatDateTime, formatMoney } from '../../utils/formatters';
import DataTable, { Column } from '../../components/admin/DataTable';
import StatsCard from '../../components/admin/StatsCard';
import StatusBadge from '../../components/common/StatusBadge';
import SearchBar from '../../components/common/SearchBar';
import Pagination from '../../components/common/Pagination';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { getImageUrl } from '../../utils/imageUrl';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Success', value: 'SUCCESS' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

export default function AdminPayments() {
  const links = useAdminLinks();
  const [payments, setPayments] = useState<any[] | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [internships, setInternships] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [internshipId, setInternshipId] = useState('');
  const [installmentsOnly, setInstallmentsOnly] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState<any>(null);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [dueDateTarget, setDueDateTarget] = useState<any>(null);
  const [studentDrawerId, setStudentDrawerId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    adminPaymentApi.analytics().then((res) => setAnalytics(res.data.data)).catch(() => {});
    adminApi.internships({ limit: 100 }).then((res) => setInternships(res.data.data)).catch(() => {});
  }, []);

  const load = () => {
    setPayments(null);
    adminPaymentApi
      .list({
        search: search || undefined,
        status: status || undefined,
        method: method || undefined,
        internshipId: internshipId || undefined,
        installmentsOnly: installmentsOnly ? 'true' : undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: 15,
      })
      .then((res) => {
        setPayments(res.data.data);
        setTotalPages(res.data.meta?.totalPages || 1);
        setTotal(res.data.meta?.total || res.data.data.length);
      })
      .catch((err) => {
        setPayments([]);
        toast.error(getErrorMessage(err));
      });
  };
  useEffect(() => {
    const timer = setTimeout(load, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, method, internshipId, installmentsOnly, from, to, page]);

  const activeExtraFilterCount = [method, internshipId, from, to].filter(Boolean).length + (installmentsOnly ? 1 : 0);

  const clearExtraFilters = () => {
    setMethod(''); setInternshipId(''); setFrom(''); setTo(''); setInstallmentsOnly(false); setPage(1);
  };

  const handleExport = (format: 'csv' | 'excel') => {
    const url = adminPaymentApi.exportUrl({ format, ...(status ? { status } : {}) });
    window.open(url, '_blank');
  };

  const handleResend = async (id: string) => {
    try { const res = await adminPaymentApi.resendReceipt(id); toast.success(res.data.message || 'Receipt sent'); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      const res = await adminPaymentApi.approve(id);
      toast.success(res.data.message || 'Payment approved');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setApprovingId(null); setOpenMenuId(null); }
  };

  const statusCounts: Record<string, number> = useMemo(() => ({
    SUCCESS: analytics?.successCount ?? 0,
    PENDING: analytics?.pendingCount ?? 0,
    PENDING_APPROVAL: analytics?.pendingApprovalCount ?? 0,
    FAILED: analytics?.failedCount ?? 0,
    REFUNDED: analytics?.refundedCount ?? 0,
  }), [analytics]);

  const columns: Column<any>[] = [
    { header: 'Payment', render: (p) => (
      <div>
        <p className="font-mono text-xs text-navy-500">{p.paymentNo}</p>
        <p className="font-bold text-navy-900 mt-0.5">{formatMoney(p.totalAmount)}</p>
      </div>
    ) },
    { header: 'Student', render: (p) => (
      <button
        onClick={(e) => { e.stopPropagation(); setStudentDrawerId(p.userId); }}
        className="text-left hover:text-orange-600 transition group"
      >
        <p className="font-semibold text-navy-800 group-hover:text-orange-600">{p.user.fullName}</p>
        <p className="text-xs text-navy-400">{p.user.email}</p>
      </button>
    ) },
    { header: 'Internship', render: (p) => (
      <div>
        <p className="text-navy-800">{p.internship.title}</p>
        {p.installmentPlanId && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mt-1">
            <Layers className="w-2.5 h-2.5" /> Installment {p.installmentIndex}
          </span>
        )}
      </div>
    ) },
    { header: 'Method', render: (p) => <span className="text-navy-600">{p.method || '—'}</span> },
    { header: 'Due Date', render: (p) => <span className="text-navy-600">{p.dueDate ? formatDateTime(p.dueDate).split(',')[0] : '—'}</span> },
    { header: 'Status', render: (p) => (
      <div className="flex flex-col gap-1 items-start">
        <StatusBadge status={p.status} />
        {p.studentReference && (
          <span className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded" title={`Reference: ${p.studentReference}`}>
            Ref: {p.studentReference}
          </span>
        )}
      </div>
    ) },
    { header: 'Date', render: (p) => <span className="text-navy-500 text-xs">{formatDateTime(p.createdAt)}</span> },
    { header: '', className: 'text-right', render: (p) => (
      <PaymentActionsMenu
        payment={p}
        isOpen={openMenuId === p.id}
        onToggle={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
        onClose={() => setOpenMenuId(null)}
        approving={approvingId === p.id}
        onResend={() => handleResend(p.id)}
        onApprove={() => handleApprove(p.id)}
        onReject={() => { setRejectTarget(p); setOpenMenuId(null); }}
        onMarkPaid={() => { setSettleTarget(p); setOpenMenuId(null); }}
        onSetDueDate={() => { setDueDateTarget(p); setOpenMenuId(null); }}
        onViewStudent={() => { setStudentDrawerId(p.userId); setOpenMenuId(null); }}
      />
    ) },
  ];

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Payments">
      <div className="h-[calc(100vh-110px)] overflow-y-auto overflow-x-hidden pr-1 pb-32">
        {analytics && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mb-6">
            <StatsCard icon={TrendingUp}
  label="Total Revenue"
  value={formatMoney(
    analytics.totalRevenue
  )}
  accent="green"
/>

<StatsCard
  icon={CheckCircle2}
  label="Successful"
  value={
    analytics.successCount
  }
  accent="navy"
/>

<StatsCard
  icon={ShieldCheck}
  label="Awaiting Approval"
  value={
    analytics.pendingApprovalCount ??
    0
  }
  accent="orange"
/>

<StatsCard
  icon={XCircle}
  label="Failed"
  value={
    analytics.failedCount
  }
  accent="red"
/>

<StatsCard
  icon={Clock}
  label="Pending"
  value={
    analytics.pendingCount
  }
  accent="orange"
/>
          </div>
        )}

        <div className="flex items-center gap-1 mb-4 border-b border-navy-100 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setPage(1); setStatus(tab.value); }}
              className={classNames(
                'px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition -mb-px',
                status === tab.value ? 'border-orange-500 text-navy-900' : 'border-transparent text-navy-400 hover:text-navy-600'
              )}
            >
              {tab.label}
              {tab.value && statusCounts[tab.value] !== undefined && (
                <span className={classNames('ml-1.5 text-xs px-1.5 py-0.5 rounded-full', status === tab.value ? 'bg-orange-100 text-orange-700' : 'bg-navy-50 text-navy-400')}>
                  {statusCounts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-3">
          <div className="flex flex-1 gap-3 w-full">
            <SearchBar value={search} onChange={(v) => { setPage(1); setSearch(v); }} placeholder="Search by name, email, payment no…" />
            <button
              onClick={() => setMoreFiltersOpen((v) => !v)}
              className={classNames(
                'shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition',
                activeExtraFilterCount > 0 ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-navy-200 text-navy-600 hover:bg-navy-50'
              )}
            >
              <Filter className="w-4 h-4" /> Filters
              {activeExtraFilterCount > 0 && <span className="bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{activeExtraFilterCount}</span>}
            </button>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" className="!py-2 text-xs" icon={<Download className="w-3.5 h-3.5" />} onClick={() => handleExport('csv')}>CSV</Button>
            <Button variant="outline" className="!py-2 text-xs" icon={<Download className="w-3.5 h-3.5" />} onClick={() => handleExport('excel')}>Excel</Button>
            <Button className="!py-2 text-xs" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setOfflineOpen(true)}>Record Offline</Button>
          </div>
        </div>

        {moreFiltersOpen && (
          <div className="card p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="label">Method</label>
              <select className="input-field" value={method} onChange={(e) => { setPage(1); setMethod(e.target.value); }}>
                <option value="">Any</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="NETBANKING">Netbanking</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OFFLINE">Offline / Cash</option>
              </select>
            </div>
            <div>
              <label className="label">Internship</label>
              <select className="input-field" value={internshipId} onChange={(e) => { setPage(1); setInternshipId(e.target.value); }}>
                <option value="">All internships</option>
                {internships.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">From</label>
              <input type="date" className="input-field" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" className="input-field" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-navy-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" checked={installmentsOnly} onChange={(e) => { setPage(1); setInstallmentsOnly(e.target.checked); }} />
                Installments only
              </label>
              {activeExtraFilterCount > 0 && (
                <button onClick={clearExtraFilters} className="text-xs font-semibold text-navy-400 hover:text-red-500 flex items-center gap-1 ml-auto">
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-navy-400 mb-2">{payments ? `${total} payment${total === 1 ? '' : 's'} found` : 'Loading…'}</p>

        <div className="relative overflow-visible pb-40">
          <DataTable columns={columns} rows={payments} keyField={(p) => p.id} emptyTitle="No payments found" />
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <OfflinePaymentModal isOpen={offlineOpen} onClose={() => setOfflineOpen(false)} onSuccess={load} />
      <SettlePaymentModal payment={settleTarget} onClose={() => setSettleTarget(null)} onSuccess={load} />
      <RejectPaymentModal payment={rejectTarget} onClose={() => setRejectTarget(null)} onSuccess={load} />
      <DueDateModal payment={dueDateTarget} onClose={() => setDueDateTarget(null)} onSuccess={load} />
      <StudentPaymentDrawer userId={studentDrawerId} onClose={() => setStudentDrawerId(null)} onChanged={load} />
    </DashboardLayout>
  );

}

// Compact per-row action menu (kebab button + dropdown) — replaces a row
// of stacked text links that used to wrap onto multiple lines and clash
// with the installment badge above it.
function PaymentActionsMenu({
  payment, isOpen, onToggle, onClose, approving,
  onResend, onApprove, onReject, onMarkPaid, onSetDueDate, onViewStudent,
}: {
  payment: any; isOpen: boolean; onToggle: () => void; onClose: () => void; approving: boolean;
  onResend: () => void; onApprove: () => void; onReject: () => void; onMarkPaid: () => void; onSetDueDate: () => void; onViewStudent: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const hasActions =
    (payment.status === 'SUCCESS' && payment.receipt) ||
    payment.status === 'PENDING_APPROVAL' ||
    payment.status === 'PENDING' ||
    payment.status === 'FAILED' ||
    (payment.installmentPlanId && payment.status !== 'SUCCESS');

  const updateMenuPosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 208;
    const menuHeight = 210;
    const spacing = 6;

    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;

    const spaceBelow = window.innerHeight - rect.bottom;
    let top = spaceBelow >= menuHeight ? rect.bottom + spacing : rect.top - menuHeight - spacing;
    if (top < 8) top = 8;

    setMenuPosition({ top, left });
  };

  const handleToggle = () => {
    if (!isOpen) updateMenuPosition();
    onToggle();
  };

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();
    const handleWindowChange = () => updateMenuPosition();

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [isOpen]);

  return (
    <div className="inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="p-2 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-navy-700"
        aria-label="Payment actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={onClose} />
          <div
            className="fixed w-52 bg-white rounded-xl shadow-2xl border border-navy-100 py-1.5 z-[9999]"
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
          >
            <button onClick={onViewStudent} className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-navy-600 hover:bg-navy-50 flex items-center gap-2">
              View Student History
            </button>

            {payment.status === 'SUCCESS' && payment.receipt && (
              <button onClick={onResend} className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5" /> Resend Receipt
              </button>
            )}

            {payment.status === 'PENDING_APPROVAL' && (
              <>
                <button onClick={onApprove} disabled={approving} className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-green-600 hover:bg-green-50 flex items-center gap-2 disabled:opacity-50">
                  <ThumbsUp className="w-3.5 h-3.5" /> {approving ? 'Approving…' : 'Approve'}
                </button>
                <button onClick={onReject} className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <ThumbsDown className="w-3.5 h-3.5" /> Reject
                </button>
              </>
            )}

            {(payment.status === 'PENDING' || payment.status === 'FAILED') && (
              <button onClick={onMarkPaid} className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-green-600 hover:bg-green-50 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
              </button>
            )}

            {payment.installmentPlanId && payment.status !== 'SUCCESS' && (
              <button onClick={onSetDueDate} className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-navy-600 hover:bg-navy-50 flex items-center gap-2">
                <CalendarClock className="w-3.5 h-3.5" /> Set Due Date
              </button>
            )}

            {!hasActions && <p className="px-3.5 py-2.5 text-xs text-navy-300">No actions available</p>}
          </div>
        </>
      )}
    </div>
  );
}


// Super Admin's rejection path for a PENDING_APPROVAL payment — records a
// reason the student can see, marks the payment FAILED, and leaves the
// registration untouched so the student can simply retry.
function RejectPaymentModal({ payment, onClose, onSuccess }: { payment: any; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!payment) return;
    if (!reason.trim()) return toast.error('Please provide a reason for the student');
    setIsSaving(true);
    try {
      const res = await adminPaymentApi.reject(payment.id, reason.trim());
      toast.success(res.data.message || 'Payment rejected');
      onSuccess();
      onClose();
      setReason('');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSaving(false); }
  };

  return (
    <Modal isOpen={!!payment} onClose={onClose} title="Reject Payment">
      <div className="space-y-4">
        {payment && (
          <div className="bg-navy-50 rounded-lg p-3 text-sm">
            <p className="font-bold text-navy-900">{payment.user?.fullName} — {payment.internship?.title}</p>
            <p className="text-xs text-navy-500 font-mono mt-1">{payment.paymentNo}</p>
            <p className="text-lg font-extrabold text-navy-900 mt-1">{formatMoney(payment.totalAmount)}</p>
            {payment.studentReference && (
              <p className="text-xs text-navy-600 mt-2 pt-2 border-t border-navy-100">
                Student-submitted reference: <span className="font-mono font-bold text-navy-900">{payment.studentReference}</span>
              </p>
            )}
          </div>
        )}
        <div>
          <label className="label">Reason (shown to the student)</label>
          <textarea rows={3} className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Reference number doesn't match any transaction in our account" />
        </div>
        <Button className="w-full !bg-red-600 hover:!bg-red-700" isLoading={isSaving} onClick={handleSubmit}>Reject Payment</Button>
      </div>
    </Modal>
  );
}

// Lets a Super Admin/Admin set or move an installment's due date, instead
// of it only ever being the automatic 30-days-apart default — e.g. to
// line it up with a batch's real schedule or give a student more time.
function DueDateModal({ payment, onClose, onSuccess }: { payment: any; onClose: () => void; onSuccess: () => void }) {
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (payment?.dueDate) setDueDate(new Date(payment.dueDate).toISOString().slice(0, 10));
  }, [payment]);

  const handleSubmit = async () => {
    if (!payment) return;
    if (!dueDate) return toast.error('Please pick a due date');
    setIsSaving(true);
    try {
      const res = await adminPaymentApi.updateDueDate(payment.id, dueDate);
      toast.success(res.data.message || 'Due date updated');
      onSuccess();
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSaving(false); }
  };

  return (
    <Modal isOpen={!!payment} onClose={onClose} title="Set Installment Due Date">
      <div className="space-y-4">
        {payment && (
          <div className="bg-navy-50 rounded-lg p-3 text-sm">
            <p className="font-bold text-navy-900">{payment.user?.fullName} — {payment.internship?.title}</p>
            <p className="text-xs text-navy-500 font-mono mt-1">{payment.paymentNo}</p>
            {payment.installmentPlanId && <p className="text-xs text-orange-600 font-bold mt-1">Installment {payment.installmentIndex}</p>}
            <p className="text-lg font-extrabold text-navy-900 mt-1">{formatMoney(payment.totalAmount)}</p>
          </div>
        )}
        <div>
          <label className="label">Due Date</label>
          <input type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <Button className="w-full" isLoading={isSaving} onClick={handleSubmit}>Save Due Date</Button>
      </div>
    </Modal>
  );
}

// Lets an admin mark an existing PENDING (or FAILED) payment — typically an
// installment, or a "pay later" registration that was created while online
// payment was unavailable — as collected, without having to re-enter the
// student/internship/amount by hand. Reuses adminPaymentApi.settlePending,
// which resolves those fields from the payment record itself.
function SettlePaymentModal({ payment, onClose, onSuccess }: { payment: any; onClose: () => void; onSuccess: () => void }) {
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!payment) return;
    setIsSaving(true);
    try {
      const res = await adminPaymentApi.settlePending(payment.id, { method, notes });
      toast.success(res.data.message || 'Payment marked as paid');
      onSuccess();
      onClose();
      setNotes('');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSaving(false); }
  };

  return (
    <Modal isOpen={!!payment} onClose={onClose} title="Mark Payment as Paid">
      <div className="space-y-4">
        {payment && (
          <div className="bg-navy-50 rounded-lg p-3 text-sm">
            <p className="font-bold text-navy-900">{payment.user?.fullName} — {payment.internship?.title}</p>
            <p className="text-xs text-navy-500 font-mono mt-1">{payment.paymentNo}</p>
            <p className="text-lg font-extrabold text-navy-900 mt-1">{formatMoney(payment.totalAmount)}</p>
            {payment.installmentPlanId && <p className="text-xs text-orange-600 font-bold mt-1">Installment {payment.installmentIndex}</p>}
            {payment.studentReference && (
              <p className="text-xs text-navy-600 mt-2 pt-2 border-t border-navy-100">
                Student-submitted reference: <span className="font-mono font-bold text-navy-900">{payment.studentReference}</span>
              </p>
            )}
          </div>
        )}
        <div>
          <label className="label">Method</label>
          <select className="input-field" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="OFFLINE">Cash</option>
            <option value="UPI">UPI (manual)</option>
          </select>
        </div>
        <div><label className="label">Notes</label><input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <Button className="w-full" isLoading={isSaving} onClick={handleSubmit}>Confirm & Mark Paid</Button>
      </div>
    </Modal>
  );
}

function OfflinePaymentModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ userId: '', internshipId: '', amount: '', method: 'BANK_TRANSFER', notes: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [internships, setInternships] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  const toast = useToast();

  // Load the internship dropdown once, when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    adminApi.internships({ limit: 100 }).then((res) => setInternships(res.data.data)).catch(() => setInternships([]));
  }, [isOpen]);

  // Live-search students by name/email as the admin types — this is what
  // replaces the old "paste a raw user ID" field, which had no way to look
  // the ID up anywhere in the UI.
  useEffect(() => {
    if (!studentSearch.trim()) { setStudentResults([]); return; }
    setIsSearchingStudents(true);
    const timer = setTimeout(() => {
      adminApi.users({ search: studentSearch, role: 'USER', limit: 8 })
        .then((res) => setStudentResults(res.data.data))
        .catch(() => setStudentResults([]))
        .finally(() => setIsSearchingStudents(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  const pickStudent = (student: any) => {
    setSelectedStudent(student);
    setForm({ ...form, userId: student.id });
    setStudentSearch(`${student.fullName} (${student.email})`);
    setStudentResults([]);
  };

  const handleSubmit = async () => {
    if (!form.userId) return toast.error('Please select a student from the search results');
    if (!form.internshipId) return toast.error('Please select an internship');
    setIsSaving(true);
    try {
      const res = await adminPaymentApi.recordOffline({ ...form, amount: Number(form.amount) });
      toast.success(res.data.message || 'Offline payment recorded and registration confirmed');
      onSuccess();
      onClose();
      setForm({ userId: '', internshipId: '', amount: '', method: 'BANK_TRANSFER', notes: '' });
      setSelectedStudent(null);
      setStudentSearch('');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Offline Payment">
      <div className="space-y-4">
        <p className="text-xs text-navy-500">For cash or direct bank transfers collected outside the gateway. This immediately confirms the student's registration.</p>

        <div className="relative">
          <label className="label">Student</label>
          <input
            className="input-field"
            value={studentSearch}
            onChange={(e) => { setStudentSearch(e.target.value); setSelectedStudent(null); setForm({ ...form, userId: '' }); }}
            placeholder="Type a name or email to search…"
          />
          {isSearchingStudents && <p className="text-xs text-navy-400 mt-1">Searching…</p>}
          {studentResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-navy-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {studentResults.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickStudent(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-navy-50 border-b border-navy-50 last:border-0"
                >
                  <p className="font-semibold text-navy-800">{s.fullName}</p>
                  <p className="text-xs text-navy-400">{s.email}</p>
                </button>
              ))}
            </div>
          )}
          {selectedStudent && <p className="text-xs text-green-600 font-semibold mt-1">✓ Selected: {selectedStudent.fullName}</p>}
        </div>

        <div>
          <label className="label">Internship</label>
          <select className="input-field" value={form.internshipId} onChange={(e) => setForm({ ...form, internshipId: e.target.value })}>
            <option value="">Select internship…</option>
            {internships.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
          </select>
        </div>

        <div><label className="label">Amount (₹)</label><input type="number" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        <div>
          <label className="label">Method</label>
          <select className="input-field" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="OFFLINE">Cash</option>
            <option value="UPI">UPI (manual)</option>
          </select>
        </div>
        <div><label className="label">Notes</label><input className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <Button className="w-full" isLoading={isSaving} onClick={handleSubmit} disabled={!form.userId || !form.internshipId || !form.amount}>Confirm & Record Payment</Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// STUDENT PAYMENT DRAWER — a slide-over panel showing one student's
// complete payment picture: every registration, every installment plan's
// progress, the full flat payment history, and their recent payment
// notifications — so a Super Admin can review a student without piecing
// it together from separate table rows.
// ---------------------------------------------------------------------------
function StudentPaymentDrawer({ userId, onClose, onChanged }: { userId: string | null; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    if (!userId) { setData(null); return; }
    adminPaymentApi.studentHistory(userId).then((res) => setData(res.data.data)).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-navy-50 w-full max-w-2xl h-full overflow-y-auto shadow-2xl animate-fade-up">
        <div className="sticky top-0 bg-white border-b border-navy-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="font-bold text-lg text-navy-900">Student Payment History</h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700"><X className="w-5 h-5" /></button>
        </div>

        {!data ? (
          <div className="p-10 text-center text-navy-400 text-sm">Loading…</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Profile header */}
            <div className="card p-5 flex items-center gap-4">
              <span className="w-14 h-14 rounded-full bg-navy-700 text-white font-bold flex items-center justify-center text-lg overflow-hidden shrink-0">
                {data.student.profilePicture ? (
                <img
                  src={getImageUrl(data.student.profilePicture) ?? undefined}
                  alt={data.student.fullName}
                  className="w-full h-full object-cover"
                />
                ) : (
                data.student.fullName
                .split(' ')
                .map((w: string) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()
              )}
            </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-navy-900">{data.student.fullName}</p>
                <p className="text-xs text-navy-500">{data.student.email}</p>
                <p className="text-xs text-navy-400">{data.student.mobileNumber}</p>
              </div>
              <p className="text-xs text-navy-400">Joined {formatDateTime(data.student.createdAt).split(',')[0]}</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryTile label="Total Paid" value={formatMoney(data.summary.totalPaid)} accent="green" />
              <SummaryTile label="Total Due" value={formatMoney(data.summary.totalDue)} accent="orange" />
              <SummaryTile label="Payments" value={data.summary.paymentCount} accent="navy" />
              <SummaryTile label="Registrations" value={data.summary.registrationCount} accent="navy" />
            </div>

            {/* Installment plans */}
            {data.plans.length > 0 && (
              <div>
                <p className="text-xs font-bold text-navy-500 uppercase tracking-wide mb-2">Installment Plans</p>
                <div className="space-y-3">
                  {data.plans.map((plan: any) => {
                    const planPayments = data.payments.filter((p: any) => p.installmentPlanId === plan.id);
                    const paid = planPayments.filter((p: any) => p.status === 'SUCCESS').reduce((s: number, p: any) => s + Number(p.totalAmount), 0);
                    const pct = Math.round((paid / Number(plan.totalAmount)) * 100);
                    return (
                      <div key={plan.id} className="card p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-navy-800 text-sm">{plan.registration?.internship?.title}</p>
                          <span className={classNames('text-[10px] font-bold px-2 py-0.5 rounded-full', plan.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
                            {plan.status}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-navy-100 rounded-full mt-2.5 overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <p className="text-xs text-navy-500 mt-1.5">{formatMoney(paid)} of {formatMoney(plan.totalAmount)} paid ({pct}%) — {plan.numberOfInstallments} installments</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full payment history */}
            <div>
              <p className="text-xs font-bold text-navy-500 uppercase tracking-wide mb-2">All Payments ({data.payments.length})</p>
              <div className="card divide-y divide-navy-50">
                {data.payments.length === 0 && <p className="p-4 text-sm text-navy-400">No payments yet.</p>}
                {data.payments.map((p: any) => (
                  <div key={p.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-800 truncate">{p.internship.title}</p>
                      <p className="text-xs text-navy-400 font-mono">{p.paymentNo} {p.installmentPlanId ? `· Inst. ${p.installmentIndex}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-navy-900 text-sm">{formatMoney(p.totalAmount)}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent payment notifications */}
            {data.notifications.length > 0 && (
              <div>
                <p className="text-xs font-bold text-navy-500 uppercase tracking-wide mb-2">Recent Payment Notifications</p>
                <div className="card divide-y divide-navy-50">
                  {data.notifications.map((n: any) => (
                    <div key={n.id} className="p-3.5">
                      <p className="text-sm font-semibold text-navy-800">{n.title}</p>
                      <p className="text-xs text-navy-500 mt-0.5">{n.message}</p>
                      <p className="text-[11px] text-navy-300 mt-1">{formatDateTime(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: string | number; accent: 'green' | 'orange' | 'navy' }) {
  const colors = { green: 'text-green-600', orange: 'text-orange-600', navy: 'text-navy-800' }[accent];
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold text-navy-400 uppercase tracking-wide">{label}</p>
      <p className={classNames('text-lg font-extrabold mt-0.5', colors)}>{value}</p>
    </div>
  );
}