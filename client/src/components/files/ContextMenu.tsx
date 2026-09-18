import { useEffect, useRef } from 'react';
import type { FileItem } from '../../types';
import { filesApi } from '../../api/files';
import { isEditable } from '../modals/TextEditorModal';
import { Icon } from '../ui/Icon';

interface ContextMenuProps {
  item: FileItem;
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onMove: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onInspect: () => void;
  onEdit?: () => void;
}

export function ContextMenu({
  item, x, y, onClose,
  onRename, onMove, onCopy, onDelete, onInspect, onEdit,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof MouseEvent && ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  // Clamp to viewport
  const menuW = 200;
  const menuH = 280;
  const left = Math.min(x, window.innerWidth - menuW - 8);
  const top = Math.min(y, window.innerHeight - menuH - 8);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = filesApi.downloadUrl(item.path);
    a.download = item.name;
    a.click();
    onClose();
  };

  const action = (fn: () => void) => () => { fn(); onClose(); };

  const Item = ({ icon, label, onClick, danger = false }: {
    icon: string; label: string; onClick: () => void; danger?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-family-geist text-[12px] transition-colors ${
        danger
          ? 'text-(--color-error) hover:bg-(--color-error-container)/30'
          : 'text-(--color-on-surface) hover:bg-(--color-surface-container-low)'
      }`}
    >
      <Icon name={icon} size={16} className={danger ? 'text-(--color-error)' : 'text-(--color-secondary)'} />
      {label}
    </button>
  );

  return (
    <div
      ref={ref}
      style={{ left, top, width: menuW }}
      className="fixed z-[70] bg-(--color-surface-container-lowest) rounded-xl border border-(--color-surface-container-high) shadow-[0_8px_24px_-4px_rgba(23,25,28,0.12),0_2px_8px_rgba(23,25,28,0.06)] p-1.5 flex flex-col gap-0.5"
    >
      <Item icon="visibility" label="Inspect" onClick={action(onInspect)} />
      {item.type === 'file' && isEditable(item.name) && onEdit && (
        <Item icon="edit_note" label="Edit" onClick={action(onEdit)} />
      )}
      {item.type === 'file' && (
        <Item icon="download" label="Download" onClick={handleDownload} />
      )}
      <div className="h-px bg-(--color-surface-container-high) my-1" />
      <Item icon="edit" label="Rename" onClick={action(onRename)} />
      <Item icon="drive_file_move" label="Move to…" onClick={action(onMove)} />
      <Item icon="content_copy" label="Copy to…" onClick={action(onCopy)} />
      <div className="h-px bg-(--color-surface-container-high) my-1" />
      <Item icon="delete" label="Delete" onClick={action(onDelete)} danger />
    </div>
  );
}
