import { useState, useEffect, useCallback, useRef } from 'react';
import { filesApi } from '../api/files';
import type { ListResponse } from '../types';

export function useDirectory(path: string) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (p: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const res = await filesApi.list(p, ctrl.signal);
      setData(res);
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message ?? 'Failed to load directory');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(path);
    return () => abortRef.current?.abort();
  }, [path, load]);

  return { data, loading, error, reload: () => load(path) };
}
