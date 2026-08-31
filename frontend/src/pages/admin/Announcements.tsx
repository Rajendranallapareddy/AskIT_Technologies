import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDateTime } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Megaphone } from 'lucide-react';

export default function AdminAnnouncements() {
  const links = useAdminLinks();
  const [announcements, setAnnouncements] = useState<any[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', message: '' });
  const toast = useToast();

  const load = () => {
    setAnnouncements(null);
    adminApi.announcements().then((res) => setAnnouncements(res.data.data)).catch((err) => { setAnnouncements([]); toast.error(getErrorMessage(err)); });
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm({ title: '', message: '' }); setModalOpen(true); };
  const openEdit = (a: any) => { setEditing(a); setForm({ title: a.title, message: a.message }); setModalOpen(true); };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await adminApi.updateAnnouncement(editing.id, form);
        toast.success('Announcement updated');
      } else {
        await adminApi.createAnnouncement(form);
        toast.success('Announcement published to all users');
      }
      setModalOpen(false);
      setEditing(null);
      setForm({ title: '', message: '' });
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async (a: any) => {
    if (!confirm(`Delete announcement "${a.title}"? This can't be undone.`)) return;
    try {
      await adminApi.deleteAnnouncement(a.id);
      toast.success('Announcement deleted');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Announcements">
      <div className="flex justify-end mb-5">
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>New Announcement</Button>
      </div>

      {announcements === null ? (
        <LoadingSpinner />
      ) : announcements.length === 0 ? (
        <EmptyState icon={<Megaphone className="w-8 h-8" />} title="No announcements yet" />
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-navy-900">{a.title}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-navy-400">{formatDateTime(a.createdAt)}</span>
                  <button onClick={() => openEdit(a)} className="text-navy-400 hover:text-orange-500" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(a)} className="text-navy-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm text-navy-500 mt-1">{a.message}</p>
              <span className="text-xs font-semibold text-orange-600 mt-2 inline-block">
                {a.isGlobal ? 'Sent to all users' : `Internship: ${a.internship?.title || '—'}`}
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Announcement' : 'New Global Announcement'}>
        <div className="space-y-4">
          <div><label className="label">Title</label><input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label">Message</label><textarea rows={4} className="input-field" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <Button className="w-full" onClick={handleSubmit}>{editing ? 'Save Changes' : 'Publish to All Users'}</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
