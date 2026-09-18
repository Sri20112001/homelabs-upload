import { useState } from 'react';
import { Modal } from './Modal';
import { filesApi } from '../../api/files';
import { joinPath } from '../../utils';
import { Icon } from '../ui/Icon';
import { DirectoryTree } from '../files/DirectoryTree';

interface MoveModalProps {
  sources: { path: string; name: string }[];
  onClose: () => void;
  onMoved: () => void;
}

export function MoveModal({ sources, onClose, onMoved }: MoveModalProps) {
  const [browsePath, setBrowsePath] = useState('/');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMove = async () => {
    setLoading(true);
    setError('');
    try {
      for (const src of sources) {
        const dest = joinPath(browsePath, src.name);
        await filesApi.move(src.path, dest);
      }
      onMoved();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Move failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Move to…" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-(--color-surface-container-low) border border-(--color-surface-container-high)">
          <Icon name="folder_open" size={16} className="text-(--color-secondary)" />
          <span className="font-family-geist text-[12px] text-(--color-primary) font-medium">
            {browsePath}
          </span>
        </div>

        <div className="max-h-56 overflow-y-auto rounded-xl border border-(--color-surface-container-high) p-2">
          <DirectoryTree
            selected={browsePath}
            onSelect={setBrowsePath}
            exclude={sources.map((s) => s.path)}
          />
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
            onClick={handleMove}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-(--color-primary) text-(--color-on-primary) font-family-geist text-[12px] font-medium hover:bg-(--color-primary-container) transition-colors disabled:opacity-50"
          >
            {loading ? 'Moving…' : `Move here`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
