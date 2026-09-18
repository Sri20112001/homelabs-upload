import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
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

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);

  // Session lives in the HttpOnly cookie — just ask the server who we are.
  const refresh = useCallback(async () => {
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await authApi.status();
        setSetupNeeded(s.setup_needed);
      } catch {
        /* backend unreachable — pages show their own error */
      }
      await refresh();
    })();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const { user } = await authApi.login(username, password);
    setUser(user);
    setSetupNeeded(false);
  }, []);

  const setup = useCallback(async (username: string, displayName: string, password: string) => {
    const { user } = await authApi.setup(username, displayName, password);
    setUser(user);
    setSetupNeeded(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, setupNeeded, isAdmin: user?.role === 'admin', login, setup, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
