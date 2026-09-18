import { useEffect, useRef } from 'react';
import { filesApi } from '../api/files';

export function useDirectoryWatcher(path: string, onChanged: () => void) {
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    const es = filesApi.watchDirectory(path);
    es.onmessage = () => onChangedRef.current();
    es.onerror = () => es.close();
    return () => es.close();
  }, [path]);
}
