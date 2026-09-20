import { useState, useEffect } from 'react';

// Browser online/offline events only — no polling. (A previous version hit
// /health every 15s: wasteful, and it used a root-absolute path that broke
// under subpath hosting and never reached the backend on split hosting.
// Server-down is already surfaced per-request via friendly API errors,
// and a dead session bounces to /login through the shared client.)
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const setTrue = () => setOnline(true);
    const setFalse = () => setOnline(false);
    window.addEventListener('online', setTrue);
    window.addEventListener('offline', setFalse);
    return () => {
      window.removeEventListener('online', setTrue);
      window.removeEventListener('offline', setFalse);
    };
  }, []);

  return online;
}
