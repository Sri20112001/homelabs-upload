export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

import {
  FILE_COLOR_RULES,
  FILE_ICON_RULES,
  fileExt,
  type FileTypeRule,
} from '../config/contentTypes';

function matchRule(rules: FileTypeRule[], ext: string, mime: string): string | null {
  for (const rule of rules) {
    if (rule.mimePrefix && mime.startsWith(rule.mimePrefix)) return rule.value;
    if ((rule.exts as readonly string[]).includes(ext)) return rule.value;
  }
  return null;
}

export function getFileIcon(name: string, mimeType?: string): string {
  return (
    matchRule(FILE_ICON_RULES, fileExt(name), mimeType ?? '') ?? 'draft'
  );
}

export function getFileColor(name: string, mimeType?: string): string {
  return (
    matchRule(FILE_COLOR_RULES, fileExt(name), mimeType ?? '') ??
    'text-on-surface-variant'
  );
}

export function joinPath(...parts: string[]): string {
  const joined = parts.join('/').replace(/\/+/g, '/');
  return joined.startsWith('/') ? joined : '/' + joined;
}

export function parentPath(path: string): string {
  if (path === '/') return '/';
  const parts = path.replace(/\/$/, '').split('/');
  parts.pop();
  return parts.join('/') || '/';
}

export function breadcrumbs(path: string): { label: string; path: string }[] {
  const crumbs: { label: string; path: string }[] = [{ label: 'Home', path: '/' }];
  if (path === '/') return crumbs;
  const parts = path.replace(/^\//, '').split('/').filter(Boolean);
  let acc = '';
  for (const part of parts) {
    acc += '/' + part;
    crumbs.push({ label: part, path: acc });
  }
  return crumbs;
}
