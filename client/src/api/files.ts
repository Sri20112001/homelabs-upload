import { client } from './client';
import type { ListResponse, FileItem, StorageInfo, SearchResponse, TrashItem, FolderSizeResult } from '../types';

export const filesApi = {
  list(path: string, signal?: AbortSignal): Promise<ListResponse> {
    return client.get(`/files?path=${encodeURIComponent(path)}`, signal);
  },

  metadata(path: string): Promise<FileItem> {
    return client.get(`/files/metadata?path=${encodeURIComponent(path)}`);
  },

  downloadUrl(path: string): string {
    return `/api/v1/files/download?path=${encodeURIComponent(path)}`;
  },

  zipDownload(paths: string[], name = 'download.zip'): void {
    // POST to zip endpoint, receive blob, trigger download
    fetch('/api/v1/files/zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths, name }),
    }).then(async (res) => {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    });
  },

  folderSize(path: string): Promise<FolderSizeResult> {
    return client.get(`/files/size?path=${encodeURIComponent(path)}`);
  },

  createDirectory(path: string): Promise<{ message: string; path: string }> {
    return client.post('/directories', { path });
  },

  rename(path: string, new_name: string): Promise<{ message: string }> {
    return client.patch('/files', { path, new_name });
  },

  bulkRename(renames: { path: string; new_name: string }[]): Promise<{ message: string }> {
    return client.post('/files/bulk-rename', { renames });
  },

  move(source: string, destination: string): Promise<{ message: string }> {
    return client.post('/files/move', { source, destination });
  },

  copy(source: string, destination: string): Promise<{ message: string }> {
    return client.post('/files/copy', { source, destination });
  },

  delete(path: string, recursive = false): Promise<{ message: string }> {
    return client.delete('/files', { path, recursive });
  },

  search(q: string, path = '/'): Promise<SearchResponse> {
    return client.get(`/search?q=${encodeURIComponent(q)}&path=${encodeURIComponent(path)}`);
  },

  storage(): Promise<StorageInfo> {
    return client.get('/storage');
  },

  // Trash
  trashList(): Promise<{ items: TrashItem[] }> {
    return client.get('/trash');
  },
  trashMove(path: string): Promise<{ message: string }> {
    return client.post('/trash', { path });
  },
  trashRestore(id: string): Promise<{ message: string }> {
    return client.post('/trash/restore', { id });
  },
  trashPurge(): Promise<{ message: string }> {
    return client.delete('/trash', {});
  },

  // Chunked upload
  uploadChunk(uploadId: string, index: number, chunk: Blob): Promise<{ message: string }> {
    return fetch(
      `/api/v1/files/chunk?upload_id=${encodeURIComponent(uploadId)}&index=${index}`,
      { method: 'POST', body: chunk },
    ).then(async (res) => {
      if (!res.ok) throw new Error(`Chunk ${index} failed`);
      return res.json();
    });
  },

  finalizeChunk(uploadId: string, destDir: string, filename: string): Promise<{ message: string; path: string }> {
    return client.post('/files/chunk/finalize', { upload_id: uploadId, dest_dir: destDir, filename });
  },

  // SSE watcher — returns EventSource
  watchDirectory(path: string): EventSource {
    return new EventSource(`/api/v1/files/watch?path=${encodeURIComponent(path)}`);
  },

  // Runtime config
  getConfig(): Promise<{ storage_root: string; max_upload_size: number; cors_origin: string }> {
    return client.get('/config');
  },
  patchConfig(patch: { storage_root?: string; max_upload_size?: number; cors_origin?: string }): Promise<{ message: string; storage_root: string; max_upload_size: number; cors_origin: string }> {
    return client.patch('/config', patch);
  },
};
