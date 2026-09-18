import type { FileItem } from '../../types';
import { filesApi } from '../../api/files';
import { Icon } from '../ui/Icon';

interface SelectionBarProps {
  selected: FileItem[];
  onClear: () => void;
  onRename: () => void;
  onMove: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onBulkRename: () => void;
}

export function SelectionBar({ selected, onClear, onRename, onMove, onCopy, onDelete, onBulkRename }: SelectionBarProps) {
  if (selected.length === 0) return null;

  const handleDownload = () => {
    for (const item of selected) {
      if (item.type === 'file') {
        const a = document.createElement('a');
        a.href = filesApi.downloadUrl(item.path);
        a.download = item.name;
        a.click();
      }
    }
  };

  const handleZipDownload = () => {
    const paths = selected.map((i) => i.path);
    const name = selected.length === 1 ? selected[0].name + '.zip' : 'download.zip';
    filesApi.zipDownload(paths, name);
  };

  return (
    <div className="sticky top-20 z-30 flex justify-center w-full px-4 mb-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-(--spacing-space-sm) bg-(--color-surface-container-lowest)/95 backdrop-blur-md px-4 py-2 rounded-full shadow-[0_8px_24px_-4px_rgba(23,25,28,0.08),0_2px_6px_rgba(23,25,28,0.04)] border border-(--color-surface-container-high) transition-all duration-200">
        <div className="flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full bg-(--color-primary-fixed) text-(--color-on-primary-fixed)">
          <span className="w-2 h-2 rounded-full bg-(--color-primary)" />
          <span className="font-family-geist text-[11px] font-semibold tracking-wide">
            {selected.length} {selected.length === 1 ? 'item' : 'items'} selected
          </span>
        </div>

        <div className="h-4 w-px bg-(--color-surface-container-highest)" />

        <div className="flex items-center gap-1">
          {selected.length > 1 && (
            <button
              type="button"
              onClick={onBulkRename}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-(--color-on-surface) hover:bg-(--color-surface-container-low) transition-colors font-family-geist text-[12px]"
            >
              <Icon name="drive_file_rename_outline" size={17} className="text-(--color-secondary)" />
              Bulk Rename
            </button>
          )}
          {selected.length === 1 && (
            <button
              type="button"
              onClick={onRename}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-(--color-on-surface) hover:bg-(--color-surface-container-low) transition-colors font-family-geist text-[12px]"
            >
              <Icon name="edit" size={17} className="text-(--color-secondary)" />
              Rename
            </button>
          )}
          <button
            type="button"
            onClick={onMove}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-(--color-on-surface) hover:bg-(--color-surface-container-low) transition-colors font-family-geist text-[12px]"
          >
            <Icon name="drive_file_move" size={17} className="text-(--color-secondary)" />
            Move to...
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-(--color-on-surface) hover:bg-(--color-surface-container-low) transition-colors font-family-geist text-[12px]"
          >
            <Icon name="content_copy" size={17} className="text-(--color-secondary)" />
            Copy to...
          </button>
          {selected.some((i) => i.type === 'file') && (
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--color-primary) text-(--color-on-primary) hover:bg-(--color-primary-container) transition-colors font-family-geist text-[12px] shadow-[0_1px_2px_rgba(79,70,229,0.25)]"
            >
              <Icon name="download" size={17} />
              Download
            </button>
          )}
          <button
            type="button"
            onClick={handleZipDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--color-surface-container) text-(--color-on-surface) hover:bg-(--color-surface-container-high) transition-colors font-family-geist text-[12px]"
          >
            <Icon name="folder_zip" size={17} className="text-(--color-primary)" />
            Zip
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-(--color-error) hover:bg-(--color-error-container)/30 transition-colors font-family-geist text-[12px] ml-1"
          >
            <Icon name="delete" size={17} />
            Delete
          </button>
        </div>

        <button
          type="button"
          onClick={onClear}
          title="Clear selection"
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-(--color-surface-container) text-(--color-secondary) transition-colors ml-1"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
