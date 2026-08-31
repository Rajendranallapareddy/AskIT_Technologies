import { Target, Eye, Trophy } from 'lucide-react';

export default function About() {
  return (
    <section className="py-20">
      <div className="container-page grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="section-label">About ASK IT</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-4 leading-tight">
            Building Careers Through Practical, Industry-Focused Training
          </h2>
          <p className="mt-5 text-navy-600 leading-relaxed">
            ASK IT Technologies is an IT training and internship organization dedicated to bridging the
            gap between academic learning and industry expectations. We combine affordable, high-quality training
            with real-time project experience, so every student graduates job-ready — not just certificate-ready.
          </p>
          <p className="mt-4 text-navy-600 leading-relaxed">
            From Azure and AWS to full-stack Java, Python, and .NET development, our curriculum is built around what
            companies are actually hiring for today, taught by trainers who work in the industry.
          </p>
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {[
              { icon: Target, title: 'Our Mission', text: 'Make quality IT education accessible and outcome-driven for every learner.' },
              { icon: Eye, title: 'Our Vision', text: 'Become the most trusted internship & placement partner for aspiring tech professionals.' },
              { icon: Trophy, title: 'Achievements', text: '1200+ students trained with a 92% placement success rate across 48+ hiring partners.' },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-2xl bg-navy-50 border border-navy-100">
                <item.icon className="w-6 h-6 text-orange-500 mb-2" />
                <p className="font-bold text-navy-900 text-sm">{item.title}</p>
                <p className="text-xs text-navy-500 mt-1 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-navy-700 to-navy-900 aspect-[4/3] flex items-center justify-center">
            <div className="text-center text-white p-10">
              <p className="text-6xl font-extrabold text-orange-400">ASK<span className="text-white">IT</span></p>
              <p className="mt-3 text-navy-200 font-semibold tracking-wide">Technologies</p>
              <p className="mt-6 text-sm text-navy-300 max-w-sm mx-auto">
                "They say money can't buy happiness — but it can buy our courses, and that's almost the same thing."
              </p>
            </div>
          </div>
          <div className="absolute -bottom-6 -right-6 bg-orange-500 text-white rounded-2xl shadow-xl px-6 py-4 animate-float">
            <p className="text-2xl font-extrabold">100%</p>
            <p className="text-xs">Placement Assistance</p>
          </div>
        </div>
      </div>
    </section>
  );
}
