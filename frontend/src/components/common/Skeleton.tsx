import { classNames } from '../../utils/helpers';

export default function Skeleton({ className }: { className?: string }) {
  return <div className={classNames('animate-pulse bg-navy-100 rounded-lg', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="card p-6 space-y-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-9 w-28" />
    </div>
  );
}
