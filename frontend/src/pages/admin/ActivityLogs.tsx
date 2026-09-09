import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

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
  const toast = useToast();

  const [logs, setLogs] = useState<any[] | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const load = () => {
    setLogs(null);

    superAdminApi
      .activityLogs({
        search: search || undefined,
        page,
        limit: 25,
      })
      .then((res) => {
        setLogs(res.data.data || []);
        setTotalPages(res.data.meta?.totalPages || 1);
      })
      .catch((err) => {
        setLogs([]);
        toast.error(getErrorMessage(err));
      });
  };

  useEffect(() => {
    const timer = setTimeout(load, 350);

    return () => clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  const handleDelete = async (log: any) => {
    const confirmed = window.confirm(
      `Delete this activity log?\n\n${log.description || log.action}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(log.id);

      await superAdminApi.deleteActivityLog(log.id);

      toast.success('Activity log deleted successfully');

      // If this was the only row on a later page,
      // go back one page.
      if ((logs?.length || 0) === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        load();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!logs || logs.length === 0) {
      toast.error('There are no activity logs to delete');
      return;
    }

    const confirmed = window.confirm(
      'Delete ALL activity logs?\n\nThis will permanently remove the complete activity history.\n\nThis action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setDeletingAll(true);

      const res = await superAdminApi.deleteAllActivityLogs();

      toast.success(
        res.data?.message || 'All activity logs deleted successfully'
      );

      setSearch('');
      setPage(1);
      setLogs([]);
      setTotalPages(1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingAll(false);
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Action',
      render: (log) => (
        <span className="rounded bg-navy-50 px-2 py-1 font-mono text-xs">
          {log.action}
        </span>
      ),
    },
    {
      header: 'Description',
      render: (log) => log.description,
    },
    {
      header: 'By',
      render: (log) => log.actor?.fullName || 'System',
    },
    {
      header: 'Role',
      render: (log) =>
        log.actor?.role?.replace(/_/g, ' ') || '—',
    },
    {
      header: 'When',
      render: (log) => formatDateTime(log.createdAt),
    },
    {
      header: 'Delete',
      render: (log) => (
        <button
          type="button"
          onClick={() => void handleDelete(log)}
          disabled={deletingId === log.id || deletingAll}
          title="Delete activity log"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout
      links={links}
      title="Super Admin"
      pageTitle="Activity Logs"
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={(value) => {
              setPage(1);
              setSearch(value);
            }}
            placeholder="Search activity…"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleDeleteAll()}
          disabled={
            deletingAll ||
            logs === null ||
            logs.length === 0
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 shadow-sm transition-all hover:border-red-300 hover:bg-red-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />

          {deletingAll
            ? 'Deleting...'
            : 'Delete All'}
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={logs}
        keyField={(log) => log.id}
        emptyTitle="No activity recorded yet"
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
      />
    </DashboardLayout>
  );
}