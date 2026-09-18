import type { ViewMode, SortField, SortDir, FilterType } from '../../types';
import { Icon } from './Icon';

interface ToolbarProps {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  sortField: SortField;
  sortDir: SortDir;
  onSortChange: (f: SortField, d: SortDir) => void;
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  filterText: string;
  onFilterTextChange: (v: string) => void;
  onNewFolder: () => void;
  onUpload: () => void;
}

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'folders', label: 'Folders' },
  { id: 'media', label: 'Media' },
  { id: 'documents', label: 'Documents' },
  { id: 'archives', label: 'Archives' },
];

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'modified_at', label: 'Date Modified' },
  { field: 'size', label: 'Size' },
  { field: 'type', label: 'Type' },
];

export function Toolbar({
  view, onViewChange,
  sortField, sortDir, onSortChange,
  filter, onFilterChange,
  filterText, onFilterTextChange,
  onNewFolder, onUpload,
}: ToolbarProps) {
  return (
    <div className="w-full bg-(--color-surface-container-lowest)/95 backdrop-blur-md rounded-xl p-(--spacing-space-sm) shadow-md flex flex-wrap items-center justify-between gap-(--spacing-space-md)">
      {/* Left: actions + filters */}
      <div className="flex items-center gap-(--spacing-space-sm) flex-wrap">
        <button
          type="button"
          onClick={onNewFolder}
          className="btn-primary flex items-center gap-1.5 bg-linear-to-r from-brand-primary to-brand-neon px-(--spacing-space-md) py-1.5 rounded-lg font-family-geist text-[12px] font-medium transition-all shadow-blue-glow"
        >
          <Icon name="create_new_folder" size={17} />
          <span>New Folder</span>
        </button>
        <button
          type="button"
          onClick={onUpload}
          className="flex items-center gap-1.5 bg-(--color-surface-container) hover:bg-(--color-surface-container-high) text-(--color-on-surface) px-(--spacing-space-md) py-1.5 rounded-lg font-family-geist text-[12px] font-medium transition-colors"
        >
          <Icon name="upload_file" size={17} className="text-(--color-primary)" />
          <span>Upload Files</span>
        </button>

        <div className="h-5 w-px bg-(--color-surface-container-highest) mx-1 hidden sm:block" />

        {/* Filter pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={`px-3 py-1 rounded-md font-family-geist text-[11px] font-semibold tracking-[0.03em] transition-colors ${
                filter === f.id
                  ? 'bg-(--color-primary) text-(--color-on-primary)'
                  : 'bg-(--color-surface-container-low) text-(--color-secondary) hover:text-(--color-on-surface)'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: view toggle + sort + filter input */}
      <div className="flex items-center gap-(--spacing-space-sm) flex-wrap">
        {/* View toggle */}
        <div className="flex items-center p-1 bg-(--color-surface-container-lowest) rounded-lg shadow-sm">
          <button
            type="button"
            onClick={() => onViewChange('grid')}
            className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors font-family-geist text-[11px] ${
              view === 'grid'
                ? 'bg-(--color-secondary-container) text-(--color-on-secondary-fixed)'
                : 'text-(--color-secondary) hover:text-(--color-on-surface)'
            }`}
          >
            <Icon name="grid_view" size={16} />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            type="button"
            onClick={() => onViewChange('list')}
            className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors font-family-geist text-[11px] ${
              view === 'list'
                ? 'bg-(--color-secondary-container) text-(--color-on-secondary-fixed)'
                : 'text-(--color-secondary) hover:text-(--color-on-surface)'
            }`}
          >
            <Icon name="view_list" size={16} />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>

        {/* Sort */}
        <div className="relative flex items-center">
          <select
            value={`${sortField}:${sortDir}`}
            onChange={(e) => {
              const [f, d] = e.target.value.split(':') as [SortField, SortDir];
              onSortChange(f, d);
            }}
            className="appearance-none flex items-center gap-1.5 bg-(--color-surface-container-lowest) px-3 py-1.5 pr-7 rounded-lg shadow-sm text-(--color-on-surface) hover:bg-(--color-surface-container-low) transition-colors font-family-geist text-[12px] cursor-pointer focus:outline-none border border-(--color-surface-container-high)"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.field + ':asc'} value={`${o.field}:asc`}>{o.label} ↑</option>
            ))}
            {SORT_OPTIONS.map((o) => (
              <option key={o.field + ':desc'} value={`${o.field}:desc`}>{o.label} ↓</option>
            ))}
          </select>
          <Icon name="expand_more" size={14} className="absolute right-2 pointer-events-none text-(--color-outline)" />
        </div>

        {/* Filter text */}
        <div className="flex items-center bg-(--color-surface-container-low) rounded-lg px-(--spacing-space-sm) py-1 w-full sm:w-52">
          <Icon name="filter_alt" size={16} className="text-(--color-outline) mr-1.5" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => onFilterTextChange(e.target.value)}
            placeholder="Filter in this folder…"
            className="bg-transparent text-(--color-on-surface) placeholder:text-(--color-outline) font-(family-name:--font-family-inter) text-[12px] w-full focus:outline-none"
          />
          {filterText && (
            <button type="button" onClick={() => onFilterTextChange('')} className="text-(--color-outline) hover:text-(--color-on-surface)">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
