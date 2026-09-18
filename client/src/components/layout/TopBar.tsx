import { useStorage } from '../../hooks/useStorage';
import { formatBytes } from '../../utils';
import { Icon } from '../ui/Icon';

interface TopBarProps {
  onSearchOpen: () => void;
  onSettingsOpen: () => void;
}

function isLanHost(host: string): boolean {
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  if (/^192\.168\./.test(host) || /^10\./.test(host)) return true;
  const m = host.match(/^172\.(\d+)\./);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

export function TopBar({ onSearchOpen, onSettingsOpen }: TopBarProps) {
  const storage = useStorage();
  const usedPct = storage
    ? Math.round((storage.used_bytes / storage.total_bytes) * 100)
    : 0;
  const host = window.location.hostname || 'localhost';
  const scope = isLanHost(host) ? 'local' : 'remote';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
      <div className="h-16 w-full px-(--spacing-margin) md:px-(--spacing-margin-desktop) flex items-center justify-between pointer-events-auto">
        {/* Left: node status + storage pill */}
        <div className="flex items-center gap-(--spacing-space-sm)">
          <div className="flex items-center gap-(--spacing-space-sm) bg-(--color-surface-container-lowest)/90 backdrop-blur-md px-(--spacing-space-md) py-1.5 rounded-full shadow-[0_4px_16px_-2px_rgba(23,25,28,0.05)] border border-(--color-surface-container-high)">
            <div className="w-2 h-2 rounded-full bg-(--color-primary) animate-pulse" />
            <span className="font-family-geist text-[11px] font-semibold tracking-[0.03em] text-(--color-on-surface)">
              {host}
            </span>
            <span className="w-1 h-1 rounded-full bg-(--color-outline-variant)" />
            <span className="font-family-geist text-[11px] text-(--color-secondary)">
              {scope}
            </span>
          </div>

          {storage && (
            <div className="hidden sm:flex items-center gap-(--spacing-space-sm) bg-(--color-surface-container-lowest)/90 backdrop-blur-md px-(--spacing-space-md) py-1.5 rounded-full shadow-[0_4px_16px_-2px_rgba(23,25,28,0.05)] border border-(--color-surface-container-high)">
              <Icon name="database" size={15} className="text-(--color-secondary)" />
              <span className="font-family-geist text-[11px] text-(--color-on-surface-variant) font-medium">
                {formatBytes(storage.used_bytes)} / {formatBytes(storage.total_bytes)}
              </span>
              <div className="w-12 h-1.5 bg-(--color-surface-container-high) rounded-full overflow-hidden">
                <div
                  className="bg-(--color-primary) h-full rounded-full transition-all"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <span className="font-family-geist text-[11px] text-(--color-on-surface-variant)">
                {usedPct}%
              </span>
            </div>
          )}
        </div>

        {/* Right: search + user */}
        <div className="flex items-center gap-(--spacing-space-sm)">
          <button
            type="button"
            onClick={onSearchOpen}
            className="flex items-center gap-(--spacing-space-xs) bg-(--color-surface-container-lowest)/90 backdrop-blur-md px-(--spacing-space-md) py-1.5 rounded-full shadow-[0_4px_16px_-2px_rgba(23,25,28,0.05)] border border-(--color-surface-container-high) text-(--color-on-surface-variant) hover:text-(--color-on-surface) transition-colors"
          >
            <Icon name="search" size={16} />
            <span className="font-family-geist text-[11px] px-1 py-0.5 rounded bg-(--color-surface-container) text-(--color-secondary)">
              ⌘K
            </span>
          </button>

          <button
            type="button"
            onClick={onSettingsOpen}
            title="Open settings"
            className="flex items-center bg-(--color-surface-container-lowest)/90 backdrop-blur-md p-1.5 rounded-full shadow-[0_4px_16px_-2px_rgba(23,25,28,0.05)] border border-(--color-surface-container-high) hover:border-(--color-primary) transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-(--color-primary) flex items-center justify-center">
              <Icon name="settings" size={18} className="text-(--color-on-primary)" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
