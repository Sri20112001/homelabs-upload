import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDirectory } from '../hooks/useDirectory';
import { useDirectoryWatcher } from '../hooks/useDirectoryWatcher';
import { Breadcrumbs } from '../components/files/Breadcrumbs';
import { FileGrid } from '../components/files/FileGrid';
import { Inspector } from '../components/files/Inspector';
import { SelectionBar } from '../components/files/SelectionBar';
import { Toolbar } from '../components/ui/Toolbar';
import { SkeletonGrid } from '../components/ui/SkeletonGrid';
import { NewFolderModal } from '../components/modals/NewFolderModal';
import { RenameModal } from '../components/modals/RenameModal';
import { DeleteModal } from '../components/modals/DeleteModal';
import { MoveModal } from '../components/modals/MoveModal';
import { CopyModal } from '../components/modals/CopyModal';
import { BulkRenameModal } from '../components/modals/BulkRenameModal';
import { TrashModal } from '../components/modals/TrashModal';
import { TextEditorModal } from '../components/modals/TextEditorModal';
import { DirectoryTree } from '../components/files/DirectoryTree';
import { useToast } from '../components/ui/Toast';
import { filesApi } from '../api/files';
import { joinPath } from '../utils';
import type { FileItem, ViewMode, SortField, SortDir, FilterType, SortPrefs } from '../types';
import { Icon } from '../components/ui/Icon';
import { PREFS_KEY, TREE_KEY } from '../config/app';


function loadTreeOpen(): boolean {
  try {
    const raw = localStorage.getItem(TREE_KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

function loadPrefs(): SortPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as SortPrefs;
  } catch {
    /* ignore fallback */
  }
  return { field: 'name', dir: 'asc', view: 'grid' };
}

function savePrefs(p: SortPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore storage access error */
  }
}

interface FilesPageProps {
  path: string;
  onPathChange: (p: string) => void;
  onUpload: () => void;
  onEnqueueFiles?: (files: FileList, destPath: string) => void;
}

type ModalState =
  | { type: 'none' }
  | { type: 'newFolder' }
  | { type: 'rename'; item: FileItem }
  | { type: 'bulkRename'; items: FileItem[] }
  | { type: 'delete'; items: FileItem[] }
  | { type: 'move'; items: FileItem[] }
  | { type: 'copy'; items: FileItem[] }
  | { type: 'trash' }
  | { type: 'edit'; item: FileItem };

