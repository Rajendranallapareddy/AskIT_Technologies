import { BadgeCheck, Code2, Briefcase, HeartHandshake, FileText, Users2, GraduationCap, Wallet, Award, Compass } from 'lucide-react';

const FEATURES = [
  { icon: BadgeCheck, title: 'Quality Training', text: 'Structured, up-to-date curriculum taught by working professionals.' },
  { icon: Code2, title: 'Real-Time Projects', text: 'Build production-style projects, not just tutorials.' },
  { icon: Briefcase, title: 'Internship Programs', text: 'Hands-on internships with real deliverables and deadlines.' },
  { icon: HeartHandshake, title: 'Placement Assistance', text: 'We stand with you until you get placed — no exceptions.' },
  { icon: FileText, title: 'Resume Building', text: 'One-on-one resume reviews tailored to each role you target.' },
  { icon: Users2, title: 'Mock Interviews', text: 'Practice with real interview panels before the real thing.' },
  { icon: GraduationCap, title: 'Industry Experts', text: 'Learn from trainers currently working at product & service companies.' },
  { icon: Wallet, title: 'Affordable Fees', text: 'Premium training without the premium price tag.' },
  { icon: Award, title: 'Certifications', text: 'Verifiable certificates recognized by our hiring partners.' },
  { icon: Compass, title: 'Career Guidance', text: 'Personalized roadmaps based on your goals and background.' },
];

export default function WhyChooseUs() {
  return (
    <section className="py-20 bg-navy-50/60">
      <div className="container-page">
        <div className="text-center max-w-2xl mx-auto">
          <span className="section-label">Why Choose ASK IT</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-4">Everything You Need to Get Hired</h2>
          <p className="mt-3 text-navy-600">
            We built ASK IT around one goal: turning learners into hired professionals.
          </p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5 group">
              <div className="w-11 h-11 rounded-xl bg-navy-700 group-hover:bg-orange-500 transition flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-bold text-navy-900 text-sm">{f.title}</p>
              <p className="text-xs text-navy-500 mt-1.5 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
