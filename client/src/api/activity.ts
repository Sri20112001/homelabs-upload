import { client } from './client';
import type { ActivityEntry } from '../types';

export interface ActivityQuery {
  limit?: number;
  user?: string;
  action?: string;
  q?: string;
}

export const activityApi = {
  async list(q: ActivityQuery = {}): Promise<{ items: ActivityEntry[]; total: number }> {
    const params = new URLSearchParams();
    if (q.limit) params.set('limit', String(q.limit));
    if (q.user) params.set('user', q.user);
    if (q.action) params.set('action', q.action);
    if (q.q) params.set('q', q.q);
    const suffix = params.toString() ? `?${params}` : '';
    const res = await client.get<{ items: ActivityEntry[]; total: number }>(`/activity${suffix}`);
    return { items: res.items ?? [], total: res.total ?? 0 };
  },
  // Logs are append-only and immutable (server returns 410 on DELETE).
  // No clear/alter/delete API exists by design.
};
