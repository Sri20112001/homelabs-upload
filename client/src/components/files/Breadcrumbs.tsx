import { useState } from 'react';
import { breadcrumbs } from '../../utils';
import { Icon } from '../ui/Icon';
import { getInternalPath, isInternalDrag } from '../../utils/dnd';

interface BreadcrumbsProps {
  path: string;
  onNavigate: (path: string) => void;
  onDropMove?: (srcPath: string, destPath: string) => void;
  itemCount?: number;
}

export function Breadcrumbs({ path, onNavigate, onDropMove, itemCount }: BreadcrumbsProps) {
  const crumbs = breadcrumbs(path);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent, crumbPath: string) => {
    // Internal move-drags only — external files keep bubbling to the grid
    // upload zone instead of lighting up breadcrumbs.
    if (!isInternalDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPath(crumbPath);
  };

  const handleDrop = (e: React.DragEvent, crumbPath: string) => {
    e.preventDefault();
    setDragOverPath(null);
    const srcPath = getInternalPath(e);
    if (srcPath && onDropMove) onDropMove(srcPath, crumbPath);
  };

  return (
    <div className="flex items-center flex-wrap gap-(--spacing-space-xs)">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        const isDropTarget = dragOverPath === crumb.path;
        return (
          <span key={crumb.path} className="flex items-center gap-(--spacing-space-xs)">
            {isLast ? (
              <div
                className={`flex items-center gap-2 px-(--spacing-space-md) py-1.5 rounded-lg transition-colors ${
                  isDropTarget
                    ? 'bg-(--color-primary-fixed)/60 border border-(--color-primary)'
                    : 'bg-(--color-primary)/10 text-(--color-primary)'
                }`}
                onDragOver={(e) => handleDragOver(e, crumb.path)}
                onDragLeave={() => setDragOverPath(null)}
                onDrop={(e) => handleDrop(e, crumb.path)}
              >
                <Icon name="folder_open" size={16} />
                <span className="font-family-geist text-[12px] font-semibold">
                  {crumb.label}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(crumb.path)}
                onDragOver={(e) => handleDragOver(e, crumb.path)}
                onDragLeave={() => setDragOverPath(null)}
                onDrop={(e) => handleDrop(e, crumb.path)}
                className={`flex items-center gap-1.5 px-(--spacing-space-md) py-1.5 rounded-lg transition-all text-(--color-on-surface) ${
                  isDropTarget
                    ? 'bg-(--color-primary-fixed)/60 border border-(--color-primary) shadow-sm'
                    : 'bg-(--color-surface-container-lowest) shadow-sm hover:bg-(--color-surface-container-low)'
                }`}
              >
                <Icon name={i === 0 ? 'dns' : 'storage'} size={16} className="text-(--color-primary)" />
                <span className="font-family-geist text-[12px]">
                  {crumb.label}
                </span>
              </button>
            )}
            {!isLast && (
              <Icon name="chevron_right" size={14} className="text-(--color-outline)" />
            )}
          </span>
        );
      })}
      {itemCount !== undefined && (
        <span className="ml-2 px-2.5 py-1 rounded-full bg-(--color-surface-container-highest) text-(--color-on-surface-variant) font-family-geist text-[11px]">
          {itemCount} items
        </span>
      )}
    </div>
  );
}
