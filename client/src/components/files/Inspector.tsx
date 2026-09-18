import { useState } from 'react';
import type { FileItem } from '../../types';
import type { FolderSizeResult } from '../../types';
import { filesApi } from '../../api/files';
import { formatBytes, formatRelativeTime } from '../../utils';
import { FilePreview } from './FilePreview';
import { useToast } from '../ui/Toast';
import { isEditable } from '../modals/TextEditorModal';
import { Icon } from '../ui/Icon';

interface InspectorProps {
  item: FileItem;
  onClose: () => void;
  onRename: () => void;
  onMove: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

export function Inspector({ item, onClose, onRename, onMove, onCopy, onDelete, onEdit }: InspectorProps) {
  const isDir = item.type === 'directory';
  const { toast } = useToast();
  const [folderSize, setFolderSize] = useState<FolderSizeResult | null>(null);
  const [loadingSize, setLoadingSize] = useState(false);

  const handleCalcSize = async () => {
    setLoadingSize(true);
    try {
      const result = await filesApi.folderSize(item.path);
      setFolderSize(result);
    } catch {
      toast('Failed to calculate size', 'error');
    } finally {
      setLoadingSize(false);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = filesApi.downloadUrl(item.path);
    a.download = item.name;
    a.click();
    toast(`Downloading ${item.name}`, 'info');
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(item.path).then(() => toast('Path copied', 'success'));
  };

  return (
    <div className="lg:col-span-4 sticky top-20 flex flex-col rounded-2xl bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) shadow-[0_12px_36px_-8px_rgba(23,25,28,0.08),0_4px_12px_-2px_rgba(23,25,28,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-(--color-surface-container-high)">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="visibility" size={18} className="text-(--color-primary)" />
          <span className="font-family-geist text-[12px] font-semibold text-(--color-on-surface)">
            Inspector
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-(--color-secondary) hover:text-(--color-on-surface) hover:bg-(--color-surface-container) transition-colors"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-180px)]">
        {/* Rich preview */}
        <FilePreview item={item} />

        {/* Quick actions */}
        <div className={`grid gap-2 ${isDir ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {!isDir && (
            <button
              type="button"
              onClick={handleDownload}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-(--color-surface-container-low) hover:bg-(--color-surface-container) text-(--color-on-surface) transition-colors gap-1 border border-(--color-surface-container)"
            >
              <Icon name="download" size={18} className="text-(--color-primary)" />
              <span className="font-family-geist text-[11px] font-medium">Download</span>
            </button>
          )}
          {!isDir && isEditable(item.name) && (
            <button
              type="button"
              onClick={onEdit}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-(--color-surface-container-low) hover:bg-(--color-surface-container) text-(--color-on-surface) transition-colors gap-1 border border-(--color-surface-container)"
            >
              <Icon name="edit_note" size={18} className="text-(--color-primary)" />
              <span className="font-family-geist text-[11px] font-medium">Edit</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRename}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-(--color-surface-container-low) hover:bg-(--color-surface-container) text-(--color-on-surface) transition-colors gap-1 border border-(--color-surface-container)"
          >
            <Icon name="edit" size={18} className="text-(--color-primary)" />
            <span className="font-family-geist text-[11px] font-medium">Rename</span>
          </button>
          <button
            type="button"
            onClick={onMove}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-(--color-surface-container-low) hover:bg-(--color-surface-container) text-(--color-on-surface) transition-colors gap-1 border border-(--color-surface-container)"
          >
            <Icon name="drive_file_move" size={18} className="text-(--color-primary)" />
            <span className="font-family-geist text-[11px] font-medium">Move</span>
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-(--color-surface-container-low) hover:bg-(--color-surface-container) text-(--color-on-surface) transition-colors gap-1 border border-(--color-surface-container)"
          >
            <Icon name="content_copy" size={18} className="text-(--color-primary)" />
            <span className="font-family-geist text-[11px] font-medium">Copy</span>
          </button>
        </div>

        {/* Metadata */}
        <div className="flex flex-col gap-2">
          <span className="font-family-geist text-[11px] text-(--color-secondary) uppercase tracking-wider font-semibold">
            Metadata
          </span>
          <div className="flex flex-col rounded-xl bg-(--color-surface-container-low) border border-(--color-surface-container) p-3 gap-2">
            {[
              { label: 'Name', value: item.name },
              { label: 'Type', value: isDir ? 'Directory' : (item.mime_type ?? item.extension ?? 'File') },
              ...(!isDir ? [{ label: 'Size', value: formatBytes(item.size) }] : []),
              ...(isDir && folderSize ? [{ label: 'Total Size', value: `${formatBytes(folderSize.size_bytes)} (${folderSize.file_count} files)` }] : []),
              { label: 'Modified', value: formatRelativeTime(item.modified_at) },
            ].map(({ label, value }, idx, arr) => (
              <span key={label}>
                <div className="flex items-start justify-between text-[12px] gap-2">
                  <span className="text-(--color-secondary) font-family-geist shrink-0">{label}</span>
                  <span className="font-family-geist text-[11px] text-(--color-on-surface) font-medium text-right break-all">{value}</span>
                </div>
                {idx < arr.length - 1 && <div className="h-px bg-(--color-surface-container-highest) mt-2" />}
              </span>
            ))}
            {/* Path row with copy button */}
            <div className="h-px bg-(--color-surface-container-highest)" />
            <div className="flex items-start justify-between text-[12px] gap-2">
              <span className="text-(--color-secondary) font-family-geist shrink-0">Path</span>
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-family-geist text-[11px] text-(--color-on-surface) font-medium text-right break-all">{item.path}</span>
                <button
                  type="button"
                  onClick={handleCopyPath}
                  className="shrink-0 text-(--color-secondary) hover:text-(--color-primary) transition-colors"
                  title="Copy path"
                >
                  <Icon name="content_copy" size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Folder size calculator */}
        {isDir && !folderSize && (
          <button
            type="button"
            onClick={handleCalcSize}
            disabled={loadingSize}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-(--color-secondary) hover:bg-(--color-surface-container-low) transition-colors font-family-geist text-[12px] border border-(--color-surface-container-high) disabled:opacity-50"
          >
            {loadingSize ? (
              <div className="w-4 h-4 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="storage" size={16} />
            )}
            {loadingSize ? 'Calculating…' : 'Calculate folder size'}
          </button>
        )}

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-(--color-error) hover:bg-(--color-error-container)/30 transition-colors font-family-geist text-[12px] font-medium border border-(--color-error-container)"
        >
          <Icon name="delete" size={16} />
          Delete {isDir ? 'Folder' : 'File'}
        </button>
      </div>
    </div>
  );
}
