import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../utils/helpers';

// A minimal data-fetching hook (no external library) that covers the loading
// / error / refetch needs of this app's dashboards and listing pages.
export function useApiQuery<T>(fetcher: () => Promise<{ data: { data: T } }>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      setData(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, isLoading, error, refetch: run, setData };
}
