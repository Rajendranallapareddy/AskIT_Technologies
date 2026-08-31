import { AlertTriangle } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

// Used wherever a data fetch can fail (permission denied, network error,
// etc.) so the page shows a clear message instead of spinning forever.
export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-navy-800">Something went wrong</h3>
      <p className="text-sm text-navy-500 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5 !py-2 text-sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
