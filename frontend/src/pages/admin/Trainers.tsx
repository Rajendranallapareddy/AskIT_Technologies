import { useEffect, useState } from 'react';
import { Plus, Link2, Edit2, Ban, CheckCircle, Trash2, XCircle, KeyRound } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import DataTable, { Column } from '../../components/admin/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import SetPasswordModal from '../../components/admin/SetPasswordModal';
import { initials } from '../../utils/formatters';

const emptyCreateForm = { fullName: '', email: '', mobileNumber: '', password: '', experienceYears: 1, bio: '', expertise: '' };

export default function AdminTrainers() {
  const links = useAdminLinks();
  const [trainers, setTrainers] = useState<any[] | null>(null);
  const [internships, setInternships] = useState<any[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const [assignOpen, setAssignOpen] = useState<any | null>(null);
  const [assignInternshipId, setAssignInternshipId] = useState('');

  const [passwordTarget, setPasswordTarget] = useState<any | null>(null);

  const toast = useToast();

  const load = () => {
    setTrainers(null);
    adminApi.trainers().then((res) => setTrainers(res.data.data)).catch((err) => {
      setTrainers([]);
      toast.error(getErrorMessage(err));
    });
    adminApi.internships({ limit: 100 }).then((res) => setInternships(res.data.data)).catch((err) => {
      setInternships([]);
      toast.error(getErrorMessage(err));
    });
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Create -----------------------------------------------------------
  const handleCreate = async () => {
    try {
      await adminApi.createTrainer({ ...createForm, expertise: createForm.expertise.split(',').map((s) => s.trim()).filter(Boolean) });
      toast.success('Trainer created');
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  // --- Edit / Modify ------------------------------------------------------
  const openEdit = (t: any) => {
    setEditTarget(t);
    setEditForm({
      fullName: t.user.fullName,
      email: t.user.email,
      mobileNumber: t.user.mobileNumber,
      experienceYears: t.experienceYears,
      expertise: (t.expertise || []).join(', '),
      bio: t.bio || '',
      availability: t.availability || '',
    });
  };

  const handleEditSave = async () => {
    try {
      await adminApi.updateTrainer(editTarget.id, {
        ...editForm,
        expertise: editForm.expertise.split(',').map((s: string) => s.trim()).filter(Boolean),
      });
      toast.success('Trainer updated');
      setEditTarget(null);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  // --- Activate / Deactivate / Delete --------------------------------------
  const handleToggleActive = async (t: any) => {
    try {
      if (t.user.isActive) await adminApi.deactivateUser(t.user.id);
      else await adminApi.activateUser(t.user.id);
      toast.success(t.user.isActive ? 'Trainer deactivated' : 'Trainer activated');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async (t: any) => {
    if (!confirm(`Delete trainer ${t.user.fullName}? This cannot be undone.`)) return;
    try {
      await adminApi.deleteTrainer(t.id);
      toast.success('Trainer deleted');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleSetPassword = async (newPassword: string) => {
    try {
      await adminApi.resetUserPassword(passwordTarget.user.id, newPassword);
      toast.success(`Password updated for ${passwordTarget.user.fullName}`);
      setPasswordTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err; // keep the modal open so they can retry
    }
  };

  // --- Assign / Reassign / Unassign internship ------------------------------
  const openAssign = (t: any) => {
    setAssignOpen(t);
    // Pre-select an internship this trainer is already assigned to, if any, so
    // "Unassign" is a one-click action from the same modal.
    const current = internships.find((i) => i.trainer?.id === t.id);
    setAssignInternshipId(current?.id || '');
  };

  const handleAssign = async () => {
    try {
      await adminApi.assignTrainer(assignInternshipId, assignOpen.id);
      toast.success('Trainer assigned');
      setAssignOpen(null);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleUnassign = async (internshipId: string) => {
    try {
      await adminApi.assignTrainer(internshipId, null);
      toast.success('Trainer removed from internship');
      setAssignOpen(null);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const trainerInternships = (trainerId: string) => internships.filter((i) => i.trainer?.id === trainerId);

  const columns: Column<any>[] = [
    { header: 'Trainer', render: (t) => (
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-full bg-navy-700 text-white text-xs font-bold flex items-center justify-center">{initials(t.user.fullName)}</span>
        <div>
          <span className="font-semibold text-navy-800 block">{t.user.fullName}</span>
          {!t.user.isActive && <span className="text-[10px] font-bold text-red-500">INACTIVE</span>}
        </div>
      </div>
    )},
    { header: 'Email', render: (t) => t.user.email },
    { header: 'Experience', render: (t) => `${t.experienceYears} yrs` },
    { header: 'Expertise', render: (t) => (t.expertise || []).join(', ') || '—' },
    { header: 'Assigned Internships', render: (t) => {
      const assigned = trainerInternships(t.id);
      return assigned.length ? assigned.map((i) => i.title).join(', ') : <span className="text-navy-400">None</span>;
    }},
    { header: 'Actions', render: (t) => (
      <div className="flex items-center gap-2">
        <button onClick={() => openEdit(t)} className="text-navy-400 hover:text-orange-500" title="Edit"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => setPasswordTarget(t)} className="text-navy-400 hover:text-orange-500" title="Set password"><KeyRound className="w-4 h-4" /></button>
        <button onClick={() => openAssign(t)} className="text-navy-400 hover:text-orange-500" title="Assign to internship"><Link2 className="w-4 h-4" /></button>
        <button onClick={() => handleToggleActive(t)} className="text-navy-400 hover:text-orange-500" title={t.user.isActive ? 'Deactivate' : 'Activate'}>
          {t.user.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
        </button>
        <button onClick={() => handleDelete(t)} className="text-navy-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Manage Trainers">
      <div className="flex justify-end mb-5">
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="w-4 h-4" />}>Add Trainer</Button>
      </div>
      <DataTable columns={columns} rows={trainers} keyField={(t) => t.id} emptyTitle="No trainers yet" emptyDescription="Click 'Add Trainer' to create your first trainer profile." />

      {/* Create */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add New Trainer">
        <div className="space-y-4">
          <div><label className="label">Full Name</label><input className="input-field" value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} /></div>
          <div><label className="label">Email</label><input type="email" className="input-field" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></div>
          <div><label className="label">Mobile</label><input className="input-field" value={createForm.mobileNumber} onChange={(e) => setCreateForm({ ...createForm, mobileNumber: e.target.value })} /></div>
          <div><label className="label">Password</label><input type="password" className="input-field" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} /></div>
          <div><label className="label">Years of Experience</label><input type="number" className="input-field" value={createForm.experienceYears} onChange={(e) => setCreateForm({ ...createForm, experienceYears: Number(e.target.value) })} /></div>
          <div><label className="label">Expertise (comma-separated)</label><input className="input-field" value={createForm.expertise} onChange={(e) => setCreateForm({ ...createForm, expertise: e.target.value })} placeholder="Java, Spring Boot" /></div>
          <div><label className="label">Bio</label><textarea rows={2} className="input-field" value={createForm.bio} onChange={(e) => setCreateForm({ ...createForm, bio: e.target.value })} /></div>
          <Button className="w-full" onClick={handleCreate}>Create Trainer</Button>
        </div>
      </Modal>

      {/* Edit */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit ${editTarget?.user?.fullName || 'Trainer'}`}>
        {editForm && (
          <div className="space-y-4">
            <div><label className="label">Full Name</label><input className="input-field" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} /></div>
            <div><label className="label">Email</label><input type="email" className="input-field" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div><label className="label">Mobile</label><input className="input-field" value={editForm.mobileNumber} onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })} /></div>
            <div><label className="label">Years of Experience</label><input type="number" className="input-field" value={editForm.experienceYears} onChange={(e) => setEditForm({ ...editForm, experienceYears: Number(e.target.value) })} /></div>
            <div><label className="label">Expertise (comma-separated)</label><input className="input-field" value={editForm.expertise} onChange={(e) => setEditForm({ ...editForm, expertise: e.target.value })} /></div>
            <div><label className="label">Bio</label><textarea rows={2} className="input-field" value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} /></div>
            <div><label className="label">Availability</label><input className="input-field" value={editForm.availability} onChange={(e) => setEditForm({ ...editForm, availability: e.target.value })} placeholder="e.g. Weekday evenings" /></div>
            <Button className="w-full" onClick={handleEditSave}>Save Changes</Button>
          </div>
        )}
      </Modal>

      {/* Assign / Unassign */}
      <Modal isOpen={!!assignOpen} onClose={() => setAssignOpen(null)} title={`Assign ${assignOpen?.user?.fullName || ''} to an Internship`}>
        <div className="space-y-4">
          <select className="input-field" value={assignInternshipId} onChange={(e) => setAssignInternshipId(e.target.value)}>
            <option value="">Select internship…</option>
            {internships.map((i) => <option key={i.id} value={i.id}>{i.title}{i.trainer && i.trainer.id !== assignOpen?.id ? ` (currently: ${i.trainer.user?.fullName})` : ''}</option>)}
          </select>
          <Button className="w-full" onClick={handleAssign} disabled={!assignInternshipId}>Assign Trainer</Button>

          {assignOpen && trainerInternships(assignOpen.id).length > 0 && (
            <div className="pt-3 border-t border-navy-100">
              <p className="text-xs font-semibold text-navy-500 mb-2">Currently assigned to:</p>
              {trainerInternships(assignOpen.id).map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm py-1.5">
                  <span>{i.title}</span>
                  <button onClick={() => handleUnassign(i.id)} className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs font-bold">
                    <XCircle className="w-3.5 h-3.5" /> Unassign
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <SetPasswordModal
        isOpen={!!passwordTarget}
        onClose={() => setPasswordTarget(null)}
        targetName={passwordTarget?.user?.fullName || 'this Trainer'}
        onSubmit={handleSetPassword}
      />
    </DashboardLayout>
  );
}
