import { useState, useEffect, useCallback } from 'react';
import { Modal } from './Modal';
import { filesApi } from '../../api/files';
import type { TrashItem } from '../../types';
import { formatBytes, formatRelativeTime } from '../../utils';
import { Icon } from '../ui/Icon';

interface TrashModalProps {
  onClose: () => void;
  onRestored: () => void;
}

export function TrashModal({ onClose, onRestored }: TrashModalProps) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await filesApi.trashList();
      setItems(res.items ?? []);
    } catch {
      setError('Failed to load trash');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (id: string) => {
    try {
      await filesApi.trashRestore(id);
      onRestored();
      load();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Restore failed');
    }
  };

  const handlePurge = async () => {
    try {
      await filesApi.trashPurge();
      setItems([]);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Purge failed');
    }
  };

  return (
    <Modal title="Trash" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {error && (
          <p className="font-family-geist text-[11px] text-(--color-error)">{error}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Icon name="delete_sweep" size={40} className="text-(--color-outline) mb-3" />
            <p className="font-family-geist text-[13px] text-(--color-secondary)">Trash is empty</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto rounded-xl border border-(--color-surface-container-high) p-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-surface-container-low) transition-colors"
                >
                  <Icon name={item.is_dir ? 'folder' : 'draft'} size={18} className="text-(--color-secondary)" />
                  <div className="flex-1 min-w-0">
                    <p className="font-family-geist text-[12px] text-(--color-on-surface) font-medium truncate">
                      {item.name}
                    </p>
                    <p className="font-family-geist text-[11px] text-(--color-secondary) truncate">
                      {item.original_path} · {item.is_dir ? 'folder' : formatBytes(item.size)} · deleted {formatRelativeTime(item.deleted_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(item.id)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-(--color-primary-fixed)/40 text-(--color-primary) hover:bg-(--color-primary-fixed) transition-colors font-family-geist text-[11px] font-medium"
                  >
                    <Icon name="restore" size={14} />
                    Restore
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-family-geist text-[11px] text-(--color-secondary)">
                {items.length} item{items.length !== 1 ? 's' : ''} in trash
              </span>
              <button
                type="button"
                onClick={handlePurge}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-(--color-error) hover:bg-(--color-error-container)/30 transition-colors font-family-geist text-[12px] font-medium border border-(--color-error-container)"
              >
                <Icon name="delete_forever" size={16} />
                Empty Trash
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
