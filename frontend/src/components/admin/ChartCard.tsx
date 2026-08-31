import { ReactNode } from 'react';

export default function ChartCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-navy-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
