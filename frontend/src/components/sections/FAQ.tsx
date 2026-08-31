import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  { q: 'Do I need prior coding experience to join?', a: 'No. Our courses are designed for beginners as well as working professionals. We start with fundamentals before moving to advanced, real-time projects.' },
  { q: 'Are classes online or offline?', a: 'Both. Classes are conducted virtually through interactive live sessions with recorded access, while placement assistance (interviews, company visits) is handled in person.' },
  { q: 'What is included in placement assistance?', a: 'Resume building, mock interviews, expert tips, and continuous support until you are placed — at no extra cost after enrollment.' },
  { q: 'How long do courses take?', a: 'Most programs run 3 to 4 months, depending on the course and your pace.' },
  { q: 'Will I get a certificate?', a: 'Yes, every student who completes an internship or course receives a verifiable ASK IT certificate.' },
  { q: 'What if I miss a live class?', a: 'All sessions are recorded, so you can catch up anytime and revisit topics whenever you need to.' },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-20">
      <div className="container-page max-w-3xl">
        <div className="text-center">
          <span className="section-label">FAQ</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-4">Frequently Asked Questions</h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map((item, idx) => (
            <div key={item.q} className="border border-navy-100 rounded-2xl overflow-hidden bg-white">
              <button
                onClick={() => setOpen(open === idx ? null : idx)}
                className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-navy-800"
              >
                {item.q}
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open === idx ? 'rotate-180 text-orange-500' : 'text-navy-400'}`} />
              </button>
              <div className={`grid transition-all duration-300 ${open === idx ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <p className="px-6 pb-4 text-sm text-navy-500 leading-relaxed">{item.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
