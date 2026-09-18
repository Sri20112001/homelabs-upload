import { useState, useEffect, useCallback } from 'react';
import { filesApi } from '../api/files';
import { formatBytes } from '../utils';
import { useTheme, type ThemeFamily, type ThemeMode } from '../hooks/useTheme';
import { Icon } from '../components/ui/Icon';

export interface ThemeOption {
  id: ThemeFamily;
  label: string;
  swatches: Record<ThemeMode, [string, string, string]>; // [canvas, accent, neon/highlight]
}

export const PALETTES: ThemeOption[] = [
  {
    id: 'navy',
    label: 'Midnight Navy',
    swatches: {
      dark: ['#05043B', '#0C86F4', '#00D2FE'],
      light: ['#F0F4FF', '#0266C8', '#0098BD'],
    },
  },
  {
    id: 'emerald',
    label: 'Emerald Jade',
    swatches: {
      dark: ['#090D0B', '#00E575', '#5CFFBA'],
      light: ['#F0FDF4', '#059669', '#00B85C'],
    },
  },
  {
    id: 'amber',
    label: 'Amber Ochre',
    swatches: {
      dark: ['#121110', '#F59E0B', '#FBBF24'],
      light: ['#FEFCE8', '#D97706', '#B45309'],
    },
  },
  {
    id: 'violet',
    label: 'Deep Violet',
    swatches: {
      dark: ['#0E0A17', '#8B5CF6', '#C084FC'],
      light: ['#F8F9FA', '#7C3AED', '#4C1D95'],
    },
  },
];

interface ServerConfig {
  storage_root: string;
  max_upload_size: number;
  cors_origin: string;
}



