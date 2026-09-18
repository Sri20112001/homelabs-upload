import { client } from './client';
import type { AuthUser } from '../types';

export const usersApi = {
  async list(): Promise<{ items: AuthUser[] }> {
    const res = await client.get<{ items: AuthUser[] }>('/users');
    return { ...res, items: res.items ?? [] };
  },
  create(username: string, displayName: string, password: string, role: string): Promise<{ user: AuthUser }> {
    return client.post('/users', { username, display_name: displayName, password, role });
  },
  update(id: string, patch: { display_name?: string; role?: string; password?: string }): Promise<{ user: AuthUser }> {
    return client.patch(`/users/${id}`, patch);
  },
  remove(id: string): Promise<{ message: string }> {
    return client.delete(`/users/${id}`, {});
  },
};
