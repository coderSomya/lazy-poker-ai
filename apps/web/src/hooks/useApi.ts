import { useState, useEffect, useCallback } from 'react';

export function useApi<T>(url: string, refreshInterval?: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetch_();
    if (refreshInterval) {
      const id = setInterval(fetch_, refreshInterval);
      return () => clearInterval(id);
    }
  }, [fetch_, refreshInterval]);

  return { data, loading, error, refetch: fetch_ };
}
