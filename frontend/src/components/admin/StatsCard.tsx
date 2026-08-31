import { LucideIcon, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: 'orange' | 'navy' | 'green' | 'red';
  to?: string; // when set, the whole card becomes a clickable link
}

const ACCENTS = {
  orange: 'bg-orange-50 text-orange-600',
  navy: 'bg-navy-50 text-navy-700',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
};

export default function StatsCard({ icon: Icon, label, value, accent = 'navy', to }: StatsCardProps) {
  const content = (
    <>
      <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${ACCENTS[accent]}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="flex-1">
        <p className="text-2xl font-extrabold text-navy-900">{value}</p>
        <p className="text-xs text-navy-500 font-medium">{label}</p>
      </div>
      {to && <ChevronRight className="w-4 h-4 text-navy-300 shrink-0" />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="card p-5 flex items-center gap-4 hover:border-orange-300 hover:shadow-card-hover transition group">
        {content}
      </Link>
    );
  }

  return <div className="card p-5 flex items-center gap-4">{content}</div>;
}
