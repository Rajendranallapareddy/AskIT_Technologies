import { useEffect, useState } from 'react';
import { Award, Send } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDate } from '../../utils/formatters';
import DataTable, { Column } from '../../components/admin/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export default function AdminCertificates() {
  const links = useAdminLinks();
  const [certificates, setCertificates] = useState<any[] | null>(null);
  const [internships, setInternships] = useState<any[]>([]);
  const [genOpen, setGenOpen] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const toast = useToast();

  const load = () => {
    setCertificates(null);
    adminApi.certificates().then((res) => setCertificates(res.data.data)).catch((err) => { setCertificates([]); toast.error(getErrorMessage(err)); });
  };
  useEffect(load, []);

  useEffect(() => {
    if (genOpen) adminApi.internships({ limit: 100 }).then((res) => setInternships(res.data.data)).catch((err) => { setInternships([]); toast.error(getErrorMessage(err)); });
  }, [genOpen]);

  useEffect(() => {
    if (!selectedInternship) return setParticipants([]);
    adminApi.registrations(selectedInternship, { status: 'APPROVED', limit: 100 }).then((res) => setParticipants(res.data.data)).catch((err) => { setParticipants([]); toast.error(getErrorMessage(err)); });
  }, [selectedInternship]);

  const handleGenerate = async () => {
    try {
      await adminApi.generateCertificate(selectedUser, selectedInternship);
      toast.success('Certificate record created (pending)');
      setGenOpen(false);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleIssue = async (id: string) => {
    try {
      await adminApi.issueCertificate(id);
      toast.success('Certificate issued and PDF generated');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const columns: Column<any>[] = [
    { header: 'Certificate No.', render: (c) => <span className="font-mono text-xs">{c.certificateNo}</span> },
    { header: 'Student', render: (c) => c.user.fullName },
    { header: 'Internship', render: (c) => c.internship.title },
    { header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    { header: 'Issued', render: (c) => formatDate(c.issuedAt) },
    { header: 'Actions', render: (c) => c.status === 'PENDING' ? (
      <Button variant="outline" className="!py-1.5 !px-3 text-xs" onClick={() => handleIssue(c.id)} icon={<Send className="w-3.5 h-3.5" />}>Issue</Button>
    ) : c.fileUrl ? (
      <a href={c.fileUrl} target="_blank" rel="noreferrer" className="text-orange-600 text-xs font-bold hover:underline">Download</a>
    ) : null },
  ];

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Certificates">
      <div className="flex justify-end mb-5">
        <Button onClick={() => setGenOpen(true)} icon={<Award className="w-4 h-4" />}>Generate Certificate</Button>
      </div>
      <DataTable columns={columns} rows={certificates} keyField={(c) => c.id} emptyTitle="No certificates yet" />

      <Modal isOpen={genOpen} onClose={() => setGenOpen(false)} title="Generate Certificate">
        <div className="space-y-4">
          <div>
            <label className="label">Internship</label>
            <select className="input-field" value={selectedInternship} onChange={(e) => { setSelectedInternship(e.target.value); setSelectedUser(''); }}>
              <option value="">Select internship…</option>
              {internships.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Student</label>
            <select className="input-field" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} disabled={!selectedInternship}>
              <option value="">Select student…</option>
              {participants.map((r) => <option key={r.userId} value={r.userId}>{r.user.fullName}</option>)}
            </select>
          </div>
          <Button className="w-full" onClick={handleGenerate} disabled={!selectedInternship || !selectedUser}>Create Certificate Record</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
