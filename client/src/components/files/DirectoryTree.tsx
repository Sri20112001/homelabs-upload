import { useState, useEffect, useCallback } from 'react';
import { filesApi } from '../../api/files';
import { Icon } from '../ui/Icon';

interface DirectoryTreeProps {
  /** Currently selected destination path. */
  selected: string;
  onSelect: (path: string) => void;
  /** Paths that cannot be selected (e.g. items being moved). */
  exclude?: string[];
}

function ancestorsOf(path: string): string[] {
  if (path === '/') return ['/'];
  const parts = path.replace(/\/$/, '').split('/');
  const out = ['/'];
  let acc = '';
  for (const part of parts) {
    if (!part) continue;
    acc += '/' + part;
    out.push(acc);
  }
  return out;
}

function isExcluded(path: string, exclude: string[]): boolean {
  return exclude.some((x) => path === x || path.startsWith(x.endsWith('/') ? x : x + '/'));
}

function TreeNode({ path, name, depth, selected, onSelect, exclude, openSet, toggle }: {
  path: string;
  name: string;
  depth: number;
  selected: string;
  onSelect: (path: string) => void;
  exclude: string[];
  openSet: Set<string>;
  toggle: (path: string) => void;
}) {
  const [children, setChildren] = useState<{ path: string; name: string }[] | null>(null);
  const open = openSet.has(path);
  const isSelected = selected === path;
  const disabled = isExcluded(path, exclude);

  useEffect(() => {
    if (!open || children !== null) return;
    let cancelled = false;
    filesApi.list(path).then((res) => {
      if (cancelled) return;
      setChildren(
        res.items
          .filter((i) => i.type === 'directory')
          .map((d) => ({ path: d.path, name: d.name })),
      );
    }).catch(() => {
      if (!cancelled) setChildren([]);
    });
    return () => { cancelled = true; };
  }, [open, path, children]);

  return (
    <li className="relative mt-1">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => { if (!disabled) onSelect(path); }}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); onSelect(path); } }}
        className={`flex items-center gap-2 h-7 px-2 rounded cursor-pointer select-none font-family-geist text-[13px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) ${
          isSelected
            ? 'bg-(--color-secondary-container) text-(--color-on-secondary-fixed) font-medium'
            : disabled
              ? 'text-(--color-outline) opacity-60 cursor-not-allowed'
              : 'text-(--color-on-surface) hover:bg-(--color-surface-container-low)'
        }`}
      >
        <button
          type="button"
          aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
          onClick={(e) => { e.stopPropagation(); toggle(path); }}
          className="w-5 h-5 shrink-0 rounded flex items-center justify-center text-(--color-secondary) hover:text-(--color-on-surface) hover:bg-(--color-surface-container) transition-all"
        >
          <span className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
            <Icon name="chevron_right" size={15} />
          </span>
        </button>
        <Icon
          name={open ? 'folder_open' : 'folder'}
          size={16}
          className={isSelected ? 'text-(--color-on-secondary-fixed)' : 'text-(--color-primary)'}
        />
        <span className="truncate">{name}</span>
      </div>
      {open && (
        <ul className="ml-[13px] pl-[11px] border-l border-(--color-surface-container-high)">
          {children === null && (
            <li className="flex items-center gap-2 h-7 px-2">
              <span className="w-3.5 h-3.5 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin" />
            </li>
          )}
          {children !== null && children.length === 0 && (
            <li className="font-family-geist text-[11px] text-(--color-secondary) px-2 py-1.5">
              Empty
            </li>
          )}
          {children?.map((c) => (
            <TreeNode
              key={c.path}
              path={c.path}
              name={c.name}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
              exclude={exclude}
              openSet={openSet}
              toggle={toggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function DirectoryTree({ selected, onSelect, exclude = [] }: DirectoryTreeProps) {
  const [openSet, setOpenSet] = useState<Set<string>>(() => new Set(ancestorsOf(selected)));

  const toggle = useCallback((path: string) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // Keep ancestors of a newly selected path expanded.
  useEffect(() => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      for (const a of ancestorsOf(selected)) next.add(a);
      return next;
    });
  }, [selected]);

  return (
    <ul className="list-none p-0 m-0">
      <TreeNode
        path="/"
        name="Home"
        depth={0}
        selected={selected}
        onSelect={onSelect}
        exclude={exclude}
        openSet={openSet}
        toggle={toggle}
      />
    </ul>
  );
}
