import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, MapPin, ArrowRight } from 'lucide-react';
import { publicApi } from '../../api/endpoints';
import type { Internship } from '../../types';
import { formatDate } from '../../utils/formatters';
import StatusBadge from '../common/StatusBadge';
import { CardSkeleton } from '../common/Skeleton';

export default function Internships() {
  const [internships, setInternships] = useState<Internship[] | null>(null);

  useEffect(() => {
    publicApi.internships({ limit: 3 }).then((res) => setInternships(res.data.data)).catch(() => setInternships([]));
  }, []);

  return (
    <section className="py-20 bg-navy-50/60">
      <div className="container-page">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="section-label">Internship Programs</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-4">Kickstart Your Career With Real Projects</h2>
          </div>
          <Link to="/internships" className="btn-outline shrink-0">View All Internships <ArrowRight className="w-4 h-4" /></Link>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {internships === null && Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          {internships?.length === 0 && (
            <p className="text-navy-500 col-span-full text-center py-10">New internship batches are opening soon. Check back shortly!</p>
          )}
          {internships?.map((i) => (
            <div key={i.id} className="card p-6">
              <div className="flex items-center justify-between">
                <StatusBadge status={i.status} />
                <span className="text-xs font-semibold text-navy-400">{i.mode}</span>
              </div>
              <h3 className="font-bold text-navy-900 mt-3 text-lg">{i.title}</h3>
              <p className="text-sm text-navy-500 mt-2 line-clamp-2 leading-relaxed">{i.description}</p>
              <div className="mt-4 space-y-2 text-xs text-navy-500 font-medium">
                <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Starts {formatDate(i.startDate)} • {i.duration}</p>
                <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {Math.max(i.totalSeats - i.seatsFilled, 0)} seats left of {i.totalSeats}</p>
                {i.trainer?.user && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Trainer: {i.trainer.user.fullName}</p>}
              </div>
              <Link to={`/internships/${i.slug}`} className="btn-primary w-full mt-5">Register Now</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
