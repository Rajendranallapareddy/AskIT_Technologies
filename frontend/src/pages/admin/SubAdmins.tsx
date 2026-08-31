import { useEffect, useState } from 'react';
import { Plus, Ban, CheckCircle, Trash2, KeyRound } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { superAdminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import DataTable, { Column } from '../../components/admin/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import SetPasswordModal from '../../components/admin/SetPasswordModal';

const emptyForm = { fullName: '', email: '', mobileNumber: '', password: '' };

export default function SubAdmins() {
  const links = useAdminLinks();
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
      await superAdminApi.createSubAdmin({ ...form, permissions: {} });
      toast.success('Sub Admin created. Set their permissions from the Permissions page.');
      setCreateOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleToggle = async (s: any) => {
    try {
      if (s.isActive) await superAdminApi.deactivateSubAdmin(s.id);
      else await superAdminApi.activateSubAdmin(s.id);
      toast.success('Updated');
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
      throw err; // keep the modal open so they can retry
    }
  };

  const columns: Column<any>[] = [
    { header: 'Name', render: (s) => <span className="font-semibold text-navy-800">{s.fullName}</span> },
    { header: 'Email', render: (s) => s.email },
    { header: 'Status', render: (s) => (
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {s.isActive ? 'Active' : 'Inactive'}
      </span>
    )},
    { header: 'Actions', render: (s) => (
      <div className="flex items-center gap-2">
        <button onClick={() => setPasswordTarget(s)} className="text-navy-400 hover:text-orange-500" title="Set password"><KeyRound className="w-4 h-4" /></button>
        <button onClick={() => handleToggle(s)} className="text-navy-400 hover:text-orange-500">{s.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}</button>
        <button onClick={() => handleDelete(s)} className="text-navy-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <DashboardLayout links={links} title="Super Admin" pageTitle="Sub Admins">
      <div className="flex justify-end mb-5">
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="w-4 h-4" />}>Add Sub Admin</Button>
      </div>
      <DataTable columns={columns} rows={subAdmins} keyField={(s) => s.id} emptyTitle="No Sub Admins yet" />

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
