import { formatDateTime } from '../../utils/formatters';
import EmptyState from '../common/EmptyState';
import { Activity } from 'lucide-react';

interface ActivityItem {
  id: string;
  description: string;
  createdAt: string;
  actor?: { fullName: string; role: string } | null;
}

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items.length) return <EmptyState title="No recent activity" icon={<Activity className="w-8 h-8" />} />;
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3">
          <span className="w-2 h-2 mt-2 rounded-full bg-orange-500 shrink-0" />
          <div>
            <p className="text-sm text-navy-800 font-medium">{item.description}</p>
            <p className="text-xs text-navy-400 mt-0.5">
              {item.actor?.fullName || 'System'} • {formatDateTime(item.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
