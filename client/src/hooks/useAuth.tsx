import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  setupNeeded: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  setup: (username: string, displayName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Selector hook over the zustand auth store — same shape as before, so all
// screens keep working unchanged. No AuthProvider needed anymore.
export function useAuth(): AuthState {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setupNeeded = useAuthStore((s) => s.setupNeeded);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const login = useAuthStore((s) => s.login);
  const setup = useAuthStore((s) => s.setup);
  const logout = useAuthStore((s) => s.logout);
  const refresh = useAuthStore((s) => s.refresh);

  useEffect(() => {
    void useAuthStore.getState().boot();
  }, []);

  return { user, loading, setupNeeded, isAdmin, login, setup, logout, refresh };
}
