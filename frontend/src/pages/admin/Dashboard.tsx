import { Users, GraduationCap, BookOpen, Briefcase, CheckCircle2, ClipboardList, CalendarCheck, Mail } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { useApiQuery } from '../../hooks/useQuery';
import { adminApi } from '../../api/endpoints';
import StatsCard from '../../components/admin/StatsCard';
import ActivityFeed from '../../components/admin/ActivityFeed';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';

export default function AdminDashboard() {
  const links = useAdminLinks();
  const { data, isLoading, error, refetch } = useApiQuery<any>(() => adminApi.dashboard());

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Dashboard">
      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isLoading || !data ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard icon={Users} label="Total Students" value={data.stats.totalUsers} accent="navy" to="/admin/users" />
            <StatsCard icon={GraduationCap} label="Trainers" value={data.stats.totalTrainers} accent="orange" to="/admin/trainers" />
            <StatsCard icon={BookOpen} label="Courses" value={data.stats.totalCourses} accent="navy" to="/admin/internships" />
            <StatsCard icon={Briefcase} label="Active Internships" value={data.stats.activeInternships} accent="green" to="/admin/internships" />
            <StatsCard icon={CheckCircle2} label="Completed Internships" value={data.stats.completedInternships} accent="navy" to="/admin/internships" />
            <StatsCard icon={ClipboardList} label="Pending Registrations" value={data.stats.pendingRegistrations} accent="red" to="/admin/registrations" />
            <StatsCard icon={CalendarCheck} label="Today's Attendance" value={data.stats.todaysAttendance} accent="orange" to="/admin/attendance" />
            <StatsCard icon={Mail} label="New Contact Requests" value={data.recentContacts.length} accent="red" to="/admin/contacts" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <div className="card p-6">
              <h3 className="font-bold text-navy-900 mb-4">Recent Activity</h3>
              <ActivityFeed items={data.recentActivity} />
            </div>
            <div className="card p-6">
              <h3 className="font-bold text-navy-900 mb-4">New Contact Requests</h3>
              {data.recentContacts.length === 0 ? (
                <EmptyState title="No new messages" icon={<Mail className="w-8 h-8" />} />
              ) : (
                <ul className="space-y-3">
                  {data.recentContacts.map((c: any) => (
                    <li key={c.id} className="border-b border-navy-50 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-navy-800">{c.name} <span className="text-xs text-navy-400 font-normal">• {formatDate(c.createdAt)}</span></p>
                      <p className="text-xs text-navy-500 mt-1 line-clamp-2">{c.message}</p>
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
