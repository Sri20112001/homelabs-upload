import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth';
import type { AuthUser } from '../types';

interface AuthState {
  /** Non-secret profile from the login response. Persisted across reloads. */
  user: AuthUser | null;
  /** True until the boot-time /auth/status check resolves. */
  loading: boolean;
  /** True while the database has zero users (first-run registration). */
  setupNeeded: boolean;
  isAdmin: boolean;
  /** Boot check: public status only — NO /me call. The session cookie is
   *  revalidated lazily: the first authenticated API call 401s, the shared
   *  client clears the user and bounces to /login (see api/client.ts). */
  boot: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  setup: (username: string, displayName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Drop the user without hitting the API (dead session — 401 path). */
  clearSession: () => void;
  refresh: () => Promise<void>;
}

let booted = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      setupNeeded: false,
      isAdmin: false,

      boot: async () => {
        if (booted) return;
        booted = true;
        // A persisted profile means a previous login succeeded — trust it
        // and skip /auth/status entirely (zero calls on dashboard/reload).
        // A dead session is caught lazily: the first authenticated API call
        // 401s, clears the user and bounces to /login, where status IS
        // fetched (no user → need login-vs-register decision).
        if (useAuthStore.getState().user) {
          set({ loading: false });
          return;
        }
        try {
          const s = await authApi.status();
          set({ setupNeeded: s.setup_needed });
        } catch {
          /* backend unreachable — pages show their own error */
        } finally {
          set({ loading: false });
        }
      },

      login: async (username: string, password: string) => {
        const { user } = await authApi.login(username, password);
        set({ user, isAdmin: user.role === 'admin', setupNeeded: false });
      },

      setup: async (username: string, displayName: string, password: string) => {
        const { user } = await authApi.setup(username, displayName, password);
        set({ user, isAdmin: user.role === 'admin', setupNeeded: false });
      },

      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          set({ user: null, isAdmin: false });
        }
      },

      clearSession: () => set({ user: null, isAdmin: false }),

      // Kept for callers that want to force a status re-check.
      refresh: async () => {
        try {
          const s = await authApi.status();
          set({ setupNeeded: s.setup_needed });
        } catch {
          /* ignore */
        }
      },
    }),
    {
      name: 'nodevault-auth',
      // Persist the profile only — never flags, never secrets. The session
      // itself stays in the HttpOnly cookie; APIs still enforce auth.
      partialize: (s) => ({ user: s.user }) as AuthState,
    },
  ),
);
