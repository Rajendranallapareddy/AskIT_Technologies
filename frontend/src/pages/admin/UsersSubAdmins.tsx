import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Ban, CheckCircle, Trash2, Plus } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { superAdminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDate } from '../../utils/formatters';
import DataTable, { Column } from '../../components/admin/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import SetPasswordModal from '../../components/admin/SetPasswordModal';

const emptyForm = { fullName: '', email: '', mobileNumber: '', password: '' };

// Lists Sub Admins under Admin → Users → Sub Admins. Clicking a row goes
// straight to that Sub Admin's Permissions screen — the natural next step
// after finding one, since permissions are the whole reason to look a Sub
// Admin up. Password reset stays available here too.
export default function UsersSubAdmins() {
  const links = useAdminLinks();
  const navigate = useNavigate();
  const [subAdmins, setSubAdmins] = useState<any[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [passwordTarget, setPasswordTarget] = useState<any>(null);
  const toast = useToast();

  const load = () => {
    setSubAdmins(null);
    superAdminApi.subAdmins().then((res) => setSubAdmins(res.data.data)).catch((err) => { setSubAdmins([]); toast.error(getErrorMessage(err)); });
  };
  useEffect(load, []);

  const handleCreate = async () => {
    try {
      await superAdminApi.createSubAdmin(form);
      toast.success('Sub Admin created');
      setCreateOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleToggle = async (s: any) => {
    try {
      if (s.isActive) await superAdminApi.deactivateSubAdmin(s.id);
      else await superAdminApi.activateSubAdmin(s.id);
      toast.success(`${s.fullName} ${s.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async (s: any) => {
    if (!confirm(`Delete Sub Admin ${s.fullName}?`)) return;
    try { await superAdminApi.deleteSubAdmin(s.id); toast.success('Deleted'); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleSetPassword = async (newPassword: string) => {
    try {
      await superAdminApi.resetSubAdminPassword(passwordTarget.id, newPassword);
      toast.success(`Password updated for ${passwordTarget.fullName}`);
      setPasswordTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };

  const stop = (e: React.MouseEvent, fn: () => void) => { e.stopPropagation(); fn(); };

  const columns: Column<any>[] = [
    { header: 'Name', render: (s) => <span className="font-semibold text-navy-800">{s.fullName}</span> },
    { header: 'Email', render: (s) => s.email },
    { header: 'Mobile', render: (s) => s.mobileNumber },
    { header: 'Created', render: (s) => formatDate(s.createdAt) },
    { header: 'Status', render: (s) => (
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {s.isActive ? 'Active' : 'Inactive'}
      </span>
    )},
    { header: 'Actions', render: (s) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => stop(e, () => setPasswordTarget(s))} className="text-navy-400 hover:text-orange-500" title="Set password"><KeyRound className="w-4 h-4" /></button>
        <button onClick={(e) => stop(e, () => handleToggle(s))} className="text-navy-400 hover:text-orange-500" title={s.isActive ? 'Deactivate' : 'Activate'}>
          {s.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
        </button>
        <button onClick={(e) => stop(e, () => handleDelete(s))} className="text-navy-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <DashboardLayout links={links} title="Super Admin" pageTitle="Sub Admins">
      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-1.5 text-sm font-semibold text-navy-500 hover:text-orange-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-navy-500">Click a Sub Admin to manage their permissions.</p>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="w-4 h-4" />}>Add Sub Admin</Button>
      </div>

      <DataTable
        columns={columns}
        rows={subAdmins}
        keyField={(s) => s.id}
        emptyTitle="No Sub Admins yet"
        onRowClick={(s) => navigate(`/admin/permissions?subAdminId=${s.id}`)}
      />

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add New Sub Admin">
        <div className="space-y-4">
          <div><label className="label">Full Name</label><input className="input-field" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div><label className="label">Email</label><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Mobile</label><input className="input-field" value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} /></div>
          <div><label className="label">Password</label><input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <Button className="w-full" onClick={handleCreate}>Create Sub Admin</Button>
        </div>
      </Modal>

      <SetPasswordModal
        isOpen={!!passwordTarget}
        onClose={() => setPasswordTarget(null)}
        targetName={passwordTarget?.fullName || 'this Sub Admin'}
        onSubmit={handleSetPassword}
      />
    </DashboardLayout>
  );
}
