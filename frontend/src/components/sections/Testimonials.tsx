import { useEffect, useState } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight, MessageSquareText } from 'lucide-react';
import { publicApi } from '../../api/endpoints';
import { initials } from '../../utils/formatters';

export default function Testimonials() {
  // Same fix as the Trainers section: no more hardcoded sample reviews
  // standing in for real data. null = loading, [] = genuinely no
  // testimonials published yet.
  const [items, setItems] = useState<any[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    publicApi.testimonials().then((res) => setItems(res.data.data)).catch(() => setItems([]));
  }, []);

  if (items === null) return null; // avoid a layout flash while loading
  if (items.length === 0) return null; // nothing genuine to show yet — section simply doesn't render

  const current = items[index % items.length];

  return (
    <section className="py-20 bg-navy-900 text-white relative overflow-hidden">
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="container-page relative">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block text-orange-400 font-bold tracking-wider text-xs uppercase bg-white/10 px-3 py-1 rounded-full">
            Student Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-4">What Our Students Say</h2>
        </div>

        <div className="mt-12 max-w-2xl mx-auto text-center">
          <Quote className="w-10 h-10 text-orange-400 mx-auto mb-4" />
          <p className="text-lg leading-relaxed text-navy-100">"{current.review}"</p>
          <div className="flex justify-center gap-1 mt-5">
            {Array.from({ length: current.rating || 5 }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-orange-400 text-orange-400" />
            ))}
          </div>
          <div className="mt-5 flex items-center justify-center gap-3">
            <span className="w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center font-bold text-sm">
              {initials(current.name)}
            </span>
            <div className="text-left">
              <p className="font-bold">{current.name}</p>
              <p className="text-xs text-navy-300">{current.role}</p>
            </div>
          </div>

          {items.length > 1 && (
            <div className="flex justify-center gap-3 mt-8">
              <button onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setIndex((i) => (i + 1) % items.length)} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
