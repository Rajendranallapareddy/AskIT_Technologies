import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-navy-500">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
