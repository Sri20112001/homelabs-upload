import { useState, useEffect, useRef, useCallback } from 'react';
import { filesApi } from '../../api/files';
import type { FileItem } from '../../types';
import { getFileIcon, formatBytes } from '../../utils';
import { Icon } from '../ui/Icon';

interface CommandPaletteProps {
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function CommandPalette({ onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await filesApi.search(q);
      setResults(res.results.slice(0, 12));
      setActiveIdx(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIdx]) {
      const item = results[activeIdx];
      const navPath = item.type === 'directory' ? item.path : item.path.split('/').slice(0, -1).join('/') || '/';
      onNavigate(navPath);
      onClose();
    }
    if (e.key === 'Escape') onClose();
  };

  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-(--color-on-surface)/20 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="w-full max-w-xl bg-(--color-surface-container-lowest) rounded-2xl shadow-[0_20px_32px_-8px_rgba(23,25,28,0.08),0_8px_16px_-4px_rgba(23,25,28,0.04)] border border-(--color-surface-container-high) overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-(--color-surface-container-high)">
          <Icon name="search" size={20} className="text-(--color-secondary)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files and folders…"
            className="flex-1 bg-transparent text-(--color-on-surface) font-(family-name:--font-family-inter) text-[15px] placeholder:text-(--color-outline) focus:outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin" />
          )}
          <span className="font-family-geist text-[11px] px-1.5 py-0.5 rounded bg-(--color-surface-container) text-(--color-secondary)">
            ESC
          </span>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.map((item, idx) => {
              const icon = item.type === 'directory' ? 'folder' : getFileIcon(item.name, item.mime_type);
              const parentDir = item.path.split('/').slice(0, -1).join('/') || '/';
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    const navPath = item.type === 'directory' ? item.path : parentDir;
                    onNavigate(navPath);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    idx === activeIdx ? 'bg-(--color-surface-container-low)' : 'hover:bg-(--color-surface-container-low)'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-(--color-surface-container) flex items-center justify-center shrink-0">
                    <Icon name={icon} size={18} className="text-(--color-primary)" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-family-geist text-[13px] text-(--color-on-surface) font-medium truncate">
                      {item.name}
                    </p>
                    <p className="font-family-geist text-[11px] text-(--color-secondary) truncate">
                      {parentDir}
                    </p>
                  </div>
                  {item.type === 'file' && (
                    <span className="font-family-geist text-[11px] text-(--color-secondary) shrink-0">
                      {formatBytes(item.size)}
                    </span>
                  )}
                  <Icon name={item.type === 'directory' ? 'folder_open' : 'arrow_forward'} size={16} className="text-(--color-outline)" />
                </button>
              );
            })}
          </div>
        )}

        {query && !loading && results.length === 0 && (
          <div className="py-10 text-center">
            <Icon name="search_off" size={32} className="text-(--color-outline) block mb-2" />
            <p className="font-family-geist text-[13px] text-(--color-secondary)">
              No results for "{query}"
            </p>
          </div>
        )}

        {!query && (
          <div className="px-4 py-3 flex items-center gap-4 text-(--color-secondary)">
            <span className="flex items-center gap-1 font-family-geist text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-(--color-surface-container) text-[10px]">↑↓</span> navigate
            </span>
            <span className="flex items-center gap-1 font-family-geist text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-(--color-surface-container) text-[10px]">↵</span> open
            </span>
            <span className="flex items-center gap-1 font-family-geist text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-(--color-surface-container) text-[10px]">ESC</span> close
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
