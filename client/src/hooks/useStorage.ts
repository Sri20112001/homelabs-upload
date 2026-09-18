import { useState, useEffect } from 'react';
import { filesApi } from '../api/files';
import type { StorageInfo } from '../types';

export function useStorage() {
  const [data, setData] = useState<StorageInfo | null>(null);

  useEffect(() => {
    filesApi.storage().then(setData).catch(() => null);
    const id = setInterval(() => filesApi.storage().then(setData).catch(() => null), 30_000);
    return () => clearInterval(id);
  }, []);

  return data;
}
