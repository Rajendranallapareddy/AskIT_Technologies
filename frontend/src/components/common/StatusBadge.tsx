import { statusColor } from '../../utils/formatters';

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor(status)}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
