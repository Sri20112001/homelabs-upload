import { useSyncExternalStore } from 'react';
import { filesApi } from '../api/files';
import type { StorageInfo } from '../types';

// Shared across ALL hook instances (TopBar pill, …): one in-flight request,
// zero duplicates. NO polling — storage refreshes explicitly via
// refreshStorage(), called when something actually changed it
// (e.g. after an upload completes in useTransfers).
let cached: StorageInfo | null = null;
let listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function emit() {
  for (const l of listeners) l();
}

function fetchFresh() {
  if (!inflight) {
    inflight = filesApi
      .storage()
      .then((d) => {
        cached = d;
        emit();
      })
      .catch(() => null)
      .then(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Re-fetch storage now (deduped). Call after uploads/deletes/trashes. */
export function refreshStorage() {
  return fetchFresh();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    fetchFresh();
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): StorageInfo | null {
  return cached;
}

export function useStorage() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
