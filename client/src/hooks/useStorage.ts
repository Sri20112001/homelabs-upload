import { useState, useEffect } from 'react';
import { filesApi } from '../api/files';
import { STORAGE_POLL_MS } from '../config/app';
import type { StorageInfo } from '../types';

export function useStorage() {
  const [data, setData] = useState<StorageInfo | null>(null);

  useEffect(() => {
    filesApi.storage().then(setData).catch(() => null);
    const id = setInterval(() => filesApi.storage().then(setData).catch(() => null), STORAGE_POLL_MS);
    return () => clearInterval(id);
  }, []);

  return data;
}
