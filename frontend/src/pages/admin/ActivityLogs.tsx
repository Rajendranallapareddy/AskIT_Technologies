import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { superAdminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDateTime } from '../../utils/formatters';
import DataTable, { Column } from '../../components/admin/DataTable';
import SearchBar from '../../components/common/SearchBar';
import Pagination from '../../components/common/Pagination';

export default function ActivityLogs() {
  const links = useAdminLinks();
  const [logs, setLogs] = useState<any[] | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const toast = useToast();

  const load = () => {
    setLogs(null);
    superAdminApi.activityLogs({ search: search || undefined, page, limit: 25 }).then((res) => {
      setLogs(res.data.data);
      setTotalPages(res.data.meta?.totalPages || 1);
    }).catch((err) => {
      setLogs([]);
      toast.error(getErrorMessage(err));
    });
  };

  useEffect(() => {
    const timer = setTimeout(load, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  const columns: Column<any>[] = [
    { header: 'Action', render: (l) => <span className="font-mono text-xs bg-navy-50 px-2 py-1 rounded">{l.action}</span> },
    { header: 'Description', render: (l) => l.description },
    { header: 'By', render: (l) => l.actor?.fullName || 'System' },
    { header: 'Role', render: (l) => l.actor?.role?.replace('_', ' ') || '—' },
    { header: 'When', render: (l) => formatDateTime(l.createdAt) },
  ];

  return (
    <DashboardLayout links={links} title="Super Admin" pageTitle="Activity Logs">
      <div className="mb-5"><SearchBar value={search} onChange={(v) => { setPage(1); setSearch(v); }} placeholder="Search activity…" /></div>
      <DataTable columns={columns} rows={logs} keyField={(l) => l.id} emptyTitle="No activity recorded yet" />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </DashboardLayout>
  );
}
