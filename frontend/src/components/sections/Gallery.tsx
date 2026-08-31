import { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { publicApi } from '../../api/endpoints';

export default function Gallery() {
  const [images, setImages] = useState<any[]>([]);

  useEffect(() => {
    publicApi.gallery().then((res) => setImages(res.data.data)).catch(() => setImages([]));
  }, []);

  const placeholders = Array.from({ length: 6 });

  return (
    <section className="py-20 bg-navy-50/60">
      <div className="container-page">
        <div className="text-center max-w-2xl mx-auto">
          <span className="section-label">Gallery</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-4">Moments From ASK IT</h2>
        </div>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-4">
          {(images.length ? images : placeholders).map((img: any, idx: number) => (
            <div
              key={img?.id || idx}
              className={`rounded-2xl overflow-hidden bg-gradient-to-br from-navy-200 to-navy-400 flex items-center justify-center ${
                idx === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
              }`}
            >
              {img?.imageUrl ? (
                <img src={img.imageUrl} alt={img.caption || 'Gallery'} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-white/70" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
