import { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { filesApi } from '../../api/files';
import type { FileItem } from '../../types';
import { Icon } from '../ui/Icon';

interface BulkRenameModalProps {
  items: FileItem[];
  onClose: () => void;
  onRenamed: () => void;
}

export function BulkRenameModal({ items, onClose, onRenamed }: BulkRenameModalProps) {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => {
    return items.map((item) => {
      try {
        const pattern = useRegex ? new RegExp(find, 'g') : find;
        const newName = find ? item.name.replaceAll(pattern as string, replace) : item.name;
        return { item, newName, changed: newName !== item.name };
      } catch {
        return { item, newName: item.name, changed: false };
      }
    });
  }, [items, find, replace, useRegex]);

  const handleRename = async () => {
    const renames = preview
      .filter((p) => p.changed)
      .map((p) => ({ path: p.item.path, new_name: p.newName }));

    if (renames.length === 0) {
      setError('No items would be renamed with this pattern.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await filesApi.bulkRename(renames);
      onRenamed();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Rename failed');
    } finally {
      setLoading(false);
    }
  };

  const changedCount = preview.filter((p) => p.changed).length;

  return (
    <Modal title="Bulk Rename" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Pattern inputs */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-(--color-surface-container-low) rounded-lg px-3 py-2 border border-(--color-surface-container-high)">
              <span className="font-family-geist text-[11px] text-(--color-secondary) shrink-0">Find</span>
              <input
                type="text"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder={useRegex ? 'regex pattern…' : 'text to find…'}
                className="flex-1 bg-transparent font-family-geist text-[12px] text-(--color-on-surface) placeholder:text-(--color-outline) focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setUseRegex((v) => !v)}
              className={`px-2.5 py-2 rounded-lg font-family-geist text-[11px] font-semibold transition-colors border ${
                useRegex
                  ? 'bg-(--color-primary) text-(--color-on-primary) border-(--color-primary)'
                  : 'bg-(--color-surface-container-low) text-(--color-secondary) border-(--color-surface-container-high)'
              }`}
            >
              .*
            </button>
          </div>
          <div className="flex items-center gap-2 bg-(--color-surface-container-low) rounded-lg px-3 py-2 border border-(--color-surface-container-high)">
            <span className="font-family-geist text-[11px] text-(--color-secondary) shrink-0">Replace</span>
            <input
              type="text"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="replacement…"
              className="flex-1 bg-transparent font-family-geist text-[12px] text-(--color-on-surface) placeholder:text-(--color-outline) focus:outline-none"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-1 max-h-52 overflow-y-auto rounded-xl border border-(--color-surface-container-high) p-2">
          {preview.map(({ item, newName, changed }) => (
            <div
              key={item.path}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-family-geist ${
                changed ? 'bg-(--color-primary-fixed)/30' : ''
              }`}
            >
              <span className="flex-1 text-(--color-secondary) truncate">{item.name}</span>
              {changed && (
                <>
                  <Icon name="arrow_forward" size={14} className="text-(--color-primary) shrink-0" />
                  <span className="flex-1 text-(--color-primary) font-medium truncate">{newName}</span>
                </>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="font-family-geist text-[11px] text-(--color-error)">{error}</p>
        )}

        <div className="flex items-center gap-2 justify-end">
          <span className="font-family-geist text-[11px] text-(--color-secondary) mr-auto">
            {changedCount} of {items.length} items will be renamed
          </span>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) text-(--color-on-surface) font-family-geist text-[12px] hover:bg-(--color-surface-container-low) transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRename}
            disabled={loading || changedCount === 0}
            className="px-4 py-2 rounded-lg bg-(--color-primary) text-(--color-on-primary) font-family-geist text-[12px] font-medium hover:bg-(--color-primary-container) transition-colors disabled:opacity-50"
          >
            {loading ? 'Renaming…' : `Rename ${changedCount} items`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
