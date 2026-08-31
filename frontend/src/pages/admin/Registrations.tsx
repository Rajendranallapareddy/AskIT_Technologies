import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDate } from '../../utils/formatters';
import DataTable, { Column } from '../../components/admin/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';

export default function AdminRegistrations() {
  const links = useAdminLinks();
  const [params] = useSearchParams();
  const internshipId = params.get('internshipId');
  const [internships, setInternships] = useState<any[]>([]);
  const [selected, setSelected] = useState(internshipId || '');
  const [registrations, setRegistrations] = useState<any[] | null>(null);
  const toast = useToast();

  useEffect(() => {
    adminApi.internships({ limit: 100 }).then((res) => {
      setInternships(res.data.data);
      if (!selected && res.data.data.length) setSelected(res.data.data[0].id);
    }).catch((err) => {
      setInternships([]);
      toast.error(getErrorMessage(err));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = () => {
    if (!selected) return;
    setRegistrations(null);
    adminApi.registrations(selected, { limit: 100 }).then((res) => setRegistrations(res.data.data)).catch((err) => { setRegistrations([]); toast.error(getErrorMessage(err)); });
  };
  useEffect(load, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (id: string) => {
    try { await adminApi.approveRegistration(id); toast.success('Approved'); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };
  const handleReject = async (id: string) => {
    try { await adminApi.rejectRegistration(id); toast.success('Rejected'); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };
  const handleRemove = async (r: any) => {
    if (!confirm(`Remove ${r.user.fullName}'s registration entirely? This unregisters them from the internship.`)) return;
    try { await adminApi.removeRegistration(r.id); toast.success('Registration removed'); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const columns: Column<any>[] = [
    { header: 'Student', render: (r) => <span className="font-semibold text-navy-800">{r.user.fullName}</span> },
    { header: 'Email', render: (r) => r.user.email },
    { header: 'Applied', render: (r) => formatDate(r.appliedAt) },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { header: 'Actions', render: (r) => (
      <div className="flex items-center gap-2">
        {r.status === 'PENDING' && (
          <>
            <button onClick={() => handleApprove(r.id)} className="text-green-600 hover:text-green-800" title="Approve"><Check className="w-4 h-4" /></button>
            <button onClick={() => handleReject(r.id)} className="text-red-500 hover:text-red-700" title="Reject"><X className="w-4 h-4" /></button>
          </>
        )}
        <button onClick={() => handleRemove(r)} className="text-navy-400 hover:text-red-600" title="Remove registration entirely"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Registrations">
      <div className="mb-5">
        {internships.length === 0 ? null : (
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="input-field max-w-md">
            {internships.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
          </select>
        )}
      </div>
      {internships.length === 0 ? (
        <EmptyState title="No internships to manage yet" />
      ) : (
        <DataTable columns={columns} rows={registrations} keyField={(r) => r.id} emptyTitle="No registrations for this internship" />
      )}
    </DashboardLayout>
  );
}
