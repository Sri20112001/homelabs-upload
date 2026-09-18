import { useState, useCallback } from 'react';
import { filesApi } from '../api/files';
import type { FileItem } from '../types';
import { getFileIcon, formatBytes, formatRelativeTime } from '../utils';
import { Icon } from '../components/ui/Icon';

interface SearchPageProps {
  onNavigate: (path: string) => void;
}

export function SearchPage({ onNavigate }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await filesApi.search(query);
      setResults(res.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="flex flex-col w-full pb-16 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-family-geist text-[22px] font-semibold text-(--color-on-surface) mb-1">
          Search
        </h1>
        <p className="font-(family-name:--font-family-inter) text-[13px] text-(--color-secondary)">
          Search across all files and folders in your storage.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-3 mb-8">
        <div className="flex-1 flex items-center gap-3 bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) rounded-xl px-4 py-3 shadow-sm focus-within:border-(--color-primary) focus-within:ring-2 focus-within:ring-(--color-primary-fixed) transition-all">
          <Icon name="search" size={20} className="text-(--color-secondary)" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files and folders…"
            className="flex-1 bg-transparent text-(--color-on-surface) font-(family-name:--font-family-inter) text-[15px] placeholder:text-(--color-outline) focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 py-3 rounded-xl bg-(--color-primary) text-(--color-on-primary) font-family-geist text-[12px] font-medium hover:bg-(--color-primary-container) transition-colors disabled:opacity-50 shadow-sm"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-(--color-on-primary) border-t-transparent rounded-full animate-spin" />
          ) : 'Search'}
        </button>
      </form>

      {searched && !loading && (
        <div className="flex items-center gap-2 mb-4">
          <span className="font-family-geist text-[13px] text-(--color-secondary)">
            {results.length} result{results.length !== 1 ? 's' : ''} for
          </span>
          <span className="font-family-geist text-[13px] text-(--color-on-surface) font-medium">
            "{query}"
          </span>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-1">
          {results.map((item) => {
            const icon = item.type === 'directory' ? 'folder' : getFileIcon(item.name, item.mime_type);
            const parentDir = item.path.split('/').slice(0, -1).join('/') || '/';
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  const navPath = item.type === 'directory' ? item.path : parentDir;
                  onNavigate(navPath);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) hover:border-(--color-outline-variant) hover:shadow-md transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-(--color-surface-container) flex items-center justify-center shrink-0">
                  <Icon name={icon} size={22} className="text-(--color-primary)" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-family-geist text-[13px] text-(--color-on-surface) font-medium truncate">
                    {item.name}
                  </p>
                  <p className="font-family-geist text-[11px] text-(--color-secondary) truncate">
                    {parentDir}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {item.type === 'file' && (
                    <span className="font-family-geist text-[11px] text-(--color-secondary)">
                      {formatBytes(item.size)}
                    </span>
                  )}
                  <span className="font-family-geist text-[11px] text-(--color-secondary)">
                    {formatRelativeTime(item.modified_at)}
                  </span>
                </div>
                <Icon name="arrow_forward" size={18} className="text-(--color-outline)" />
              </button>
            );
          })}
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Icon name="search_off" size={48} className="text-(--color-outline) mb-4" />
          <h3 className="font-family-geist text-[18px] font-medium text-(--color-on-surface) mb-2">
            No results found
          </h3>
          <p className="font-(family-name:--font-family-inter) text-[13px] text-(--color-secondary)">
            Try a different search term.
          </p>
        </div>
      )}
    </div>
  );
}
