import { useEffect, useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDateTime } from '../../utils/formatters';
import DataTable, { Column } from '../../components/admin/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import FilterPanel from '../../components/common/FilterPanel';

// Opens Gmail's web compose window (not the OS's native mail app) pre-filled
// with the contact's email and a subject referencing their original message
// — this is what "reply in the web" means here, as opposed to a plain
// mailto: link which hands off to whatever desktop app is registered.
function gmailReplyUrl(to: string, subject?: string) {
  const su = encodeURIComponent(subject ? `Re: ${subject}` : 'Re: Your enquiry to ASK IT Technologies');
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${su}`;
}

export default function AdminContacts() {
  const links = useAdminLinks();
  const [contacts, setContacts] = useState<any[] | null>(null);
  const [status, setStatus] = useState('');
  const toast = useToast();

  const load = () => {
    setContacts(null);
    adminApi.contacts({ status: status || undefined }).then((res) => setContacts(res.data.data)).catch((err) => { setContacts([]); toast.error(getErrorMessage(err)); });
  };
  useEffect(load, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkReplied = async (id: string) => {
    try { await adminApi.updateContact(id, 'REPLIED'); toast.success('Marked as replied'); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const columns: Column<any>[] = [
    { header: 'Name', render: (c) => <span className="font-semibold text-navy-800">{c.name}</span> },
    { header: 'Email', render: (c) => (
      <a href={gmailReplyUrl(c.email, c.subject)} target="_blank" rel="noreferrer" className="text-orange-600 hover:underline flex items-center gap-1.5">
        <Mail className="w-3.5 h-3.5 shrink-0" /> {c.email}
      </a>
    )},
    { header: 'Phone', render: (c) => c.phone ? (
      <a href={`tel:${c.phone}`} className="text-navy-700 hover:text-orange-600 flex items-center gap-1.5">
        <Phone className="w-3.5 h-3.5 shrink-0" /> {c.phone}
      </a>
    ) : <span className="text-navy-300">—</span> },
    { header: 'Subject', render: (c) => c.subject || '—' },
    { header: 'Message', className: 'max-w-xs', render: (c) => <span className="line-clamp-2">{c.message}</span> },
    { header: 'Received', render: (c) => formatDateTime(c.createdAt) },
    { header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    { header: 'Actions', render: (c) => c.status === 'NEW' ? (
      <button onClick={() => handleMarkReplied(c.id)} className="text-orange-600 text-xs font-bold hover:underline">Mark Replied</button>
    ) : null },
  ];

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Contact Requests">
      <div className="mb-5">
        <FilterPanel value={status} onChange={setStatus} options={[{ label: 'All', value: '' }, { label: 'New', value: 'NEW' }, { label: 'Replied', value: 'REPLIED' }, { label: 'Archived', value: 'ARCHIVED' }]} />
      </div>
      <DataTable columns={columns} rows={contacts} keyField={(c) => c.id} emptyTitle="No contact requests" />
    </DashboardLayout>
  );
}
