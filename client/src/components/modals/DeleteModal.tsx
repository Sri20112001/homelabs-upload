import { useState } from 'react';
import { Modal } from './Modal';
import { filesApi } from '../../api/files';
import { Icon } from '../ui/Icon';

interface DeleteModalProps {
  paths: { path: string; name: string; isDir: boolean }[];
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteModal({ paths, onClose, onDeleted }: DeleteModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      for (const item of paths) {
        await filesApi.delete(item.path, item.isDir);
      }
      onDeleted();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Confirm Delete" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-(--color-error-container)/30 border border-(--color-error-container)">
          <Icon name="warning" size={20} className="text-(--color-error) shrink-0 mt-0.5" />
          <div>
            <p className="font-family-geist text-[13px] text-(--color-on-surface) font-medium">
              {paths.length === 1
                ? `Delete "${paths[0].name}"?`
                : `Delete ${paths.length} items?`}
            </p>
            <p className="font-(family-name:--font-family-inter) text-[12px] text-(--color-secondary) mt-1">
              {paths.some((p) => p.isDir)
                ? 'Directories and all their contents will be permanently deleted.'
                : 'This action cannot be undone.'}
            </p>
          </div>
        </div>
        {error && (
          <p className="font-family-geist text-[11px] text-(--color-error)">{error}</p>
        )}
        <div className="flex items-center gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) text-(--color-on-surface) font-family-geist text-[12px] hover:bg-(--color-surface-container-low) transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-(--color-error) text-(--color-on-error) font-family-geist text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
