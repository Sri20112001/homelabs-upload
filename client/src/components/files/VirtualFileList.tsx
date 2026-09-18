import type { FileItem, SortField, SortDir } from '../../types';
import { FileRow } from './FileRow';
import { useVirtualList } from '../../hooks/useVirtualList';
import { Icon } from '../ui/Icon';

const ROW_HEIGHT = 48; // px — must match FileRow rendered height

interface VirtualFileListProps {
  items: FileItem[];
  sortField: SortField;
  sortDir: SortDir;
  onSortChange: (f: SortField, d: SortDir) => void;
  selected: Set<string>;
  onSelect: (path: string, multi: boolean) => void;
  onOpen: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  onCopy: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onInspect: (item: FileItem) => void;
  onDropMove: (srcPath: string, destFolderPath: string) => void;
}

function SortBtn({ label, field, sortField, sortDir, onSortChange }: {
  label: string; field: SortField; sortField: SortField; sortDir: SortDir;
  onSortChange: (f: SortField, d: SortDir) => void;
}) {
  const active = sortField === field;
  return (
    <button
      type="button"
      onClick={() => onSortChange(field, active && sortDir === 'asc' ? 'desc' : 'asc')}
      className={`flex items-center gap-1 font-family-geist text-[11px] font-semibold tracking-wider uppercase transition-colors ${active ? 'text-(--color-primary)' : 'text-(--color-secondary) hover:text-(--color-on-surface)'}`}
    >
      {label}
      {active && <Icon name={sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'} size={14} />}
    </button>
  );
}

export function VirtualFileList({
  items, sortField, sortDir, onSortChange,
  selected, onSelect, onOpen, onRename, onMove, onCopy, onDelete, onInspect, onDropMove,
}: VirtualFileListProps) {
  const { containerRef, onScroll, totalHeight, visibleItems } = useVirtualList(items, {
    itemHeight: ROW_HEIGHT,
    overscan: 8,
  });

  return (
    <div className="flex flex-col">
      {/* Sticky header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-(--color-surface-container-high) mb-1 sticky top-0 bg-(--color-surface) z-10">
        <div className="w-8 shrink-0" />
        <div className="flex-1">
          <SortBtn label="Name" field="name" sortField={sortField} sortDir={sortDir} onSortChange={onSortChange} />
        </div>
        <div className="w-20 text-right">
          <SortBtn label="Size" field="size" sortField={sortField} sortDir={sortDir} onSortChange={onSortChange} />
        </div>
        <div className="w-24 text-right hidden sm:block">
          <SortBtn label="Modified" field="modified_at" sortField={sortField} sortDir={sortDir} onSortChange={onSortChange} />
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 mb-1 rounded-lg bg-(--color-primary-fixed)/30">
        <Icon name="info" size={14} className="text-(--color-primary)" />
        <span className="font-family-geist text-[11px] text-(--color-primary)">
          {items.length.toLocaleString()} items — virtual scroll active
        </span>
      </div>

      {/* Scrollable virtual container */}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="overflow-y-auto"
        style={{ height: Math.min(totalHeight + ROW_HEIGHT, window.innerHeight - 280) }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map(({ item, offsetTop }) => (
            <div
              key={item.path}
              style={{ position: 'absolute', top: offsetTop, left: 0, right: 0, height: ROW_HEIGHT }}
            >
              <FileRow
                item={item}
                selected={selected.has(item.path)}
                onSelect={(multi) => onSelect(item.path, multi)}
                onOpen={() => onOpen(item)}
                onRename={() => onRename(item)}
                onMove={() => onMove(item)}
                onCopy={() => onCopy(item)}
                onDelete={() => onDelete(item)}
                onInspect={() => onInspect(item)}
                onDropMove={onDropMove}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
