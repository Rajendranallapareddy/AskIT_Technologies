import { BookOpen, Code2, FileText, Users2, Trophy, Mail } from 'lucide-react';

const STEPS = [
  { icon: BookOpen, title: 'Training', text: 'Structured curriculum with hands-on assignments.' },
  { icon: Code2, title: 'Projects', text: 'Build real-time projects that go on your resume.' },
  { icon: FileText, title: 'Resume', text: 'Get a recruiter-ready resume, reviewed 1-on-1.' },
  { icon: Users2, title: 'Mock Interview', text: 'Practice with real interview simulations.' },
  { icon: Trophy, title: 'Placement', text: 'We connect you with our 48+ hiring partners.' },
  { icon: Mail, title: 'Offer Letter', text: 'Celebrate your offer — and start your career.' },
];

export default function Placement() {
  return (
    <section className="py-20">
      <div className="container-page">
        <div className="text-center max-w-2xl mx-auto">
          <span className="section-label">Placement Assistance</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-4">Your Journey From Student to Hired</h2>
        </div>
        <div className="mt-14 relative">
          <div className="hidden lg:block absolute top-8 left-0 right-0 h-0.5 bg-navy-100" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-8">
            {STEPS.map((step, idx) => (
              <div key={step.title} className="relative text-center">
                <div className="relative z-10 w-16 h-16 mx-auto rounded-2xl bg-white border-4 border-navy-100 flex items-center justify-center shadow-card">
                  <step.icon className="w-6 h-6 text-orange-500" />
                </div>
                <p className="mt-4 font-bold text-navy-900 text-sm">{idx + 1}. {step.title}</p>
                <p className="text-xs text-navy-500 mt-1.5 leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
