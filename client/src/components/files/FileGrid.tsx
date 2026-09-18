import { useState } from 'react';
import type { FileItem, ViewMode, FilterType, SortField, SortDir } from '../../types';
import { FileCard } from './FileCard';
import { FileRow } from './FileRow';
import { EmptyState } from './EmptyState';
import { VirtualFileList } from './VirtualFileList';
import { Icon } from '../ui/Icon';
import { isExternalFileDrag, isInternalDrag } from '../../utils/dnd';
import { ARCHIVE_EXTS, DOCUMENT_FILTER_EXTS, MEDIA_FILTER_EXTS } from '../../config/contentTypes';

import { VIRTUAL_THRESHOLD } from '../../config/app';

interface FileGridProps {
  items: FileItem[];
  view: ViewMode;
  filter: FilterType;
  sortField: SortField;
  sortDir: SortDir;
  onSortChange: (f: SortField, d: SortDir) => void;
  selected: Set<string>;
  onSelect: (path: string, multi: boolean) => void;
  onOpen: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  onCopy: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onInspect: (item: FileItem) => void;
  onUpload: () => void;
  onNewFolder: () => void;
  onDropMove: (srcPath: string, destFolderPath: string) => void;
  onDropUpload: (files: FileList) => void;
}

function applyFilter(items: FileItem[], filter: FilterType): FileItem[] {
  if (filter === 'all') return items;
  if (filter === 'folders') return items.filter((i) => i.type === 'directory');
  if (filter === 'media') {
    return items.filter((i) => (MEDIA_FILTER_EXTS as readonly string[]).includes((i.extension ?? '').replace('.', '').toLowerCase()));
  }
  if (filter === 'documents') {
    return items.filter((i) => (DOCUMENT_FILTER_EXTS as readonly string[]).includes((i.extension ?? '').replace('.', '').toLowerCase()));
  }
  if (filter === 'archives') {
    return items.filter((i) => (ARCHIVE_EXTS as readonly string[]).includes((i.extension ?? '').replace('.', '').toLowerCase()));
  }
  return items;
}

function applySort(items: FileItem[], field: SortField, dir: SortDir): FileItem[] {
  return [...items].sort((a, b) => {
    let cmp = 0;
    if (field === 'name') cmp = a.name.localeCompare(b.name);
    else if (field === 'size') cmp = a.size - b.size;
    else if (field === 'modified_at') cmp = new Date(a.modified_at).getTime() - new Date(b.modified_at).getTime();
    else if (field === 'type') cmp = a.type.localeCompare(b.type);
    return dir === 'asc' ? cmp : -cmp;
  });
}

