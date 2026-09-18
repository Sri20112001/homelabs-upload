import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { filesApi } from '../../api/files';
import { useToast } from '../ui/Toast';
import { API_BASE_URL } from '../../config/app';

interface TextEditorModalProps {
  path: string;
  name: string;
  onClose: () => void;
  onSaved: () => void;
}

import { CODE_HIGHLIGHT_EXTS, EDITABLE_EXTS, fileExt } from '../../config/contentTypes';

export function isEditable(name: string): boolean {
  return (EDITABLE_EXTS as readonly string[]).includes(fileExt(name));
}

function isCodeExt(ext: string): boolean {
  return (CODE_HIGHLIGHT_EXTS as readonly string[]).includes(ext);
}

export function TextEditorModal({ path, name, onClose, onSaved }: TextEditorModalProps) {
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const url = filesApi.downloadUrl(path);
    fetch(url)
      .then((r) => r.text())
      .then((text) => {
        setContent(text);
        setOriginal(text);
      })
      .catch(() => setError('Failed to load file'))
      .finally(() => setLoading(false));
  }, [path]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Upload as a new file by deleting old + uploading new content
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], name);
      const parentDir = path.split('/').slice(0, -1).join('/') || '/';

      // Delete existing then upload
      await filesApi.delete(path, false);
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE_URL}/files/upload?path=${encodeURIComponent(parentDir)}`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('Save failed');
      setOriginal(content);
      toast(`Saved ${name}`, 'success');
      onSaved();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const isDirty = content !== original;
  const isCode = isCodeExt(fileExt(name));

  return (
    <Modal title={`Edit — ${name}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className={`w-full h-80 resize-y rounded-xl border border-(--color-surface-container-high) bg-(--color-surface-container-low) p-3 focus:outline-none focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary-fixed) transition-all ${
              isCode
                ? 'font-mono text-[12px] leading-relaxed'
                : 'font-(family-name:--font-family-inter) text-[13px] leading-relaxed'
            } text-(--color-on-surface)`}
          />
        )}

        {error && (
          <p className="font-family-geist text-[11px] text-(--color-error)">{error}</p>
        )}

        <div className="flex items-center gap-2 justify-end">
          {isDirty && (
            <span className="font-family-geist text-[11px] text-(--color-secondary) mr-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-(--color-primary)" />
              Unsaved changes
            </span>
          )}
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) text-(--color-on-surface) font-family-geist text-[12px] hover:bg-(--color-surface-container-low) transition-colors">
            {isDirty ? 'Discard' : 'Close'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-4 py-2 rounded-lg bg-(--color-primary) text-(--color-on-primary) font-family-geist text-[12px] font-medium hover:bg-(--color-primary-container) transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
