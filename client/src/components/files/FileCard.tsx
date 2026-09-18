import { useState } from 'react';
import type { FileItem } from '../../types';
import { formatBytes, formatRelativeTime, getFileIcon, getFileColor } from '../../utils';
import { setInternalDrag, getInternalPath, isInternalDrag } from '../../utils/dnd';
import { IMAGE_EXTS } from '../../config/contentTypes';
import { ContextMenu } from './ContextMenu';
import { filesApi } from '../../api/files';
import { Icon } from '../ui/Icon';

function isImage(item: FileItem): boolean {
  const ext = (item.extension ?? '').replace('.', '').toLowerCase();
  return (IMAGE_EXTS as readonly string[]).includes(ext) || (item.mime_type?.startsWith('image/') ?? false);
}

interface FileCardProps {
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

export function FileCard({
  item, selected, onSelect, onOpen,
  onRename, onMove, onCopy, onDelete, onInspect, onDropMove,
}: FileCardProps) {
  const isDir = item.type === 'directory';
  const icon = isDir ? 'folder' : getFileIcon(item.name, item.mime_type);
  const color = isDir ? 'text-(--color-primary)' : getFileColor(item.name, item.mime_type);
  const ext = (item.extension ?? '').replace('.', '').toUpperCase();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onOpen();
    if (e.key === ' ') { e.preventDefault(); onSelect(true); }
    if (e.key === 'F2') onRename();
    if (e.key === 'Delete') onDelete();
  };

  // Drag source — tagged as internal so the upload dropzone ignores it
  const handleDragStart = (e: React.DragEvent) => {
    setInternalDrag(e, item.path);
  };

  // Drop target (folders only, internal moves only)
  const handleDragOver = (e: React.DragEvent) => {
    if (!isDir || !isInternalDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

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
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative rounded-xl p-(--spacing-space-md) shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) ${
          dragOver
            ? 'bg-(--color-primary-fixed)/40 border-2 border-(--color-primary) scale-[1.02]'
            : selected
            ? 'bg-(--color-primary)/12 border-2 border-(--color-primary)'
            : 'bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) hover:border-(--color-outline-variant)'
        }`}
      >
        {selected && (
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center w-5 h-5 rounded-md bg-(--color-primary) text-(--color-on-primary) shadow-sm">
            <Icon name="check" size={15} />
          </div>
        )}

        {isDir ? (
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-lg bg-(--color-primary)/10 flex items-center justify-center">
              <Icon name={icon} size={22} className={color} />
            </div>
          </div>
        ) : (
          <div className="w-full aspect-[4/3] rounded-lg bg-(--color-surface-container) flex flex-col items-center justify-center relative overflow-hidden">
            {isImage(item) ? (
              <img
                src={filesApi.downloadUrl(item.path)}
                alt={item.name}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-full h-full object-cover transition-opacity duration-300"
                onError={(e) => {
                  // Fall back to icon on load error
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex');
                }}
              />
            ) : null}
            <Icon
              name={icon}
              size={40}
              className={`${color} ${isImage(item) ? 'hidden' : ''}`}
              style={isImage(item) ? { display: 'none' } : {}}
            />
            {ext && (
              <span className="absolute top-2 left-2 font-family-geist text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-(--color-surface-container-highest)/90 text-(--color-on-surface-variant)">
                {ext}
              </span>
            )}
          </div>
        )}

        <div className={isDir ? 'mt-(--spacing-space-lg)' : 'mt-(--spacing-space-md)'}>
          <h3
            className="font-family-geist text-[14px] leading-tight text-(--color-on-surface) font-semibold truncate group-hover:text-(--color-primary) transition-colors"
            title={item.name}
          >
            {item.name}
          </h3>
          <div className="flex items-center justify-between mt-1 text-(--color-secondary) font-family-geist text-[11px]">
            {isDir ? <span>folder</span> : <span>{formatBytes(item.size)}</span>}
            <span>{formatRelativeTime(item.modified_at)}</span>
          </div>
        </div>
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