function SortHeader({ label, field, sortField, sortDir, onSortChange }: {
  label: string; field: SortField; sortField: SortField; sortDir: SortDir;
  onSortChange: (f: SortField, d: SortDir) => void;
}) {
  const active = sortField === field;
  const toggle = () => onSortChange(field, active && sortDir === 'asc' ? 'desc' : 'asc');
  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-1 font-family-geist text-[11px] font-semibold tracking-wider uppercase transition-colors ${
        active ? 'text-(--color-primary)' : 'text-(--color-secondary) hover:text-(--color-on-surface)'
      }`}
    >
      {label}
      {active && (
        <Icon name={sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'} size={14} />
      )}
    </button>
  );
}

export function FileGrid({
  items, view, filter, sortField, sortDir, onSortChange,
  selected, onSelect, onOpen, onRename, onMove, onCopy, onDelete, onInspect,
  onUpload, onNewFolder, onDropMove, onDropUpload,
}: FileGridProps) {
  const [gridDragOver, setGridDragOver] = useState(false);

  const filtered = applyFilter(items, filter);
  const sorted = applySort(filtered, sortField, sortDir);
  const dirs = sorted.filter((i) => i.type === 'directory');
  const files = sorted.filter((i) => i.type === 'file');

  if (items.length === 0) {
    return (
      <div
        onDragOver={(e) => {
          // External OS files only — internal move-drags must not show upload UI
          if (!isExternalFileDrag(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setGridDragOver(true);
        }}
        onDragLeave={() => setGridDragOver(false)}
        onDrop={(e) => {
          // Always swallow the drop so the browser never navigates away,
          // but only treat genuine external files as an upload.
          e.preventDefault();
          setGridDragOver(false);
          if (isInternalDrag(e)) return;
          if (e.dataTransfer.files.length > 0) onDropUpload(e.dataTransfer.files);
        }}
        className={`transition-all rounded-2xl ${gridDragOver ? 'ring-2 ring-(--color-primary) bg-(--color-primary-fixed)/20' : ''}`}
      >
        <EmptyState onUpload={onUpload} onNewFolder={onNewFolder} />
      </div>
    );
  }

  const cardProps = (item: FileItem) => ({
    item,
    selected: selected.has(item.path),
    onSelect: (multi: boolean) => onSelect(item.path, multi),
    onOpen: () => onOpen(item),
    onRename: () => onRename(item),
    onMove: () => onMove(item),
    onCopy: () => onCopy(item),
    onDelete: () => onDelete(item),
    onInspect: () => onInspect(item),
    onDropMove,
  });

  const gridDropZone = {
    onDragOver: (e: React.DragEvent) => {
      // Only trigger for external files (from desktop), not internal drags.
      // (Internal drags carry text/plain only — except image thumbnails, which
      // the browser natively tags as Files; those are filtered by the marker.)
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setGridDragOver(true);
    },
    onDragLeave: () => setGridDragOver(false),
    onDrop: (e: React.DragEvent) => {
      // Always swallow the drop so the browser never navigates away,
      // but only treat genuine external files as an upload.
      e.preventDefault();
      setGridDragOver(false);
      if (isInternalDrag(e)) return;
      if (e.dataTransfer.files.length > 0) onDropUpload(e.dataTransfer.files);
    },
  };

  if (view === 'list') {
    // Use virtual list for large directories
    if (sorted.length > VIRTUAL_THRESHOLD) {
      return (
        <div
          className={`transition-all rounded-2xl ${gridDragOver ? 'ring-2 ring-(--color-primary) bg-(--color-primary-fixed)/10' : ''}`}
          {...gridDropZone}
        >
          <VirtualFileList
            items={sorted}
            sortField={sortField}
            sortDir={sortDir}
            onSortChange={onSortChange}
            selected={selected}
            onSelect={onSelect}
            onOpen={onOpen}
            onRename={onRename}
            onMove={onMove}
            onCopy={onCopy}
            onDelete={onDelete}
            onInspect={onInspect}
            onDropMove={onDropMove}
          />
        </div>
      );
    }

    return (
      <div
        className={`flex flex-col transition-all rounded-2xl ${gridDragOver ? 'ring-2 ring-(--color-primary) bg-(--color-primary-fixed)/10' : ''}`}
        {...gridDropZone}
      >
        <div className="flex items-center gap-3 px-3 py-2 border-b border-(--color-surface-container-high) mb-1">
          <div className="w-8 shrink-0" />
          <div className="flex-1">
            <SortHeader label="Name" field="name" sortField={sortField} sortDir={sortDir} onSortChange={onSortChange} />
          </div>
          <div className="w-20 text-right">
            <SortHeader label="Size" field="size" sortField={sortField} sortDir={sortDir} onSortChange={onSortChange} />
          </div>
          <div className="w-24 text-right hidden sm:block">
            <SortHeader label="Modified" field="modified_at" sortField={sortField} sortDir={sortDir} onSortChange={onSortChange} />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          {sorted.map((item) => (
            <FileRow key={item.path} {...cardProps(item)} />
          ))}
        </div>
        {gridDragOver && (
          <div className="flex items-center justify-center gap-2 py-4 text-(--color-primary) font-family-geist text-[12px]">
            <Icon name="upload_file" size={20} />
            Drop to upload here
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-(--spacing-space-xl) transition-all rounded-2xl ${gridDragOver ? 'ring-2 ring-(--color-primary) bg-(--color-primary-fixed)/10 p-2' : ''}`}
      {...gridDropZone}
    >
      {gridDragOver && (
        <div className="flex items-center justify-center gap-2 py-6 text-(--color-primary) font-family-geist text-[13px] font-medium">
          <Icon name="upload_file" size={24} />
          Drop files to upload here
        </div>
      )}

      {dirs.length > 0 && (
        <section>
          <div className="flex items-center gap-(--spacing-space-sm) mb-(--spacing-space-md)">
            <h2 className="font-family-geist text-[18px] font-medium leading-6 text-(--color-on-surface)">
              Directories
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-(--color-surface-container) text-(--color-on-surface-variant) font-family-geist text-[11px] font-medium">
              {dirs.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-(--spacing-space-md)">
            {dirs.map((item) => <FileCard key={item.path} {...cardProps(item)} />)}
          </div>
        </section>
      )}

      {files.length > 0 && (
        <section>
          <div className="flex items-center gap-(--spacing-space-sm) mb-(--spacing-space-md)">
            <h2 className="font-family-geist text-[18px] font-medium leading-6 text-(--color-on-surface)">
              Files
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-(--color-surface-container) text-(--color-on-surface-variant) font-family-geist text-[11px] font-medium">
              {files.length} items
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-(--spacing-space-md)">
            {files.map((item) => <FileCard key={item.path} {...cardProps(item)} />)}
          </div>
        </section>
      )}
    </div>
  );
}
