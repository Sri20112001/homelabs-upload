import { Icon } from '../ui/Icon';
interface DockProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onUpload: () => void;
  transferCount: number;
}

const NAV_ITEMS = [
  { id: 'files', icon: 'folder', label: 'Files' },
  { id: 'search', icon: 'explore', label: 'Search' },
  { id: 'transfers', icon: 'sync_alt', label: 'Transfers' },
  // { id: 'settings', icon: 'settings', label: 'Settings' },
];

export function Dock({ activePage, onNavigate, onUpload, transferCount }: DockProps) {
  return (
    <nav
      aria-label="Spatial Control Dock"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-(--spacing-space-xs) bg-(--color-surface-container-lowest)/95 backdrop-blur-xl px-(--spacing-space-md) py-2 rounded-full shadow-[0_20px_32px_-8px_rgba(23,25,28,0.08),0_8px_16px_-4px_rgba(23,25,28,0.04)] border-2 border-(--color-surface-container-highest)"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-(--spacing-space-md) py-1.5 rounded-full font-family-geist text-[12px] font-medium transition-colors relative ${
              isActive
                ? 'bg-(--color-secondary-container) text-(--color-on-secondary-fixed)'
                : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface)'
            }`}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
            {item.id === 'transfers' && transferCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-(--color-primary) text-(--color-on-primary) font-family-geist text-[10px] flex items-center justify-center leading-none">
                {transferCount}
              </span>
            )}
          </button>
        );
      })}

      <div className="h-4 w-px bg-(--color-surface-container-highest) mx-0.5" />

      <button
        type="button"
        onClick={onUpload}
        className="btn-primary flex items-center gap-1.5 bg-linear-to-r from-brand-primary to-brand-neon px-(--spacing-space-md) py-1.5 rounded-full font-family-geist text-[12px] font-medium transition-all shadow-blue-glow"
      >
        <Icon name="add" size={18} />
        <span>Upload</span>
      </button>
    </nav>
  );
}