export function SettingsPage() {
  const [cfg, setCfg] = useState<ServerConfig | null>(null);
  const [draft, setDraft] = useState<ServerConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Destructure family and mode from the refactored useTheme hook
  const { family, mode, setFamily, setMode } = useTheme();

  const loadAll = useCallback(async () => {
    try {
      const c = await filesApi.getConfig();
      setCfg(c);
      setDraft(c);
    } catch {
      setError('Failed to load settings');
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      const updated = await filesApi.patchConfig({
        storage_root: draft.storage_root,
        max_upload_size: draft.max_upload_size,
        cors_origin: draft.cors_origin,
      });
      setCfg(updated);
      setDraft(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    draft &&
    cfg &&
    (draft.storage_root !== cfg.storage_root ||
      draft.max_upload_size !== cfg.max_upload_size ||
      draft.cors_origin !== cfg.cors_origin);

  const Field = ({
    label,
    hint,
    children,
  }: {
    label: string;
    hint?: string;
    children: React.ReactNode;
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="font-(family-name:--font-family-geist) text-[12px] font-semibold text-(--color-on-surface)">
        {label}
      </label>
      {children}
      {hint && (
        <p className="font-(family-name:--font-family-inter) text-[11px] text-(--color-secondary)">
          {hint}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col w-full pb-16 max-w-8xl mx-auto">
      <div className="mb-8">
        <h1 className="font-(family-name:--font-family-geist) text-[22px] font-semibold text-(--color-on-surface) mb-1">
          Settings
        </h1>
        <p className="font-(family-name:--font-family-inter) text-[13px] text-(--color-secondary)">
          Runtime configuration — changes apply immediately without restart.
        </p>
      </div>

      {/* Appearance */}
      <section className="mb-8 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-(family-name:--font-family-geist) text-[13px] font-semibold text-(--color-secondary) uppercase tracking-wider">
            Appearance
          </h2>

          {/* Mode Switcher Toggle */}
          <div className="inline-flex p-1 rounded-lg bg-(--color-surface-container-lowest) border border-(--color-surface-container-high)">
            <button
              type="button"
              onClick={() => setMode('dark')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-(family-name:--font-family-geist) transition-colors ${
                mode === 'dark'
                  ? 'bg-(--color-primary) text-(--color-on-primary) shadow-sm'
                  : 'text-(--color-secondary) hover:text-(--color-on-surface)'
              }`}
            >
              <Icon name="dark_mode" size={14} />
              Dark
            </button>
            <button
              type="button"
              onClick={() => setMode('light')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-(family-name:--font-family-geist) transition-colors ${
                mode === 'light'
                  ? 'bg-(--color-primary) text-(--color-on-primary) shadow-sm'
                  : 'text-(--color-secondary) hover:text-(--color-on-surface)'
              }`}
            >
              <Icon name="light_mode" size={14} />
              Light
            </button>
          </div>
        </div>

        {/* Palette Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PALETTES.map((p) => {
            const active = family === p.id;
            const currentSwatches = p.swatches[mode];

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setFamily(p.id)}
                aria-pressed={active}
                className={`flex flex-col gap-2 p-3 rounded-xl border text-left transition-all ${
                  active
                    ? 'bg-(--color-surface-container-low) border-(--color-primary) ring-2 ring-(--color-primary)/20'
                    : 'bg-(--color-surface-container-lowest) border-(--color-surface-container-high) hover:border-(--color-secondary)'
                }`}
              >
                <span className="flex -space-x-1.5">
                  {currentSwatches.map((c) => (
                    <span
                      key={c}
                      className="w-6 h-6 rounded-full border border-black/15 shadow-xs"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
                <span className="font-(family-name:--font-family-geist) text-[12px] font-medium text-(--color-on-surface)">
                  {p.label}
                </span>
                {active && (
                  <span className="font-(family-name:--font-family-geist) text-[10px] text-(--color-primary) font-semibold">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Config form */}
      {draft && (
        <section className="flex flex-col gap-5 p-5 rounded-2xl bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) shadow-sm">
          <h2 className="font-(family-name:--font-family-geist) text-[13px] font-semibold text-(--color-secondary) uppercase tracking-wider">
            Runtime Config
          </h2>

          <Field
            label="Storage Root"
            hint="Absolute path to the directory served as the file root."
          >
            <input
              type="text"
              value={draft.storage_root}
              onChange={(e) => setDraft({ ...draft, storage_root: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-low) font-mono text-[12px] text-(--color-on-surface) focus:outline-none focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary-fixed) transition-all"
            />
          </Field>

          <Field
            label="Max Upload Size (bytes)"
            hint={`Currently: ${formatBytes(draft.max_upload_size)}`}
          >
            <input
              type="number"
              min={1}
              value={draft.max_upload_size}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  max_upload_size: parseInt(e.target.value, 10) || draft.max_upload_size,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-low) font-(family-name:--font-family-geist) text-[12px] text-(--color-on-surface) focus:outline-none focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary-fixed) transition-all"
            />
            <div className="flex gap-2 flex-wrap">
              {[
                { label: '100 MB', bytes: 100 * 1024 * 1024 },
                { label: '1 GB', bytes: 1024 * 1024 * 1024 },
                { label: '10 GB', bytes: 10 * 1024 * 1024 * 1024 },
                { label: '50 GB', bytes: 50 * 1024 * 1024 * 1024 },
              ].map(({ label, bytes }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDraft({ ...draft, max_upload_size: bytes })}
                  className={`px-2.5 py-1 rounded-md font-(family-name:--font-family-geist) text-[11px] font-medium transition-colors ${
                    draft.max_upload_size === bytes
                      ? 'bg-(--color-primary) text-(--color-on-primary)'
                      : 'bg-(--color-surface-container) text-(--color-secondary) hover:text-(--color-on-surface)'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="CORS Origin"
            hint="Allowed origin for cross-origin requests (e.g. http://192.168.1.10:5173)."
          >
            <input
              type="text"
              value={draft.cors_origin}
              onChange={(e) => setDraft({ ...draft, cors_origin: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-(--color-surface-container-high) bg-(--color-surface-container-low) font-(family-name:--font-family-geist) text-[12px] text-(--color-on-surface) focus:outline-none focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary-fixed) transition-all"
            />
          </Field>

          {error && (
            <p className="font-(family-name:--font-family-geist) text-[11px] text-(--color-error)">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 justify-end pt-1">
            {isDirty && (
              <button
                type="button"
                onClick={() => setDraft(cfg)}
                className="px-4 py-2 rounded-lg bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) text-(--color-on-surface) font-(family-name:--font-family-geist) text-[12px] hover:bg-(--color-surface-container-low) transition-colors"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-(--color-primary) text-(--color-on-primary) font-(family-name:--font-family-geist) text-[12px] font-medium hover:bg-(--color-primary-container) transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-(--color-on-primary) border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <Icon name="check_circle" size={16} />
              ) : (
                <Icon name="save" size={16} />
              )}
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}