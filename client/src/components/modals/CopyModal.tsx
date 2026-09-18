import { useState } from 'react';
import { Modal } from './Modal';
import { filesApi } from '../../api/files';
import { useDirectory } from '../../hooks/useDirectory';
import { joinPath } from '../../utils';
import { Icon } from '../ui/Icon';

interface CopyModalProps {
  sources: { path: string; name: string }[];
  onClose: () => void;
  onCopied: () => void;
}

export function CopyModal({ sources, onClose, onCopied }: CopyModalProps) {
  const [browsePath, setBrowsePath] = useState('/');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { data } = useDirectory(browsePath);

  const dirs = data?.items.filter((i) => i.type === 'directory') ?? [];

  const handleCopy = async () => {
    setLoading(true);
    setError('');
    try {
      for (const src of sources) {
        const dest = joinPath(browsePath, src.name);
        await filesApi.copy(src.path, dest);
      }
      onCopied();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Copy failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Copy to…" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-(--color-surface-container-low) border border-(--color-surface-container-high)">
          <Icon name="folder_open" size={16} className="text-(--color-secondary)" />
          <span className="font-family-geist text-[12px] text-(--color-primary) font-medium">
            {browsePath}
          </span>
        </div>

        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-xl border border-(--color-surface-container-high) p-2">
          {browsePath !== '/' && (
            <button
              type="button"
              onClick={() => {
                const parts = browsePath.replace(/\/$/, '').split('/');
                parts.pop();
                setBrowsePath(parts.join('/') || '/');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-(--color-surface-container-low) text-(--color-secondary) transition-colors"
            >
              <Icon name="arrow_upward" size={16} />
              <span className="font-family-geist text-[12px]">.. (up)</span>
            </button>
          )}
          {dirs.map((dir) => (
            <button
              key={dir.path}
              type="button"
              onClick={() => setBrowsePath(dir.path)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-(--color-surface-container-low) text-(--color-on-surface) transition-colors"
            >
              <Icon name="folder" size={16} className="text-(--color-primary)" />
              <span className="font-family-geist text-[12px]">{dir.name}</span>
            </button>
          ))}
          {dirs.length === 0 && (
            <p className="px-3 py-4 text-center font-family-geist text-[12px] text-(--color-secondary)">
              No subdirectories
            </p>
          )}
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
            onClick={handleCopy}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-(--color-primary) text-(--color-on-primary) font-family-geist text-[12px] font-medium hover:bg-(--color-primary-container) transition-colors disabled:opacity-50"
          >
            {loading ? 'Copying…' : 'Copy here'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
