import DashboardLayout from '../../components/layout/DashboardLayout';
import { USER_LINKS } from './_links';
import { useApiQuery } from '../../hooks/useQuery';
import { userApi } from '../../api/endpoints';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { CalendarCheck } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export default function MyAttendance() {
  const { data, isLoading, error, refetch } = useApiQuery<any[]>(() => userApi.attendance());

  return (
    <DashboardLayout links={USER_LINKS} title="Student Portal" pageTitle="My Attendance">
      {isLoading || !data ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="w-8 h-8" />} title="No attendance records yet" description="Attendance will appear here once your internship sessions begin." />
      ) : (
        <div className="space-y-6">
          {data.map((summary: any) => (
            <div key={summary.internshipId} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-navy-900">{summary.internshipTitle}</h3>
                <span className="text-lg font-extrabold text-orange-600">{summary.percentage}%</span>
              </div>
              <div className="w-full h-2 bg-navy-100 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-orange-500" style={{ width: `${summary.percentage}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm mb-4">
                <div className="bg-navy-50 rounded-lg py-2"><p className="font-bold text-navy-900">{summary.totalSessions}</p><p className="text-xs text-navy-500">Total</p></div>
                <div className="bg-green-50 rounded-lg py-2"><p className="font-bold text-green-700">{summary.present}</p><p className="text-xs text-navy-500">Present</p></div>
                <div className="bg-red-50 rounded-lg py-2"><p className="font-bold text-red-600">{summary.absent}</p><p className="text-xs text-navy-500">Absent</p></div>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-navy-50">
                {summary.records.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-navy-600">{formatDate(r.session.date)}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
