import { Modal } from '../modals/Modal';

interface ShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['⌘', 'K'], desc: 'Open command palette' },
  { keys: ['?'], desc: 'Show keyboard shortcuts' },
  { keys: ['Enter'], desc: 'Open file / navigate into folder' },
  { keys: ['Space'], desc: 'Toggle selection' },
  { keys: ['F2'], desc: 'Rename selected item' },
  { keys: ['Delete'], desc: 'Delete selected item' },
  { keys: ['Esc'], desc: 'Clear selection / close panel' },
  { keys: ['Ctrl', 'Click'], desc: 'Multi-select items' },
];

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <Modal title="Keyboard Shortcuts" onClose={onClose}>
      <div className="flex flex-col gap-1">
        {SHORTCUTS.map(({ keys, desc }) => (
          <div
            key={desc}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-(--color-surface-container-low) transition-colors"
          >
            <span className="font-(family-name:--font-family-inter) text-[13px] text-(--color-on-surface)">
              {desc}
            </span>
            <div className="flex items-center gap-1">
              {keys.map((k, i) => (
                <span key={i}>
                  <kbd className="px-2 py-0.5 rounded-md bg-(--color-surface-container-highest) border border-(--color-surface-container-high) font-family-geist text-[11px] font-semibold text-(--color-on-surface)">
                    {k}
                  </kbd>
                  {i < keys.length - 1 && (
                    <span className="mx-0.5 text-(--color-outline) text-[11px]">+</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
