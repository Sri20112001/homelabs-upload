import { API_BASE_URL } from '../config/app';
import { client } from './client';
import type { AuthUser } from '../types';

async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    // include so the browser stores the HttpOnly nv_session cookie,
    // including cross-origin when CORS allows credentials.
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  status(): Promise<{ setup_needed: boolean; user_count: number }> {
    return fetch(`${API_BASE_URL}/auth/status`).then((r) => r.json());
  },
  setup(username: string, displayName: string, password: string): Promise<{ token: string; user: AuthUser }> {
    return publicPost('/auth/setup', { username, display_name: displayName, password });
  },
  login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    return publicPost('/auth/login', { username, password });
  },
  logout(): Promise<{ message: string }> {
    // best-effort: server revokes the session and clears the cookie anyway
    return fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => r.json())
      .catch(() => ({ message: 'logged out' }));
  },
  me(): Promise<{ user: AuthUser }> {
    return client.get('/auth/me');
  },
};
