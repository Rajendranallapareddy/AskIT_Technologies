import { Briefcase, PlayCircle, CheckCircle2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { TRAINER_LINKS } from './_links';
import { useApiQuery } from '../../hooks/useQuery';
import { trainerApi } from '../../api/endpoints';
import StatsCard from '../../components/admin/StatsCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { Link } from 'react-router-dom';

export default function TrainerDashboard() {
  const { data, isLoading, error, refetch } = useApiQuery<any>(() => trainerApi.dashboard());

  return (
    <DashboardLayout links={TRAINER_LINKS} title="Trainer Portal" pageTitle="Dashboard">
      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isLoading || !data ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <StatsCard icon={Briefcase} label="Total Internships" value={data.totalInternships} accent="navy" to="/trainer/participants" />
            <StatsCard icon={PlayCircle} label="Active" value={data.activeInternships} accent="orange" to="/trainer/attendance" />
            <StatsCard icon={CheckCircle2} label="Completed" value={data.completedInternships} accent="green" to="/trainer/participants" />
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-navy-900 mb-4">My Assigned Internships</h3>
            {data.internships.length === 0 ? (
              <EmptyState title="No internships assigned yet" description="Your admin will assign internships to you." />
            ) : (
              <div className="space-y-3">
                {data.internships.map((i: any) => (
                  <Link
                    key={i.id}
                    to={`/trainer/participants?internshipId=${i.id}`}
                    className="flex items-center justify-between border border-navy-100 rounded-xl px-4 py-3 hover:bg-navy-50 transition"
                  >
                    <div>
                      <p className="font-semibold text-navy-800 text-sm">{i.title}</p>
                      <p className="text-xs text-navy-400 mt-0.5">Starts {formatDate(i.startDate)} • {i._count?.registrations || 0} registered</p>
                    </div>
                    <StatusBadge status={i.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
