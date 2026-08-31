import { useEffect, useState } from 'react';
import { Award, GraduationCap } from 'lucide-react';
import { publicApi } from '../../api/endpoints';
import { initials } from '../../utils/formatters';
import EmptyState from '../common/EmptyState';
import { CardSkeleton } from '../common/Skeleton';

export default function Trainers() {
  // null = still loading, [] = loaded and genuinely empty. This used to fall
  // back to 4 hardcoded sample names when the API returned no trainers,
  // which made the public site claim trainers existed when the database was
  // actually empty. It now always reflects real data from the admin panel.
  const [trainers, setTrainers] = useState<any[] | null>(null);

  useEffect(() => {
    publicApi.trainers().then((res) => setTrainers(res.data.data)).catch(() => setTrainers([]));
  }, []);

  return (
    <section className="py-20">
      <div className="container-page">
        <div className="text-center max-w-2xl mx-auto">
          <span className="section-label">Our Trainers</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-4">Learn From Industry Experts</h2>
          <p className="mt-3 text-navy-600">Every trainer at ASK IT is a working professional, not just an instructor.</p>
        </div>

        {trainers === null ? (
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : trainers.length === 0 ? (
          <div className="mt-12">
            <EmptyState
              icon={<GraduationCap className="w-8 h-8" />}
              title="Trainer profiles coming soon"
              description="Our trainer lineup is being added by the ASK IT team — check back shortly."
            />
          </div>
        ) : (
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trainers.map((t: any) => (
              <div key={t.id} className="card p-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-navy-700 text-white flex items-center justify-center text-xl font-bold overflow-hidden">
                  {t.photo ? <img src={t.photo} alt={t.name} className="w-full h-full object-cover" /> : initials(t.name)}
                </div>
                <h3 className="font-bold text-navy-900 mt-4">{t.name}</h3>
                <p className="text-xs text-orange-600 font-semibold mt-1 flex items-center justify-center gap-1">
                  <Award className="w-3.5 h-3.5" /> {t.experienceYears}+ yrs experience
                </p>
                {t.bio && <p className="text-xs text-navy-500 mt-2 leading-relaxed">{t.bio}</p>}
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {(t.expertise || []).slice(0, 3).map((e: string) => (
                    <span key={e} className="text-[10px] font-bold bg-navy-50 text-navy-600 px-2 py-1 rounded-full">{e}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
