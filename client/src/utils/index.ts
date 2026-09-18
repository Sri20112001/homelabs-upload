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

export function getFileIcon(name: string, mimeType?: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const mime = mimeType ?? '';

  if (mime.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg','bmp','ico'].includes(ext))
    return 'image';
  if (mime.startsWith('video/') || ['mp4','mkv','avi','mov','webm','flv'].includes(ext))
    return 'movie';
  if (mime.startsWith('audio/') || ['mp3','flac','wav','ogg','aac'].includes(ext))
    return 'audio_file';
  if (ext === 'pdf') return 'picture_as_pdf';
  if (['zip','tar','gz','bz2','xz','zst','7z','rar'].includes(ext)) return 'folder_zip';
  if (['js','ts','jsx','tsx','py','go','rs','c','cpp','java','rb','php','sh','bash'].includes(ext))
    return 'code';
  if (['yml','yaml','toml','json','xml','env','conf','cfg','ini'].includes(ext))
    return 'data_object';
  if (['md','txt','rst','log'].includes(ext)) return 'description';
  if (['doc','docx','odt'].includes(ext)) return 'article';
  if (['xls','xlsx','csv'].includes(ext)) return 'table_chart';
  if (['ppt','pptx'].includes(ext)) return 'slideshow';
  if (['iso','img','bin'].includes(ext)) return 'disc_full';
  return 'draft';
}

export function getFileColor(name: string, mimeType?: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const mime = mimeType ?? '';

  if (mime.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg'].includes(ext))
    return 'text-primary';
  if (mime.startsWith('video/') || ['mp4','mkv','avi','mov'].includes(ext))
    return 'text-secondary';
  if (ext === 'pdf') return 'text-error';
  if (['zip','tar','gz','bz2','xz','zst','7z','rar'].includes(ext)) return 'text-tertiary';
  if (['js','ts','jsx','tsx','py','go','rs','sh'].includes(ext)) return 'text-primary';
  if (['yml','yaml','json','toml'].includes(ext)) return 'text-secondary';
  return 'text-on-surface-variant';
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
