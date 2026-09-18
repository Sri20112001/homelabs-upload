import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { APP_NAME } from '../config/app';
import { Icon } from '../components/ui/Icon';

// First-run registration — reachable only while the database has no users.
// Creates the admin account. Afterwards accounts are created by existing
// users only (Users page); this page redirects to /login.
export function RegisterPage() {
  const { user, loading, setupNeeded, setup } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;
  if (!loading && !setupNeeded) return <Navigate to="/login" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await setup(username.trim(), displayName.trim(), password.trim());
    } catch (err) {
      setError((err as Error).message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm flex flex-col gap-4 p-6 rounded-2xl bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) shadow-sm"
      >
        <div className="flex flex-col gap-1 items-center text-center">
          <div className="w-11 h-11 rounded-2xl bg-(--color-primary) flex items-center justify-center mb-1">
            <Icon name="dashboard" size={22} className="text-(--color-on-primary)" />
          </div>
          <h1 className="font-family-geist text-[20px] font-semibold text-(--color-on-surface)">
            Welcome to {APP_NAME}
          </h1>
          <p className="font-family-inter text-[13px] text-(--color-secondary)">
            First run — create the admin account. Further accounts are created
            by logged-in users afterwards.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-family-geist text-[12px] font-semibold text-(--color-on-surface)">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            maxLength={64}
            autoComplete="username"
            className="w-full px-3 py-2 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-low) font-family-geist text-[13px] text-(--color-on-surface) focus:outline-none focus:border-(--color-primary) transition-all"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-family-geist text-[12px] font-semibold text-(--color-on-surface)">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            autoComplete="name"
            className="w-full px-3 py-2 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-low) font-family-geist text-[13px] text-(--color-on-surface) focus:outline-none focus:border-(--color-primary) transition-all"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-family-geist text-[12px] font-semibold text-(--color-on-surface)">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="w-full px-3 py-2 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-low) font-family-geist text-[13px] text-(--color-on-surface) focus:outline-none focus:border-(--color-primary) transition-all"
          />
        </label>

        {error && (
          <p className="font-family-geist text-[12px] text-(--color-error) bg-error-container/20 border border-error-container rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !username || !password}
          className="w-full px-4 py-2.5 rounded-lg bg-(--color-primary) text-(--color-on-primary) font-family-geist text-[13px] font-semibold hover:brightness-110 transition-all disabled:opacity-50"
        >
          {busy ? 'Please wait…' : 'Create admin & enter'}
        </button>
      </form>
    </div>
  );
}
