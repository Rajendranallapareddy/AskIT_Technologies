import { useEffect, useState } from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { publicApi } from '../../api/endpoints';
import type { Course } from '../../types';
import { CardSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from './_PageHeader';
import Seo from '../../components/common/Seo';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[] | null>(null);

  useEffect(() => {
    publicApi.courses().then((res) => setCourses(res.data.data)).catch(() => setCourses([]));
  }, []);

  return (
    <>
      <Seo
        title="IT Courses"
        description="Explore industry-aligned IT courses from ASK IT Technologies across Cloud, Development, and Database technologies — real-time project experience included."
        path="/courses"
        keywords={['IT courses', 'cloud computing course', 'development course', 'database course']}
      />
      <PageHeader title="Our Courses" subtitle="Industry-aligned programs across Cloud, Development, and Database technologies." />
      <section className="py-16">
        <div className="container-page grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses === null && Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          {courses?.length === 0 && <EmptyState title="Courses coming soon" description="We're updating our course catalog." />}
          {courses?.map((c) => (
            <div key={c.id} className="card p-6">
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">{c.category}</span>
              <h3 className="font-bold text-navy-900 mt-3 text-lg">{c.title}</h3>
              <p className="text-sm text-navy-500 mt-2 leading-relaxed">{c.description}</p>
              {c.syllabus?.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {c.syllabus.slice(0, 4).map((s) => (
                    <li key={s} className="text-xs text-navy-600 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-orange-500" /> {s}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-navy-500">
                  <Clock className="w-3.5 h-3.5" /> {c.duration}
                </span>
                <a href="/internships" className="text-orange-600 text-sm font-bold hover:underline flex items-center gap-1">
                  Apply <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
