import DashboardLayout from '../../components/layout/DashboardLayout';
import { USER_LINKS } from './_links';
import { useApiQuery } from '../../hooks/useQuery';
import { userApi } from '../../api/endpoints';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { History as HistoryIcon } from 'lucide-react';

export default function History() {
  const { data, isLoading, error, refetch } = useApiQuery<any>(() => userApi.history());

  return (
    <DashboardLayout links={USER_LINKS} title="Student Portal" pageTitle="History">
      {isLoading || !data ? (
        <LoadingSpinner />
      ) : data.registrations.length === 0 ? (
        <EmptyState icon={<HistoryIcon className="w-8 h-8" />} title="No history yet" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-600">
              <tr>
                <th className="text-left font-bold px-4 py-3">Internship</th>
                <th className="text-left font-bold px-4 py-3">Trainer</th>
                <th className="text-left font-bold px-4 py-3">Applied</th>
                <th className="text-left font-bold px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {data.registrations.map((r: any) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-semibold text-navy-800">{r.internship.title}</td>
                  <td className="px-4 py-3 text-navy-500">{r.internship.trainer?.user?.fullName || '—'}</td>
                  <td className="px-4 py-3 text-navy-500">{formatDate(r.appliedAt)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
