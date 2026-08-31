import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import DataTable, { Column } from '../../components/admin/DataTable';
import EmptyState from '../../components/common/EmptyState';

export default function AdminAttendance() {
  const links = useAdminLinks();
  const [internships, setInternships] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState<any | null>(null);
  const toast = useToast();

  useEffect(() => {
    adminApi.internships({ limit: 100 }).then((res) => {
      setInternships(res.data.data);
      if (res.data.data.length) setSelected(res.data.data[0].id);
    }).catch((err) => {
      setInternships([]);
      toast.error(getErrorMessage(err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    setReport(null);
    apiClient.get(`/admin/internships/${selected}/attendance-report`).then((res) => setReport(res.data.data)).catch((err) => {
      setReport({ sessions: 0, report: [] }); // keep the { report: [...] } shape DataTable expects below
      toast.error(getErrorMessage(err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const columns: Column<any>[] = [
    { header: 'Student', render: (r) => <span className="font-semibold text-navy-800">{r.name}</span> },
    { header: 'Present', render: (r) => r.present },
    { header: 'Total Sessions', render: (r) => r.total },
    { header: 'Percentage', render: (r) => (
      <span className={`font-bold ${r.percentage >= 75 ? 'text-green-600' : 'text-red-500'}`}>{r.percentage}%</span>
    )},
  ];

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Attendance Reports">
      <div className="mb-5">
        {internships.length === 0 ? null : (
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="input-field max-w-md">
            {internships.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
          </select>
        )}
      </div>
      {internships.length === 0 ? (
        <EmptyState title="No internships yet" />
      ) : (
        <DataTable columns={columns} rows={report?.report ?? null} keyField={(r) => r.userId} emptyTitle="No attendance sessions recorded yet" />
      )}
    </DashboardLayout>
  );
}
