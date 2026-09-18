import { useState, useCallback, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import type { TransferItem } from '../../types';
import { formatBytes, getFileIcon } from '../../utils';
import { Icon } from '../ui/Icon';

interface UploadModalProps {
  destPath: string;
  onClose: () => void;
  onEnqueue: (file: File, destPath: string) => void;
}

interface StagedFile {
  id: number;
  file: File;
  previewUrl: string | null;
}

let stagedId = 0;

export function UploadModal({ destPath, onClose, onEnqueue }: UploadModalProps) {
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke any leftover object URLs if the modal closes mid-staging.
  // (removeStaged/handleConfirm revoke eagerly; this covers Cancel/close.)
  const stagedRef = useRef(staged);
  stagedRef.current = staged;
  useEffect(() => {
    return () => {
      for (const s of stagedRef.current) {
        if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
      }
    };
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).map((file) => ({
      id: ++stagedId,
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setStaged((prev) => [...prev, ...next]);
  }, []);

  const removeStaged = useCallback((id: number) => {
    setStaged((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    for (const s of staged) {
      onEnqueue(s.file, destPath);
      if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
    }
    onClose();
  }, [staged, destPath, onEnqueue, onClose]);

  return (
    <Modal title="Upload Files" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          className={`relative rounded-xl border-2 border-dashed transition-all p-6 flex flex-col items-center text-center ${
            dragging
              ? 'border-(--color-primary) bg-(--color-primary-fixed)/30'
              : 'border-(--color-surface-container-highest) bg-(--color-surface-container-low)'
          }`}
        >
          <div className="relative w-14 h-14 mb-3 flex items-center justify-center">
            <div className="absolute inset-0 bg-(--color-primary-fixed) rounded-full animate-pulse opacity-70" />
            <div className="relative w-11 h-11 bg-(--color-surface-container-lowest) rounded-full shadow-md flex items-center justify-center text-(--color-primary)">
              <Icon name="cloud_upload" size={26} />
            </div>
          </div>
          <h3 className="font-family-geist text-[16px] font-semibold text-(--color-on-surface) mb-1">
            Drop files anywhere
          </h3>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--color-secondary-container)/70">
            <span className="font-family-geist text-[12px] text-(--color-on-secondary-fixed)">
              Destination:
            </span>
            <span className="font-family-geist text-[11px] text-(--color-primary) font-medium">
              {destPath}
            </span>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        {staged.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center gap-2">
              <p className="font-family-geist text-[13px] font-medium text-(--color-on-surface) truncate">
                Staged files ({staged.length})
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-family-geist text-[12px] text-(--color-secondary) hover:text-(--color-on-surface) border border-(--color-surface-container-high) rounded-lg hover:bg-(--color-surface-container-low) transition-colors shrink-0"
              >
                <Icon name="add" size={15} />
                Add more
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
              {staged.map((s) => (
                <div key={s.id} className="relative rounded-lg overflow-hidden bg-(--color-surface-container) border border-(--color-surface-container-high)">
                  {s.previewUrl ? (
                    <img
                      src={s.previewUrl}
                      alt={s.file.name}
                      draggable={false}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square flex flex-col items-center justify-center gap-1 p-2">
                      <Icon name={getFileIcon(s.file.name, s.file.type)} size={26} className="text-(--color-primary)" />
                      <span className="font-family-geist text-[9px] text-(--color-secondary) truncate w-full text-center">
                        {formatBytes(s.file.size)}
                      </span>
                    </div>
                  )}
                  <div className="px-1.5 py-1 bg-(--color-surface-container-lowest)">
                    <p className="font-family-geist text-[10px] text-(--color-on-surface) truncate" title={s.file.name}>
                      {s.file.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStaged(s.id)}
                    aria-label={`Remove ${s.file.name}`}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-(--color-surface-container-lowest) text-(--color-on-surface) shadow-md border border-(--color-surface-container-high) flex items-center justify-center hover:text-(--color-error) transition-colors"
                  >
                    <Icon name="close" size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) text-(--color-on-surface) font-family-geist text-[12px] hover:bg-(--color-surface-container-low) transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={staged.length === 0}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-brand-primary to-brand-neon text-brand-highlight font-family-geist text-[12px] font-medium transition-all shadow-blue-glow disabled:opacity-50"
          >
            <Icon name="upload_file" size={16} />
            {staged.length > 0 ? `Upload ${staged.length} file${staged.length !== 1 ? 's' : ''}` : 'Select files'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface TransferCenterProps {
  transfers: TransferItem[];
  onCancel: (id: string) => void;
  onClearDone: () => void;
  activeCount: number;
}

export function TransferCenter({ transfers, onCancel, onClearDone, activeCount }: TransferCenterProps) {
  const [minimized, setMinimized] = useState(false);

  if (transfers.length === 0) return null;

  return (
    <div className="w-full bg-(--color-surface-container-lowest)/95 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden border border-(--color-surface-container-high) transition-all duration-300">
      {/* Header */}
      <div className="bg-(--color-surface-container-low) px-(--spacing-space-lg) py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {activeCount > 0 && <div className="w-2.5 h-2.5 rounded-full bg-(--color-primary) animate-pulse" />}
          <span className="font-family-geist text-[18px] font-medium text-(--color-on-surface)">
            {activeCount > 0 ? 'Active Transfers' : 'Transfers'}
          </span>
          {activeCount > 0 && (
            <span className="font-family-geist text-[11px] px-2 py-0.5 rounded-full bg-(--color-primary) text-(--color-on-primary) font-medium">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-(--color-secondary)">
          <button
            type="button"
            onClick={onClearDone}
            className="px-2 py-1 rounded hover:bg-(--color-surface-container) hover:text-(--color-on-surface) transition-colors flex items-center gap-1 font-family-geist text-[12px]"
          >
            <Icon name="clear_all" size={15} />
            <span className="hidden sm:inline">Clear Done</span>
          </button>
          <button
            type="button"
            onClick={() => setMinimized((v) => !v)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-(--color-surface-container) hover:text-(--color-on-surface) transition-colors ml-1"
          >
            <Icon name={minimized ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={18} />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="flex flex-col gap-2 p-3 max-h-80 overflow-y-auto">
          {transfers.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-(--color-surface-container-high) bg-(--color-surface-container-lowest) shadow-sm overflow-hidden"
            >
              <div className="px-4 py-2.5 flex justify-between items-center gap-2">
                <p className="font-family-geist text-[13px] text-(--color-on-surface) font-medium truncate">
                  {t.name}
                </p>
                {t.status === 'uploading' ? (
                  <button
                    type="button"
                    onClick={() => onCancel(t.id)}
                    aria-label={`Cancel ${t.name}`}
                    className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-(--color-secondary) hover:text-(--color-error) hover:bg-(--color-surface-container) transition-colors"
                  >
                    <Icon name="close" size={14} />
                  </button>
                ) : (
                  <Icon
                    name={t.status === 'completed' ? 'check_circle' : 'error'}
                    size={18}
                    className={t.status === 'completed' ? 'text-(--color-primary)' : 'text-(--color-error)'}
                  />
                )}
              </div>
              <div className="px-4 pb-3">
                <p className="mb-2 font-family-inter text-[11px] text-(--color-secondary) truncate">
                  {formatBytes(t.size)}
                  {t.status === 'uploading' && t.speed > 0 && ` • ${formatBytes(t.speed)}/s`}
                  {t.status === 'completed' && ` • → ${t.destPath}`}
                  {t.status === 'failed' && t.error && ` • ${t.error}`}
                </p>
                <div className="w-full bg-(--color-surface-container) rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      t.status === 'completed'
                        ? 'bg-(--color-primary)'
                        : t.status === 'failed'
                          ? 'bg-(--color-error)'
                          : 'bg-(--color-primary)'
                    }`}
                    style={{ width: `${t.status === 'uploading' ? t.progress : 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-family-geist text-[11px] text-(--color-secondary)">
                    {t.status === 'uploading'
                      ? `${t.progress}% uploading`
                      : t.status === 'completed'
                        ? 'Complete'
                        : 'Failed'}
                  </span>
                  {t.status === 'completed' && (
                    <span className="font-family-geist text-[11px] font-medium text-(--color-on-secondary-fixed) bg-(--color-secondary-container) px-2 py-0.5 rounded-full">
                      Done
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
