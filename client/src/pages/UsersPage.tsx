import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '../api/users';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import type { AuthUser } from '../types';
import { Icon } from '../components/ui/Icon';

export function UsersPage() {
  const { user: me, isAdmin } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<AuthUser[]>([]);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [busy, setBusy] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await usersApi.list();
      setItems(r.items);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) setRole('member');
  }, [isAdmin]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await usersApi.create(username.trim().toLowerCase(), displayName.trim(), password, role);
      toast(`Added ${username}`, 'success');
      setUsername('');
      setDisplayName('');
      setPassword('');
      load();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u: AuthUser) => {
    if (!confirm(`Remove ${u.display_name} (@${u.username})? They will lose access immediately.`)) return;
    try {
      await usersApi.remove(u.id);
      toast(`Removed ${u.username}`, 'success');
      load();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const toggleRole = async (u: AuthUser) => {
    try {
      await usersApi.update(u.id, { role: u.role === 'admin' ? 'member' : 'admin' });
      load();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const doReset = async (u: AuthUser) => {
    if (resetPw.length < 4) {
      toast('Password must be at least 4 characters', 'error');
      return;
    }
    try {
      await usersApi.update(u.id, { password: resetPw });
      toast(`Password reset for ${u.username}`, 'success');
      setResetId(null);
      setResetPw('');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <div className="flex flex-col w-full pb-16 max-w-8xl mx-auto">
      <div className="mb-6">
        <h1 className="font-family-geist text-[22px] font-semibold text-(--color-on-surface) mb-1">Users</h1>
        <p className="font-family-inter text-[13px] text-(--color-secondary)">
          {items.length} user{items.length === 1 ? '' : 's'} — any logged-in user can create accounts
          (every creation is logged); only admins change roles, reset passwords or remove users.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <ol className="lg:col-span-7 flex flex-col rounded-2xl bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) divide-y divide-(--color-surface-container-high) overflow-hidden">
          {items.map((u) => (
            <li key={u.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-(--color-primary) text-(--color-on-primary) flex items-center justify-center font-family-geist text-[14px] font-bold uppercase shrink-0">
                  {u.username.slice(0, 1)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-family-geist text-[13px] font-semibold text-(--color-on-surface)">
                    {u.display_name}{' '}
                    <span className="font-normal text-(--color-secondary)">@{u.username}</span>
                    {me?.id === u.id && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-(--color-surface-container) text-(--color-secondary)">you</span>}
                  </p>
                  <p className="font-family-inter text-[11px] text-(--color-secondary)">
                    {u.role === 'admin' ? 'Admin — can manage users & settings' : 'Member — can use files & see activity'}
                  </p>
                </div>
                {isAdmin ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleRole(u)}
                      title="Toggle admin/member"
                      className={`px-2.5 py-1 rounded-md font-family-geist text-[11px] font-medium transition-colors ${
                        u.role === 'admin'
                          ? 'bg-(--color-primary) text-(--color-on-primary)'
                          : 'bg-(--color-surface-container) text-(--color-secondary) hover:text-(--color-on-surface)'
                      }`}
                    >
                      {u.role}
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetId(resetId === u.id ? null : u.id)}
                      title="Reset password"
                      className="p-1.5 rounded-lg text-(--color-secondary) hover:text-(--color-on-surface) hover:bg-(--color-surface-container-low) transition-colors"
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    {me?.id !== u.id && (
                      <button
                        type="button"
                        onClick={() => remove(u)}
                        title="Remove user"
                        className="p-1.5 rounded-lg text-(--color-secondary) hover:text-(--color-error) hover:bg-(--color-surface-container-low) transition-colors"
                      >
                        <Icon name="delete" size={15} />
                      </button>
                    )}
                  </>
                ) : (
                  <span className={`px-2.5 py-1 rounded-md font-family-geist text-[11px] font-medium ${
                    u.role === 'admin'
                      ? 'bg-(--color-primary) text-(--color-on-primary)'
                      : 'bg-(--color-surface-container) text-(--color-secondary)'
                  }`}>
                    {u.role}
                  </span>
                )}
              </div>
              {isAdmin && resetId === u.id && (
                <div className="flex gap-2 mt-2 ml-12">
                  <input
                    type="password"
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    placeholder="New password (min 4 chars)"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-low) font-family-geist text-[12px] text-(--color-on-surface) focus:outline-none focus:border-(--color-primary)"
                  />
                  <button
                    type="button"
                    onClick={() => doReset(u)}
                    className="px-3 py-1.5 rounded-lg bg-(--color-primary) text-(--color-on-primary) font-family-geist text-[12px] font-medium"
                  >
                    Save
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>

        <form
          onSubmit={create}
          className="lg:col-span-5 flex flex-col gap-3 p-5 rounded-2xl bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) shadow-sm"
        >
          <h2 className="font-family-geist text-[13px] font-semibold text-(--color-secondary) uppercase tracking-wider">
            Add user
          </h2>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            maxLength={64}
            className="w-full px-3 py-2 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-low) font-family-geist text-[12px] text-(--color-on-surface) focus:outline-none focus:border-(--color-primary)"
          />
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            className="w-full px-3 py-2 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-low) font-family-geist text-[12px] text-(--color-on-surface) focus:outline-none focus:border-(--color-primary)"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 4 chars)"
            autoComplete="new-password"
            className="w-full px-3 py-2 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-low) font-family-geist text-[12px] text-(--color-on-surface) focus:outline-none focus:border-(--color-primary)"
          />
          {isAdmin ? (
            <div className="flex gap-2">
              {['member', 'admin'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 px-2 py-1.5 rounded-lg font-family-geist text-[12px] font-medium capitalize transition-colors ${
                    role === r
                      ? 'bg-(--color-primary) text-(--color-on-primary)'
                      : 'bg-(--color-surface-container) text-(--color-secondary)'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          ) : (
            <p className="font-family-inter text-[11px] text-(--color-secondary)">
              New accounts are created as members — only admins can grant the admin role.
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !username || password.length < 4}
            className="w-full px-4 py-2 rounded-lg bg-(--color-primary) text-(--color-on-primary) font-family-geist text-[12px] font-semibold disabled:opacity-50"
          >
            {busy ? 'Adding…' : 'Add user'}
          </button>
        </form>
      </div>
    </div>
  );
}
