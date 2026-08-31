import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users } from 'lucide-react';
import { publicApi } from '../../api/endpoints';
import type { Internship } from '../../types';
import { formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/common/StatusBadge';
import { CardSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import SearchBar from '../../components/common/SearchBar';
import FilterPanel from '../../components/common/FilterPanel';
import Pagination from '../../components/common/Pagination';
import PageHeader from './_PageHeader';
import Seo from '../../components/common/Seo';

export default function InternshipsPage() {
  const [internships, setInternships] = useState<Internship[] | null>(null);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounced fetch: waits 400ms after the last change to search/mode/page
  // before calling the API. Using useEffect's cleanup function to cancel the
  // previous timer is what actually makes this debounce correctly — a
  // debounce() helper re-created on every render (the previous approach)
  // gets a fresh timer each time and never cancels the prior one.
  useEffect(() => {
    setInternships(null);
    const timer = setTimeout(() => {
      publicApi
        .internships({ search: search || undefined, mode: mode || undefined, page, limit: 6 })
        .then((res) => {
          setInternships(res.data.data);
          setTotalPages(res.data.meta?.totalPages || 1);
        })
        .catch(() => setInternships([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [search, mode, page]);

  return (
    <>
      <Seo
        title="Internship Programs"
        description="Apply for hands-on, mentor-led IT internships with real project experience at ASK IT Technologies, Hyderabad — online, offline, and hybrid batches available."
        path="/internships"
        keywords={['IT internships', 'software internship Hyderabad', 'online internship', 'internship with certificate']}
      />
      <PageHeader title="Internship Programs" subtitle="Apply for hands-on, mentor-led internships with real project experience." />
      <section className="py-16">
        <div className="container-page">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
            <SearchBar value={search} onChange={(v) => { setPage(1); setSearch(v); }} placeholder="Search internships…" />
            <FilterPanel
              label="Mode"
              value={mode}
              onChange={(v) => { setPage(1); setMode(v); }}
              options={[{ label: 'All', value: '' }, { label: 'Online', value: 'ONLINE' }, { label: 'Offline', value: 'OFFLINE' }, { label: 'Hybrid', value: 'HYBRID' }]}
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {internships === null && Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            {internships?.length === 0 && (
              <div className="col-span-full">
                <EmptyState title="No internships found" description="Try a different search or check back soon for new batches." />
              </div>
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
                  <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {Math.max(i.totalSeats - i.seatsFilled, 0)} seats left</p>
                </div>
                <Link to={`/internships/${i.slug}`} className="btn-primary w-full mt-5">View & Register</Link>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </section>
    </>
  );
}
