import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { initials } from '../../utils/formatters';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

// Read-focused trainer directory under Admin → Users → Trainers. Full
// trainer management (create/edit/assign/delete) stays on the existing
// Admin → Trainers page — this one is purely "browse, then view details."
export default function UsersTrainers() {
  const links = useAdminLinks();
  const navigate = useNavigate();
  const toast = useToast();
  const [trainers, setTrainers] = useState<any[] | null>(null);

  useEffect(() => {
    adminApi.trainers().then((res) => setTrainers(res.data.data)).catch((err) => { setTrainers([]); toast.error(getErrorMessage(err)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Trainers">
      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-1.5 text-sm font-semibold text-navy-500 hover:text-orange-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {trainers === null ? (
        <LoadingSpinner />
      ) : trainers.length === 0 ? (
        <EmptyState title="No trainers yet" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainers.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/admin/users/trainers/${t.id}`)}
              className="card p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-3">
                {t.photo ? (
                  <img src={t.photo} alt={t.user.fullName} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-navy-700 text-white flex items-center justify-center font-bold shrink-0">
                    {initials(t.user.fullName)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-navy-900 truncate">{t.user.fullName}</p>
                  <p className="text-xs text-navy-400 truncate">{t.user.email}</p>
                </div>
              </div>
              {t.expertise?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {t.expertise.slice(0, 3).map((skill: string) => (
                    <span key={skill} className="text-[11px] font-semibold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{skill}</span>
                  ))}
                  {t.expertise.length > 3 && <span className="text-[11px] font-semibold text-navy-400">+{t.expertise.length - 3} more</span>}
                </div>
              )}
              <p className="text-xs text-navy-400 mt-3">{t.experienceYears} yr{t.experienceYears === 1 ? '' : 's'} experience · {t._count?.internships ?? 0} internship{t._count?.internships === 1 ? '' : 's'}</p>
            </button>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
