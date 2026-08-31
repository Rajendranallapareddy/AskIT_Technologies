import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, Cloud, Coffee, FileCode2, Database, Boxes } from 'lucide-react';
import { publicApi } from '../../api/endpoints';
import type { Course } from '../../types';
import { CardSkeleton } from '../common/Skeleton';

const ICONS: Record<string, any> = {
  Cloud, Development: Coffee, Database, default: Boxes,
};

export default function Courses() {
  const [courses, setCourses] = useState<Course[] | null>(null);

  useEffect(() => {
    publicApi.courses().then((res) => setCourses(res.data.data)).catch(() => setCourses([]));
  }, []);

  return (
    <section className="py-20">
      <div className="container-page">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="section-label">Our Courses</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-4">Trust the ASK IT & Learn Today</h2>
          </div>
          <Link to="/courses" className="btn-outline shrink-0">View All Courses <ArrowRight className="w-4 h-4" /></Link>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses === null &&
            Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          {courses?.map((course) => {
            const Icon = ICONS[course.category] || ICONS.default;
            return (
              <div key={course.id} className="card overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center">
                  <Icon className="w-12 h-12 text-orange-400" />
                </div>
                <div className="p-6">
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">{course.category}</span>
                  <h3 className="font-bold text-navy-900 mt-3 text-lg">{course.title}</h3>
                  <p className="text-sm text-navy-500 mt-2 line-clamp-2 leading-relaxed">{course.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-navy-500">
                      <Clock className="w-3.5 h-3.5" /> {course.duration}
                    </span>
                    <Link to={`/courses`} className="text-orange-600 text-sm font-bold hover:underline">Learn More →</Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
