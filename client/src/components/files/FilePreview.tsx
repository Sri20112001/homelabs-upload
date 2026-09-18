import { useState, useEffect } from 'react';
import { filesApi } from '../../api/files';
import type { FileItem } from '../../types';
import { getFileIcon } from '../../utils';
import { Icon } from '../ui/Icon';

interface FilePreviewProps {
  item: FileItem;
}

type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'none';

function getPreviewKind(item: FileItem): PreviewKind {
  const ext = (item.extension ?? '').replace('.', '').toLowerCase();
  const mime = item.mime_type ?? '';

  if (mime.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext))
    return 'image';
  if (mime.startsWith('video/') || ['mp4','webm','ogg','mov'].includes(ext))
    return 'video';
  if (mime.startsWith('audio/') || ['mp3','flac','wav','ogg','aac','m4a'].includes(ext))
    return 'audio';
  if (ext === 'pdf' || mime === 'application/pdf')
    return 'pdf';
  if (
    mime.startsWith('text/') ||
    ['txt','md','log','sh','bash','py','js','ts','jsx','tsx','go','rs','c','cpp',
     'java','rb','php','yml','yaml','toml','json','xml','env','conf','cfg','ini',
     'css','html','sql','csv'].includes(ext)
  )
    return 'text';
  return 'none';
}

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.text();
      })
      .then((t) => setText(t.slice(0, 8000))) // cap at 8 KB for preview
      .catch(() => setError(true));
  }, [url]);

  if (error) return (
    <div className="flex items-center justify-center h-40 text-(--color-secondary) font-family-geist text-[12px]">
      Could not load preview
    </div>
  );
  if (text === null) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-5 h-5 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <pre className="text-[11px] font-family-geist text-(--color-on-surface-variant) overflow-auto max-h-56 whitespace-pre-wrap break-all leading-relaxed p-1">
      {text}
    </pre>
  );
}

export function FilePreview({ item }: FilePreviewProps) {
  const kind = getPreviewKind(item);
  const url = filesApi.downloadUrl(item.path);
  const icon = getFileIcon(item.name, item.mime_type);

  if (kind === 'image') {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-(--color-surface-container-low) border border-(--color-surface-container) flex items-center justify-center min-h-40">
        <img
          src={url}
          alt={item.name}
          className="w-full object-contain max-h-56"
          loading="lazy"
          draggable={false}
        />
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={url}
          controls
          className="w-full max-h-56 object-contain"
          preload="metadata"
        />
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="w-full rounded-xl bg-(--color-surface-container-low) border border-(--color-surface-container) p-4 flex flex-col items-center gap-3">
        <Icon name="audio_file" size={48} className="text-(--color-primary)" />
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio src={url} controls className="w-full" preload="metadata" />
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div className="w-full rounded-xl overflow-hidden border border-(--color-surface-container) bg-(--color-surface-container-low)">
        <iframe
          src={`${url}#toolbar=0&navpanes=0`}
          title={item.name}
          className="w-full h-56 border-0"
        />
      </div>
    );
  }

  if (kind === 'text') {
    return (
      <div className="w-full rounded-xl bg-(--color-surface-container-low) border border-(--color-surface-container) p-3 overflow-hidden">
        <TextPreview url={url} />
      </div>
    );
  }

  // Fallback: icon only
  return (
    <div className="w-full rounded-xl bg-(--color-surface-container-low) border border-(--color-surface-container) flex items-center justify-center min-h-40">
      <Icon name={icon} size={64} className="text-(--color-on-surface-variant) py-8" />
    </div>
  );
}
