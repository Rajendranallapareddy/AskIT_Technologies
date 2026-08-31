import { useEffect, useRef, useState } from 'react';
import { Users, Briefcase, GraduationCap, BookOpen, Award, Building2 } from 'lucide-react';
import { publicApi } from '../../api/endpoints';

function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame: number;
    const duration = 1400;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);
  return value;
}

function StatItem({ icon: Icon, value, label, active }: { icon: any; value: number; label: string; active: boolean }) {
  const count = useCountUp(value, active);
  return (
    <div className="text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-orange-400" />
      </div>
      <p className="text-3xl font-extrabold text-white">{count}+</p>
      <p className="text-sm text-navy-300 mt-1">{label}</p>
    </div>
  );
}

export default function Stats() {
  const [stats, setStats] = useState({
    studentsTrained: 1200, internshipsConducted: 85, trainers: 12, courses: 6, placementSuccessRate: 92, hiringCompanies: 48,
  });
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    publicApi.stats().then((res) => setStats(res.data.data)).catch(() => {});
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setActive(true), { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="bg-navy-900 py-16">
      <div className="container-page grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
        <StatItem icon={Users} value={stats.studentsTrained} label="Students Trained" active={active} />
        <StatItem icon={Briefcase} value={stats.internshipsConducted} label="Internships Conducted" active={active} />
        <StatItem icon={GraduationCap} value={stats.trainers} label="Expert Trainers" active={active} />
        <StatItem icon={BookOpen} value={stats.courses} label="Courses Offered" active={active} />
        <StatItem icon={Award} value={stats.placementSuccessRate} label="Placement Success %" active={active} />
        <StatItem icon={Building2} value={stats.hiringCompanies} label="Hiring Companies" active={active} />
      </div>
    </section>
  );
}
