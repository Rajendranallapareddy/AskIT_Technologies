import { Link } from 'react-router-dom';
import { ArrowRight, PlayCircle, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 text-white">
      <div className="absolute inset-0 bg-hero-grid bg-[size:40px_40px] opacity-40" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-navy-400/20 rounded-full blur-3xl" />

      <div className="container-page relative py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" /> Quality Training. Real Results.
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.1]">
            Learn Today, Grow Tomorrow,<span className="text-orange-400"> Succeed Always.</span>
          </h1>
          <p className="mt-6 text-navy-200 text-lg max-w-xl leading-relaxed">
            ASK IT Technologies delivers quality IT training at low prices, with real-time project
            experience, interview guidance, and 100% placement assistance — until you land your dream job.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/register" className="btn-primary text-base">
              Enroll Now <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/internships" className="btn-ghost text-base">
              Apply for Internship
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 text-sm font-semibold text-navy-200 hover:text-white px-2">
              <PlayCircle className="w-9 h-9 text-orange-400" /> Book a Free Demo
            </Link>
          </div>
        </div>

        <div className="relative hidden lg:block animate-fade-up">
          <div className="relative bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Students Trained', value: '1200+' },
                { label: 'Placement Success', value: '92%' },
                { label: 'Hiring Partners', value: '48+' },
                { label: 'Expert Trainers', value: '12+' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/10 rounded-2xl p-5 border border-white/10 animate-float">
                  <p className="text-2xl font-extrabold text-orange-400">{stat.value}</p>
                  <p className="text-xs text-navy-200 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-6 -left-6 bg-white text-navy-900 rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-3 animate-float">
            <span className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">✓</span>
            <div>
              <p className="text-sm font-bold">You're Hired!</p>
              <p className="text-xs text-navy-500">100% Placement Assistance</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
