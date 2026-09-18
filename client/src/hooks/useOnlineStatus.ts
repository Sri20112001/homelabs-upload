import { useState, useEffect } from 'react';

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

  // Also poll /health every 15s to detect server-down (not just network-down)
  useEffect(() => {
    const check = () => {
      fetch('/health', { method: 'GET', cache: 'no-store' })
        .then((r) => setOnline(r.ok))
        .catch(() => setOnline(false));
    };
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, []);

  return online;
}
