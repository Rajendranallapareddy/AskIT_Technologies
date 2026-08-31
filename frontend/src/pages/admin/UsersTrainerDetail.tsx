import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Briefcase, Award } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/helpers';
import { formatDate, initials } from '../../utils/formatters';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import StatusBadge from '../../components/common/StatusBadge';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-navy-50 last:border-0">
      <span className="text-sm text-navy-500">{label}</span>
      <span className="text-sm font-semibold text-navy-800 text-right">{value ?? '—'}</span>
    </div>
  );
}

// Full profile for one trainer — qualification/expertise (the "stack"),
// experience, bio — plus which internships they're currently assigned to.
export default function UsersTrainerDetail() {
  const { id } = useParams();
  const links = useAdminLinks();
  const navigate = useNavigate();
  const [trainer, setTrainer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    setTrainer(null);
    setError(null);
    adminApi.trainerDetail(id).then((res) => setTrainer(res.data.data)).catch((err) => setError(getErrorMessage(err)));
  };
  useEffect(load, [id]);

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Trainer Details">
      <button onClick={() => navigate('/admin/users/trainers')} className="flex items-center gap-1.5 text-sm font-semibold text-navy-500 hover:text-orange-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Trainers
      </button>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !trainer ? (
        <LoadingSpinner />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-6 h-fit">
            <div className="flex flex-col items-center text-center">
              {trainer.photo ? (
                <img src={trainer.photo} alt={trainer.user.fullName} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-navy-700 text-white flex items-center justify-center text-xl font-bold">
                  {initials(trainer.user.fullName)}
                </div>
              )}
              <h2 className="mt-4 text-lg font-bold text-navy-900">{trainer.user.fullName}</h2>
              <span className={`mt-2 text-xs font-bold px-2.5 py-1 rounded-full ${trainer.user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {trainer.user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-5 space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5 text-navy-600"><Mail className="w-4 h-4 text-navy-400 shrink-0" /> <span className="truncate">{trainer.user.email}</span></div>
              <div className="flex items-center gap-2.5 text-navy-600"><Phone className="w-4 h-4 text-navy-400 shrink-0" /> {trainer.user.mobileNumber}</div>
              <div className="flex items-center gap-2.5 text-navy-600"><Briefcase className="w-4 h-4 text-navy-400 shrink-0" /> {trainer.experienceYears} year{trainer.experienceYears === 1 ? '' : 's'} experience</div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h3 className="font-bold text-navy-900 mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-orange-500" /> Qualification &amp; Expertise</h3>
              <InfoRow label="Experience" value={`${trainer.experienceYears} year${trainer.experienceYears === 1 ? '' : 's'}`} />
              <InfoRow label="Availability" value={trainer.availability} />
              {trainer.expertise?.length > 0 && (
                <div className="pt-3">
                  <p className="text-sm text-navy-500 mb-2">Tech Stack / Expertise</p>
                  <div className="flex flex-wrap gap-2">
                    {trainer.expertise.map((skill: string) => (
                      <span key={skill} className="text-xs font-bold bg-orange-50 text-orange-600 px-3 py-1 rounded-full">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              {trainer.bio && (
                <div className="pt-4 mt-1 border-t border-navy-50">
                  <p className="text-sm text-navy-500 mb-1.5">Bio</p>
                  <p className="text-sm text-navy-700 leading-relaxed whitespace-pre-wrap">{trainer.bio}</p>
                </div>
              )}
            </div>

            {trainer.internships?.length > 0 && (
              <div className="card p-6">
                <h3 className="font-bold text-navy-900 mb-3">Assigned Internships ({trainer.internships.length})</h3>
                <div className="space-y-2">
                  {trainer.internships.map((i: any) => (
                    <div key={i.id} className="flex items-center justify-between gap-3 py-2 border-b border-navy-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-800 truncate">{i.title}</p>
                        <p className="text-xs text-navy-400">Starts {formatDate(i.startDate)}</p>
                      </div>
                      <StatusBadge status={i.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
