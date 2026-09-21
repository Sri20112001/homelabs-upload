import { useCallback, useEffect, useState } from 'react';
import { activityApi } from '../api/activity';
import { usersApi } from '../api/users';
import type { ActivityEntry } from '../types';
import { Icon } from '../components/ui/Icon';

const ACTIONS = [
  '', 'upload', 'download', 'mkdir', 'rename', 'move', 'copy', 'delete',
  'trash_move', 'trash_restore', 'login', 'user_create',
];

const ACTION_ICON: Record<string, string> = {
  upload: 'upload',
  download: 'download',
  mkdir: 'create_new_folder',
  rename: 'drive_file_rename_outline',
  move: 'drive_file_move',
  copy: 'content_copy',
  delete: 'delete',
  trash_move: 'delete_sweep',
  trash_restore: 'restore',
  zip_download: 'folder_zip',
  login: 'person',
  logout: 'person',
  setup: 'settings',
  user_create: 'person',
  bulk_rename: 'drive_file_rename_outline',
};

const ACTION_LABEL: Record<string, string> = {
  upload: 'uploaded',
  download: 'downloaded',
  mkdir: 'created folder',
  rename: 'renamed',
  move: 'moved',
  copy: 'copied',
  delete: 'deleted',
  trash_move: 'trashed',
  trash_restore: 'restored',
  trash_purge: 'emptied trash',
  zip_download: 'downloaded zip',
  login: 'logged in',
  logout: 'logged out',
  setup: 'set up the node',
  user_create: 'user change',
  bulk_rename: 'bulk renamed',
  password_change: 'password change',
};

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const AVATAR = ['bg-(--color-primary)', 'bg-emerald-600', 'bg-amber-600', 'bg-violet-600'];

function avatarClass(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR[h % AVATAR.length];
}

export function ActivityPage() {
  const [items, setItems] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<string[]>([]);
  const [fUser, setFUser] = useState('');
  const [fAction, setFAction] = useState('');
  const [fQ, setFQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await activityApi.list({ limit: 200, user: fUser || undefined, action: fAction || undefined, q: fQ || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fUser, fAction, fQ]);

  useEffect(() => {
    load();
    usersApi.list().then((r) => setMembers(r.items.map((u) => u.username))).catch(() => {});
  }, [load]);

  return (
    <div className="flex flex-col w-full pb-16 max-w-8xl mx-auto">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-family-geist text-[22px] font-semibold text-(--color-on-surface) mb-1">Activity</h1>
          <p className="font-family-inter text-[13px] text-(--color-secondary)">
            Who did what, and when — {total} event{total === 1 ? '' : 's'} found. Logs are append-only and cannot be cleared or altered.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) font-family-geist text-[12px] text-(--color-secondary) hover:text-(--color-on-surface) transition-colors"
          >
            <Icon name="refresh" size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <select
          value={fUser}
          onChange={(e) => setFUser(e.target.value)}
          className="px-3 py-2 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-lowest) font-family-geist text-[12px] text-(--color-on-surface)"
        >
          <option value="">Everyone</option>
          {members.map((m) => (
            <option key={m} value={m} className="capitalize">{m}</option>
          ))}
        </select>
        <select
          value={fAction}
          onChange={(e) => setFAction(e.target.value)}
          className="px-3 py-2 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-lowest) font-family-geist text-[12px] text-(--color-on-surface)"
        >
          <option value="">All actions</option>
          {ACTIONS.filter(Boolean).map((a) => (
            <option key={a} value={a}>{ACTION_LABEL[a] ?? a}</option>
          ))}
        </select>
        <input
          value={fQ}
          onChange={(e) => setFQ(e.target.value)}
          placeholder="Filter by file or detail…"
          className="flex-1 min-w-44 px-3 py-2 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-lowest) font-family-geist text-[12px] text-(--color-on-surface) focus:outline-none focus:border-(--color-primary) transition-all"
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-(--color-surface-container-low) animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-(--color-surface-container-lowest) border border-(--color-surface-container-high)">
          <p className="font-family-geist text-[14px] text-(--color-on-surface) font-medium mb-1">No activity yet</p>
          <p className="font-family-inter text-[12px] text-(--color-secondary)">Uploads, downloads and edits will show up here with who did them.</p>
        </div>
      ) : (
        <ol className="flex flex-col rounded-2xl bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) divide-y divide-(--color-surface-container-high) overflow-hidden">
          {items.map((e, i) => (
            <li key={`${e.time}-${i}`} className="flex items-center gap-3 px-4 py-3">
              <span className={`w-8 h-8 rounded-full ${avatarClass(e.user)} text-white flex items-center justify-center font-family-geist text-[13px] font-bold uppercase shrink-0`}>
                {e.user.slice(0, 1)}
              </span>
              <span className="w-8 h-8 rounded-lg bg-(--color-surface-container-low) flex items-center justify-center shrink-0">
                <Icon name={ACTION_ICON[e.action] ?? 'info'} size={15} className="text-(--color-secondary)" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-family-geist text-[13px] text-(--color-on-surface) truncate">
                  <span className="font-semibold capitalize">{e.user}</span>
                  {' '}{ACTION_LABEL[e.action] ?? e.action}
                  {e.path && <span className="font-mono text-[12px] text-(--color-primary)"> {e.path}</span>}
                </p>
                {e.detail && (
                  <p className="font-family-inter text-[11px] text-(--color-secondary) truncate">{e.detail}</p>
                )}
              </div>
              <span className="font-family-geist text-[11px] text-(--color-secondary) shrink-0" title={new Date(e.time).toLocaleString()}>
                {timeAgo(e.time)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