export function FilesPage({ path, onPathChange, onUpload, onEnqueueFiles }: FilesPageProps) {
  const [prefs] = useState<SortPrefs>(() => loadPrefs());
  const [view, setView] = useState<ViewMode>(prefs.view);
  const [sortField, setSortField] = useState<SortField>(prefs.field);
  const [sortDir, setSortDir] = useState<SortDir>(prefs.dir);
  const [filter, setFilter] = useState<FilterType>('all');
  const [filterText, setFilterText] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inspected, setInspected] = useState<FileItem | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [showTree, setShowTree] = useState<boolean>(() => loadTreeOpen());
  const { toast } = useToast();

  const { data, loading, error, reload } = useDirectory(path);

  // Sync sort/view changes to local storage
  useEffect(() => {
    savePrefs({ field: sortField, dir: sortDir, view });
  }, [sortField, sortDir, view]);

  // SSE Directory Watcher: auto-reload when path contents mutate
  useDirectoryWatcher(path, reload);

  // Clear selections when navigating between directories
  useEffect(() => {
    setSelected(new Set());
    setInspected(null);
  }, [path]);

  // Keyboard navigation & modal dismissals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modal.type !== 'none') {
          setModal({ type: 'none' });
        } else if (inspected) {
          setInspected(null);
        } else if (selected.size > 0) {
          setSelected(new Set());
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal.type, inspected, selected.size]);

  const handleSelect = useCallback((itemPath: string, multi: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (multi) {
        if (next.has(itemPath)) next.delete(itemPath);
        else next.add(itemPath);
      } else {
        if (next.has(itemPath) && next.size === 1) next.clear();
        else {
          next.clear();
          next.add(itemPath);
        }
      }
      return next;
    });
  }, []);

  const handleOpen = useCallback(
    (item: FileItem) => {
      if (item.type === 'directory') onPathChange(item.path);
      else setInspected(item);
    },
    [onPathChange]
  );

  const handleRename = useCallback((item: FileItem) => setModal({ type: 'rename', item }), []);
  const handleMove = useCallback((item: FileItem) => setModal({ type: 'move', items: [item] }), []);
  const handleCopy = useCallback((item: FileItem) => setModal({ type: 'copy', items: [item] }), []);
  const handleDelete = useCallback((item: FileItem) => setModal({ type: 'delete', items: [item] }), []);
  const handleInspect = useCallback((item: FileItem) => setInspected(item), []);

  const handleDropMove = useCallback(
    async (srcPath: string, destFolderPath: string) => {
      const srcName = srcPath.split('/').pop() ?? '';
      const dest = joinPath(destFolderPath, srcName);
      try {
        await filesApi.move(srcPath, dest);
        reload();
        toast(`Moved to ${destFolderPath}`, 'success');
      } catch (err: unknown) {
        toast((err as Error).message ?? 'Move failed', 'error');
      }
    },
    [reload, toast]
  );

  const handleDropUpload = useCallback(
    (files: FileList) => {
      if (onEnqueueFiles) onEnqueueFiles(files, path);
    },
    [onEnqueueFiles, path]
  );

  const toggleTree = useCallback(() => {
    setShowTree((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TREE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const selectedItems = useMemo(
    () => (data?.items ?? []).filter((i) => selected.has(i.path)),
    [data, selected]
  );

  const visibleItems = useMemo(() => {
    if (!filterText) return data?.items ?? [];
    const lower = filterText.toLowerCase();
    return (data?.items ?? []).filter((i) => i.name.toLowerCase().includes(lower));
  }, [data, filterText]);

  const closeModal = useCallback(() => setModal({ type: 'none' }), []);

  const afterMutation = useCallback(
    (msg: string) => {
      reload();
      setSelected(new Set());
      setInspected(null);
      closeModal();
      toast(msg, 'success');
    },
    [reload, toast, closeModal]
  );

  return (
    <div className="flex flex-col w-full pb-16">
      <SelectionBar
        selected={selectedItems}
        onClear={() => setSelected(new Set())}
        onRename={() => selectedItems.length === 1 && setModal({ type: 'rename', item: selectedItems[0] })}
        onBulkRename={() => setModal({ type: 'bulkRename', items: selectedItems })}
        onMove={() => setModal({ type: 'move', items: selectedItems })}
        onCopy={() => setModal({ type: 'copy', items: selectedItems })}
        onDelete={() => setModal({ type: 'delete', items: selectedItems })}
      />

      <section className="w-full flex flex-col gap-(--spacing-space-lg) mb-(--spacing-space-lg)">
        <div className="flex flex-wrap items-center justify-between gap-(--spacing-space-md)">
          <Breadcrumbs
            path={path}
            onNavigate={onPathChange}
            onDropMove={handleDropMove}
            itemCount={data?.items.length}
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTree}
              aria-pressed={showTree}
              title={showTree ? 'Hide folder tree' : 'Show folder tree'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-family-geist text-[12px] font-medium ${
                showTree
                  ? 'bg-(--color-secondary-container) text-(--color-on-secondary-fixed)'
                  : 'text-(--color-secondary) hover:bg-(--color-surface-container-low)'
              }`}
            >
              <Icon name="view_list" size={16} />
              <span className="hidden sm:inline">Tree</span>
            </button>
            <button
              type="button"
              onClick={() => setModal({ type: 'trash' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-(--color-secondary) hover:bg-(--color-surface-container-low) transition-colors font-family-geist text-[12px] font-medium"
            >
              <Icon name="delete_sweep" size={16} />
              Trash
            </button>
          </div>
        </div>

        <Toolbar
          view={view}
          onViewChange={setView}
          sortField={sortField}
          sortDir={sortDir}
          onSortChange={(f, d) => {
            setSortField(f);
            setSortDir(d);
          }}
          filter={filter}
          onFilterChange={setFilter}
          filterText={filterText}
          onFilterTextChange={setFilterText}
          onNewFolder={() => setModal({ type: 'newFolder' })}
          onUpload={onUpload}
        />
      </section>

      <div className="flex flex-1 flex-col lg:flex-row gap-6 items-start">
        {showTree && (
          <aside className="w-full h-full lg:w-64 shrink-0 rounded-2xl bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) shadow-xs p-3 lg:sticky lg:top-20 max-h-[calc(100vh-140px)] overflow-y-auto">
            <h2 className="font-family-geist text-[11px] font-semibold text-(--color-secondary) uppercase tracking-wider px-2 pt-1 pb-2">
              Folders
            </h2>
            <DirectoryTree selected={path} onSelect={onPathChange} />
          </aside>
        )}

        <div className="flex-1 min-w-0 w-full">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-error-container/30 border border-error-container mb-6">
              <Icon name="error" size={20} className="text-error" />
              <p className="font-family-geist text-[13px] text-(--color-on-surface)">
                {error}
              </p>
              <button
                type="button"
                onClick={reload}
                className="ml-auto font-family-geist text-[12px] font-medium text-(--color-primary) hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className={`grid gap-6 ${inspected ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
            <div className={inspected ? 'lg:col-span-8' : 'w-full'}>
              {loading ? (
                <SkeletonGrid />
              ) : (
                <FileGrid
                  items={visibleItems}
                  view={view}
                  filter={filter}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSortChange={(f, d) => {
                    setSortField(f);
                    setSortDir(d);
                  }}
                  selected={selected}
                  onSelect={handleSelect}
                  onOpen={handleOpen}
                  onRename={handleRename}
                  onMove={handleMove}
                  onCopy={handleCopy}
                  onDelete={handleDelete}
                  onInspect={handleInspect}
                  onUpload={onUpload}
                  onNewFolder={() => setModal({ type: 'newFolder' })}
                  onDropMove={handleDropMove}
                  onDropUpload={handleDropUpload}
                />
              )}
            </div>

            {inspected && (
              <div className="lg:col-span-4 w-full">
                <Inspector
                  item={inspected}
                  onClose={() => setInspected(null)}
                  onRename={() => setModal({ type: 'rename', item: inspected })}
                  onMove={() => setModal({ type: 'move', items: [inspected] })}
                  onCopy={() => setModal({ type: 'copy', items: [inspected] })}
                  onDelete={() => setModal({ type: 'delete', items: [inspected] })}
                  onEdit={() => setModal({ type: 'edit', item: inspected })}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Controller */}
      {modal.type === 'newFolder' && (
        <NewFolderModal
          currentPath={path}
          onClose={closeModal}
          onCreated={() => afterMutation('Folder created')}
        />
      )}
      {modal.type === 'rename' && (
        <RenameModal
          path={modal.item.path}
          currentName={modal.item.name}
          onClose={closeModal}
          onRenamed={() => afterMutation('Renamed successfully')}
        />
      )}
      {modal.type === 'bulkRename' && (
        <BulkRenameModal
          items={modal.items}
          onClose={closeModal}
          onRenamed={() => afterMutation('Bulk rename complete')}
        />
      )}
      {modal.type === 'delete' && (
        <DeleteModal
          paths={modal.items.map((i) => ({
            path: i.path,
            name: i.name,
            isDir: i.type === 'directory',
          }))}
          onClose={closeModal}
          onDeleted={() => afterMutation('Deleted successfully')}
        />
      )}
      {modal.type === 'move' && (
        <MoveModal
          sources={modal.items.map((i) => ({ path: i.path, name: i.name }))}
          onClose={closeModal}
          onMoved={() => afterMutation('Moved successfully')}
        />
      )}
      {modal.type === 'copy' && (
        <CopyModal
          sources={modal.items.map((i) => ({ path: i.path, name: i.name }))}
          onClose={closeModal}
          onCopied={() => afterMutation('Copied successfully')}
        />
      )}
      {modal.type === 'trash' && (
        <TrashModal
          onClose={closeModal}
          onRestored={() => afterMutation('Restored from trash')}
        />
      )}
      {modal.type === 'edit' && (
        <TextEditorModal
          path={modal.item.path}
          name={modal.item.name}
          onClose={closeModal}
          onSaved={() => afterMutation('File saved')}
        />
      )}
    </div>
  );
}