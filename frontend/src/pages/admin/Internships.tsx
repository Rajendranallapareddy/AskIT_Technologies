import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
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
import { Link } from 'react-router-dom';
import type { Internship } from '../../types';

const emptyForm = {
  title: '', description: '', duration: '', startDate: '', endDate: '',
  registrationDeadline: '', totalSeats: 20, mode: 'ONLINE', status: 'DRAFT', fee: '',
  earlyBirdFee: '', earlyBirdDeadline: '', gstPercentage: '', trainerId: '',
};

export default function AdminInternships() {
  const links = useAdminLinks();
  const [internships, setInternships] = useState<Internship[] | null>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Internship | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const toast = useToast();

  const load = () => {
    setInternships(null);
    adminApi.internships({ limit: 50 }).then((res) => setInternships(res.data.data)).catch((err) => { setInternships([]); toast.error(getErrorMessage(err)); });
    adminApi.trainers().then((res) => setTrainers(res.data.data)).catch(() => setTrainers([]));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (i: any) => {
    setEditing(i);
    setForm({
      title: i.title, description: i.description, duration: i.duration,
      startDate: i.startDate?.slice(0, 10), endDate: i.endDate?.slice(0, 10),
      registrationDeadline: i.registrationDeadline?.slice(0, 10),
      totalSeats: i.totalSeats, mode: i.mode, status: i.status, fee: i.fee || '',
      earlyBirdFee: i.earlyBirdFee || '', earlyBirdDeadline: i.earlyBirdDeadline?.slice(0, 10) || '', gstPercentage: i.gstPercentage || '',
      trainerId: i.trainer?.id || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      // Send null (not '') when no trainer is selected, so an update can
      // explicitly clear a previously-assigned trainer instead of silently
      // being ignored.
      const payload = { ...form, trainerId: form.trainerId || null };
      if (editing) {
        await adminApi.updateInternship(editing.id, payload);
        toast.success('Internship updated');
      } else {
        await adminApi.createInternship(payload);
        toast.success('Internship created');
      }
      setModalOpen(false);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async (i: any) => {
    if (!confirm(`Delete "${i.title}"?`)) return;
    try {
      await adminApi.deleteInternship(i.id);
      toast.success('Internship deleted');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const columns: Column<any>[] = [
    { header: 'Title', render: (i) => <span className="font-semibold text-navy-800">{i.title}</span> },
    { header: 'Trainer', render: (i) => i.trainer?.user?.fullName || '—' },
    { header: 'Seats', render: (i) => `${i.seatsFilled}/${i.totalSeats}` },
    { header: 'Starts', render: (i) => formatDate(i.startDate) },
    { header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    { header: 'Registrations', render: (i) => (
      <Link to={`/admin/registrations?internshipId=${i.id}`} className="text-orange-600 font-semibold text-xs hover:underline">
        View ({i._count?.registrations || 0})
      </Link>
    )},
    { header: 'Actions', render: (i) => (
      <div className="flex items-center gap-2">
        <button onClick={() => openEdit(i)} className="text-navy-400 hover:text-orange-500"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => handleDelete(i)} className="text-navy-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Manage Internships">
      <div className="flex justify-end mb-5">
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>New Internship</Button>
      </div>
      <DataTable columns={columns} rows={internships} keyField={(i) => i.id} emptyTitle="No internships yet" />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Internship' : 'New Internship'} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div><label className="label">Title</label><input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label">Description</label><textarea rows={3} className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="label">Duration</label><input className="input-field" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 3 Months" /></div>
            <div><label className="label">Total Seats</label><input type="number" className="input-field" value={form.totalSeats} onChange={(e) => setForm({ ...form, totalSeats: e.target.value })} /></div>
            <div><label className="label">Fee (optional)</label><input type="number" className="input-field" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} placeholder="Leave blank for free" /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="label">Early-Bird Fee</label><input type="number" className="input-field" value={form.earlyBirdFee} onChange={(e) => setForm({ ...form, earlyBirdFee: e.target.value })} /></div>
            <div><label className="label">Early-Bird Deadline</label><input type="date" className="input-field" value={form.earlyBirdDeadline} onChange={(e) => setForm({ ...form, earlyBirdDeadline: e.target.value })} /></div>
            <div><label className="label">GST %</label><input type="number" className="input-field" value={form.gstPercentage} onChange={(e) => setForm({ ...form, gstPercentage: e.target.value })} /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="label">Start Date</label><input type="date" className="input-field" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><label className="label">End Date</label><input type="date" className="input-field" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            <div><label className="label">Registration Deadline</label><input type="date" className="input-field" value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Mode</label>
              <select className="input-field" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                <option value="ONLINE">Online</option><option value="OFFLINE">Offline</option><option value="HYBRID">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="DRAFT">Draft</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option>
                <option value="ONGOING">Ongoing</option><option value="COMPLETED">Completed</option><option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Trainer</label>
            <select className="input-field" value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })}>
              <option value="">— No trainer assigned —</option>
              {trainers.map((t) => <option key={t.id} value={t.id}>{t.user.fullName}</option>)}
            </select>
            {trainers.length === 0 && (
              <p className="text-xs text-navy-400 mt-1">No trainers exist yet — add one from the Trainers page first.</p>
            )}
          </div>
          <Button className="w-full" onClick={handleSubmit}>{editing ? 'Save Changes' : 'Create Internship'}</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
