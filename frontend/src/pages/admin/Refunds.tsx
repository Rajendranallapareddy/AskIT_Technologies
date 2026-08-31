import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminPaymentApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDateTime, formatMoney } from '../../utils/formatters';
import DataTable, { Column } from '../../components/admin/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import FilterPanel from '../../components/common/FilterPanel';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

export default function AdminRefunds() {
  const links = useAdminLinks();
  const [refunds, setRefunds] = useState<any[] | null>(null);
  const [status, setStatus] = useState('');
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const toast = useToast();

  const load = () => {
    setRefunds(null);
    adminPaymentApi.refunds({ status: status || undefined }).then((res) => setRefunds(res.data.data)).catch((err) => { setRefunds([]); toast.error(getErrorMessage(err)); });
  };
  useEffect(load, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (id: string) => {
    if (!confirm('Approve and process this refund at the gateway?')) return;
    try {
      await adminPaymentApi.approveRefund(id);
      toast.success('Refund approved and processed');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleReject = async () => {
    try {
      await adminPaymentApi.rejectRefund(rejectTarget.id, rejectReason);
      toast.success('Refund request rejected');
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const columns: Column<any>[] = [
    { header: 'Refund No.', render: (r) => <span className="font-mono text-xs">{r.refundNo}</span> },
    { header: 'Student', render: (r) => r.payment.user.fullName },
    { header: 'Internship', render: (r) => r.payment.internship.title },
    { header: 'Amount', render: (r) => <span className="font-bold">{formatMoney(r.amount)}</span> },
    { header: 'Type', render: (r) => r.type },
    { header: 'Reason', className: 'max-w-xs', render: (r) => <span className="line-clamp-2 text-xs">{r.reason}</span> },
    { header: 'Requested', render: (r) => formatDateTime(r.createdAt) },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { header: 'Actions', render: (r) => r.status === 'REQUESTED' ? (
      <div className="flex items-center gap-2">
        <button onClick={() => handleApprove(r.id)} className="text-green-600 hover:text-green-800" title="Approve"><Check className="w-4 h-4" /></button>
        <button onClick={() => setRejectTarget(r)} className="text-red-500 hover:text-red-700" title="Reject"><X className="w-4 h-4" /></button>
      </div>
    ) : null },
  ];

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Refund Management">
      <div className="mb-5">
        <FilterPanel value={status} onChange={setStatus} options={[
          { label: 'All', value: '' }, { label: 'Requested', value: 'REQUESTED' },
          { label: 'Processed', value: 'PROCESSED' }, { label: 'Rejected', value: 'REJECTED' },
        ]} />
      </div>
      <DataTable columns={columns} rows={refunds} keyField={(r) => r.id} emptyTitle="No refund requests" />

      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Refund Request">
        <div className="space-y-4">
          <div><label className="label">Reason (optional)</label><textarea rows={3} className="input-field" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></div>
          <Button variant="outline" className="w-full" onClick={handleReject}>Reject Request</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
