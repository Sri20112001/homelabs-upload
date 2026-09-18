import { useState } from 'react';
import type { FileItem } from '../../types';
import { formatBytes, formatRelativeTime, getFileIcon, getFileColor } from '../../utils';
import { setInternalDrag, getInternalPath, isInternalDrag } from '../../utils/dnd';
import { ContextMenu } from './ContextMenu';
import { Icon } from '../ui/Icon';

interface FileRowProps {
  item: FileItem;
  selected: boolean;
  onSelect: (multi: boolean) => void;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onInspect: () => void;
  onDropMove?: (srcPath: string, destFolderPath: string) => void;
}

export function FileRow({
  item, selected, onSelect, onOpen,
  onRename, onMove, onCopy, onDelete, onInspect, onDropMove,
}: FileRowProps) {
  const isDir = item.type === 'directory';
  const icon = isDir ? 'folder' : getFileIcon(item.name, item.mime_type);
  const color = isDir ? 'text-(--color-primary)' : getFileColor(item.name, item.mime_type);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onOpen();
    if (e.key === ' ') { e.preventDefault(); onSelect(true); }
    if (e.key === 'F2') onRename();
    if (e.key === 'Delete') onDelete();
  };

  const handleDragStart = (e: React.DragEvent) => {
    setInternalDrag(e, item.path);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDir || !isInternalDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isDir) return;
    e.preventDefault();
    setDragOver(false);
    const srcPath = getInternalPath(e);
    if (srcPath && srcPath !== item.path && onDropMove) {
      onDropMove(srcPath, item.path);
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        draggable
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey || e.shiftKey) onSelect(true);
          else onOpen();
        }}
        onKeyDown={handleKeyDown}
        onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) ${
          dragOver
            ? 'bg-(--color-primary-fixed)/40 border border-(--color-primary)'
            : selected
            ? 'bg-(--color-primary)/12 border border-(--color-primary)'
            : 'hover:bg-(--color-surface-container-low) border border-transparent'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-(--color-surface-container) flex items-center justify-center shrink-0">
          <Icon name={icon} size={18} className={color} />
        </div>
        <span className="flex-1 font-family-geist text-[13px] text-(--color-on-surface) truncate">
          {item.name}
        </span>
        <span className="font-family-geist text-[11px] text-(--color-secondary) w-20 text-right shrink-0">
          {isDir ? '—' : formatBytes(item.size)}
        </span>
        <span className="font-family-geist text-[11px] text-(--color-secondary) w-24 text-right shrink-0 hidden sm:block">
          {formatRelativeTime(item.modified_at)}
        </span>
      </div>

      {menu && (
        <ContextMenu
          item={item}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onRename={onRename}
          onMove={onMove}
          onCopy={onCopy}
          onDelete={onDelete}
          onInspect={onInspect}
        />
      )}
    </>
  );
}
