import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Ban, CheckCircle, Trash2, Eye } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDate } from '../../utils/formatters';
import DataTable, { Column } from '../../components/admin/DataTable';
import SearchBar from '../../components/common/SearchBar';
import FilterPanel from '../../components/common/FilterPanel';
import Pagination from '../../components/common/Pagination';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import type { User } from '../../types';

export default function UsersStudents() {
  const links = useAdminLinks();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[] | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', mobileNumber: '', password: '' });
  const toast = useToast();

  const load = () => {
    setUsers(null);
    adminApi.users({ role: 'USER', search: search || undefined, isActive: status || undefined, page, limit: 15 }).then((res) => {
      setUsers(res.data.data);
      setTotalPages(res.data.meta?.totalPages || 1);
    }).catch((err) => {
      setUsers([]);
      toast.error(getErrorMessage(err));
    });
  };

  useEffect(() => {
    setUsers(null);
    const timer = setTimeout(load, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, page]);

  const handleToggle = async (u: User) => {
    try {
      if (u.isActive) await adminApi.deactivateUser(u.id);
      else await adminApi.activateUser(u.id);
      toast.success(`${u.fullName} ${u.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Delete ${u.fullName}? This cannot be undone.`)) return;
    try {
      await adminApi.deleteUser(u.id);
      toast.success('User deleted');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleCreate = async () => {
    try {
      await adminApi.createUser({ ...newUser, role: 'USER' });
      toast.success('Student account created');
      setCreateOpen(false);
      setNewUser({ fullName: '', email: '', mobileNumber: '', password: '' });
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  // Stops a row-action click (deactivate/delete) from also triggering the
  // row's own "view details" navigation.
  const stop = (e: React.MouseEvent, fn: () => void) => { e.stopPropagation(); fn(); };

  const columns: Column<User>[] = [
    { header: 'Name', render: (u) => <span className="font-semibold text-navy-800">{u.fullName}</span> },
    { header: 'Email', render: (u) => u.email },
    { header: 'Mobile', render: (u) => u.mobileNumber },
    { header: 'Joined', render: (u) => formatDate(u.createdAt) },
    { header: 'Status', render: (u) => (
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {u.isActive ? 'Active' : 'Inactive'}
      </span>
    )},
    { header: 'Actions', render: (u) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => stop(e, () => navigate(`/admin/users/students/${u.id}`))} title="View details" className="text-navy-400 hover:text-orange-500">
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={(e) => stop(e, () => handleToggle(u))} title={u.isActive ? 'Deactivate' : 'Activate'} className="text-navy-400 hover:text-orange-500">
          {u.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
        </button>
        <button onClick={(e) => stop(e, () => handleDelete(u))} title="Delete" className="text-navy-400 hover:text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Students">
      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-1.5 text-sm font-semibold text-navy-500 hover:text-orange-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-5">
        <div className="flex flex-1 gap-3 w-full">
          <SearchBar value={search} onChange={(v) => { setPage(1); setSearch(v); }} placeholder="Search students…" />
          <FilterPanel value={status} onChange={(v) => { setPage(1); setStatus(v); }} options={[{ label: 'All', value: '' }, { label: 'Active', value: 'true' }, { label: 'Inactive', value: 'false' }]} />
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="w-4 h-4" />} className="shrink-0">Add Student</Button>
      </div>

      <DataTable
        columns={columns}
        rows={users}
        keyField={(u) => u.id}
        emptyTitle="No students found"
        onRowClick={(u) => navigate(`/admin/users/students/${u.id}`)}
      />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add New Student">
        <div className="space-y-4">
          <div><label className="label">Full Name</label><input className="input-field" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} /></div>
          <div><label className="label">Email</label><input type="email" className="input-field" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></div>
          <div><label className="label">Mobile</label><input className="input-field" value={newUser.mobileNumber} onChange={(e) => setNewUser({ ...newUser, mobileNumber: e.target.value })} /></div>
          <div><label className="label">Password</label><input type="password" className="input-field" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /></div>
          <Button className="w-full" onClick={handleCreate}>Create Student</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
