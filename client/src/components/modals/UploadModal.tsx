import { useState, useCallback, useRef } from 'react';
import { Modal } from './Modal';
import type { TransferItem } from '../../types';
import { formatBytes } from '../../utils';
import { Icon } from '../ui/Icon';

interface UploadModalProps {
  destPath: string;
  onClose: () => void;
  onEnqueue: (file: File, destPath: string) => void;
}

export function UploadModal({ destPath, onClose, onEnqueue }: UploadModalProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      for (const file of Array.from(files)) {
        onEnqueue(file, destPath);
      }
      onClose();
    },
    [destPath, onEnqueue, onClose],
  );

  return (
    <Modal title="Upload Files" onClose={onClose}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={`relative rounded-xl border-2 border-dashed transition-all p-8 flex flex-col items-center text-center ${
          dragging
            ? 'border-(--color-primary) bg-(--color-primary-fixed)/30'
            : 'border-(--color-surface-container-highest) bg-(--color-surface-container-low)'
        }`}
      >
        <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-(--color-primary-fixed) rounded-full animate-pulse opacity-70" />
          <div className="relative w-12 h-12 bg-(--color-surface-container-lowest) rounded-full shadow-md flex items-center justify-center text-(--color-primary)">
            <Icon name="cloud_upload" size={28} />
          </div>
        </div>
        <h3 className="font-family-geist text-[18px] font-semibold text-(--color-on-surface) mb-1">
          Drop files anywhere
        </h3>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--color-secondary-container)/70 mb-4">
          <span className="font-family-geist text-[12px] text-(--color-on-secondary-fixed)">
            Destination:
          </span>
          <span className="font-family-geist text-[11px] text-(--color-primary) font-medium">
            {destPath}
          </span>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 bg-(--color-primary) text-(--color-on-primary) px-5 py-2.5 rounded-lg shadow-sm hover:bg-(--color-primary-container) transition-all font-family-geist text-[12px] font-medium"
        >
          <Icon name="folder_open" size={18} />
          Browse Local Files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
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
        <div className="divide-y divide-(--color-surface-container-high) max-h-80 overflow-y-auto">
          {transfers.map((t) => (
            <div key={t.id} className="p-(--spacing-space-lg) hover:bg-(--color-surface-container-low)/40 transition-colors">
              <div className="flex items-start justify-between gap-(--spacing-space-md) mb-2">
                <div className="flex items-center gap-(--spacing-space-sm) min-w-0">
                  <div className={`w-9 h-9 rounded shrink-0 flex items-center justify-center ${
                    t.status === 'completed' ? 'bg-(--color-secondary-container)' :
                    t.status === 'failed' ? 'bg-(--color-error-container)' :
                    'bg-(--color-primary-fixed)'
                  }`}>
                    <Icon name={t.status === 'completed' ? 'check_circle' :
                       t.status === 'failed' ? 'error' : 'upload_file'} size={20} className={t.status === 'completed' ? 'text-(--color-on-secondary-fixed)' :
                      t.status === 'failed' ? 'text-(--color-error)' :
                      'text-(--color-primary)'} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-family-geist text-[12px] text-(--color-on-surface) font-medium truncate">
                      {t.name}
                    </p>
                    <div className="flex items-center gap-2 font-family-geist text-[11px] text-(--color-secondary) mt-0.5">
                      <span>{formatBytes(t.size)}</span>
                      {t.status === 'uploading' && t.speed > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-(--color-primary) font-medium">
                            {formatBytes(t.speed)}/s
                          </span>
                        </>
                      )}
                      {t.status === 'completed' && (
                        <>
                          <span>•</span>
                          <span className="text-(--color-on-surface-variant)">→ {t.destPath}</span>
                        </>
                      )}
                      {t.status === 'failed' && t.error && (
                        <>
                          <span>•</span>
                          <span className="text-(--color-error)">{t.error}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {t.status === 'uploading' && (
                    <>
                      <span className="font-family-geist text-[11px] font-semibold text-(--color-primary) px-2 py-0.5 rounded-full bg-(--color-primary-fixed)">
                        {t.progress}%
                      </span>
                      <button
                        type="button"
                        onClick={() => onCancel(t.id)}
                        className="w-7 h-7 rounded flex items-center justify-center text-(--color-secondary) hover:text-(--color-error) hover:bg-(--color-surface-container) transition-colors"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </>
                  )}
                  {t.status === 'completed' && (
                    <div className="flex items-center gap-1 font-family-geist text-[11px] text-(--color-on-secondary-fixed) bg-(--color-secondary-container) px-2.5 py-1 rounded-full font-medium">
                      <Icon name="check_circle" size={16} className="text-(--color-primary)" />
                      Done
                    </div>
                  )}
                </div>
              </div>
              {t.status === 'uploading' && (
                <div className="w-full bg-(--color-surface-container) rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-(--color-primary) h-full rounded-full transition-all duration-300"
                    style={{ width: `${t.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
