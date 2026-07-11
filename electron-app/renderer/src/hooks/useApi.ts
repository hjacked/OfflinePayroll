import { useCallback, useState } from 'react';

export function useApi<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async (operation: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      return await operation();
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : 'Unknown error';
      setError(message);
      throw reason;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, call };
}

export default useApi;
