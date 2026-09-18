import { useState } from 'react';
import { Modal } from './Modal';
import { filesApi } from '../../api/files';

interface RenameModalProps {
  path: string;
  currentName: string;
  onClose: () => void;
  onRenamed: () => void;
}

export function RenameModal({ path, currentName, onClose, onRenamed }: RenameModalProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === currentName) return;
    setLoading(true);
    setError('');
    try {
      await filesApi.rename(path, name.trim());
      onRenamed();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Rename failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Rename" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block font-family-geist text-[12px] text-(--color-secondary) mb-1.5">
            New name
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) text-(--color-on-surface) font-family-geist text-[13px] focus:outline-none focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary-fixed) transition-all"
          />
          {error && (
            <p className="mt-1.5 font-family-geist text-[11px] text-(--color-error)">{error}</p>
          )}
        </div>
        <div className="flex items-center gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) text-(--color-on-surface) font-family-geist text-[12px] hover:bg-(--color-surface-container-low) transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading || !name.trim() || name === currentName} className="px-4 py-2 rounded-lg bg-(--color-primary) text-(--color-on-primary) font-family-geist text-[12px] font-medium hover:bg-(--color-primary-container) transition-colors disabled:opacity-50">
            {loading ? 'Renaming…' : 'Rename'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
