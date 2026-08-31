import { LayoutDashboard, Briefcase, CalendarCheck, Award, Bell, Clock } from 'lucide-react';
import { useApiQuery } from '../../hooks/useQuery';
import { userApi } from '../../api/endpoints';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { USER_LINKS } from './_links';
import StatsCard from '../../components/admin/StatsCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

export default function UserDashboard() {
  const { data, isLoading, error, refetch } = useApiQuery<any>(() => userApi.dashboard());
  const { user } = useAuth();

  return (
    <DashboardLayout links={USER_LINKS} title="Student Portal" pageTitle="Dashboard">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-navy-900">Welcome back, {user?.fullName?.split(' ')[0]} 👋</h2>
        <p className="text-sm text-navy-500 mt-1">Here's what's happening with your learning journey.</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isLoading || !data ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard icon={Briefcase} label="Registered Internships" value={data.registeredInternships} accent="navy" to="/my-internships" />
            <StatsCard icon={CalendarCheck} label="Attendance %" value={`${data.attendancePercentage}%`} accent="green" to="/my-attendance" />
            <StatsCard icon={Award} label="Certificates Earned" value={data.certificatesEarned} accent="orange" to="/my-certificates" />
            <StatsCard icon={Bell} label="Notifications" value={data.notifications.length} accent="red" to="/notifications" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <div className="card p-6">
              <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4 text-orange-500" /> My Registrations</h3>
              {data.registrations.length === 0 ? (
                <EmptyState title="No registrations yet" description="Browse internships and apply to get started." />
              ) : (
                <ul className="space-y-3">
                  {data.registrations.slice(0, 5).map((r: any) => (
                    <li key={r.id} className="flex items-center justify-between border-b border-navy-50 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-semibold text-navy-800">{r.internship.title}</p>
                        <p className="text-xs text-navy-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> Applied {formatDate(r.appliedAt)}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-orange-500" /> Announcements</h3>
              {data.announcements.length === 0 ? (
                <EmptyState title="No announcements" icon={<Bell className="w-8 h-8" />} />
              ) : (
                <ul className="space-y-3">
                  {data.announcements.slice(0, 5).map((a: any) => (
                    <li key={a.id} className="border-b border-navy-50 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-navy-800">{a.title}</p>
                      <p className="text-xs text-navy-500 mt-1 line-clamp-2">{a.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
