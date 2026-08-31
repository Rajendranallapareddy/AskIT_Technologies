import Testimonials from '../../components/sections/Testimonials';
import PageHeader from './_PageHeader';
import Seo from '../../components/common/Seo';
import { Briefcase } from 'lucide-react';

const STORIES = [
  { name: 'Priya Sharma', role: 'Java Developer', company: 'Placed via ASK IT Hiring Partner', text: 'From zero backend experience to a full-time Java developer role in 4 months.' },
  { name: 'Rahul Verma', role: 'Cloud Support Engineer', company: 'Placed via ASK IT Hiring Partner', text: 'The Azure internship gave me real infra experience recruiters actually asked about.' },
  { name: 'Sneha Reddy', role: 'Python Developer', company: 'Placed via ASK IT Hiring Partner', text: 'Mock interviews were tougher than my real ones — which made the real one easy.' },
];

export default function SuccessStories() {
  return (
    <>
      <Seo
        title="Student Success Stories"
        description="Real students, real placements, real growth — read success stories from students trained and placed through ASK IT Technologies."
        path="/success-stories"
      />
      <PageHeader title="Student Success Stories" subtitle="Real students. Real placements. Real growth." />
      <section className="py-16">
        <div className="container-page grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {STORIES.map((s) => (
            <div key={s.name} className="card p-6">
              <Briefcase className="w-6 h-6 text-orange-500 mb-3" />
              <p className="text-sm text-navy-600 leading-relaxed">"{s.text}"</p>
              <p className="font-bold text-navy-900 mt-4">{s.name}</p>
              <p className="text-xs text-navy-500">{s.role} — {s.company}</p>
            </div>
          ))}
        </div>
      </section>
      <Testimonials />
    </>
  );
}
