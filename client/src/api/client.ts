import type { ApiErrorResponse } from '../types';

const BASE = '/api/v1';

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let code = 'INTERNAL_ERROR';
    let message = `HTTP ${res.status}`;
    try {
      const body: ApiErrorResponse = await res.json();
      code = body.error.code;
      message = body.error.message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(code, message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const client = {
  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return fetch(`${BASE}${path}`, { signal }).then(handleResponse<T>);
  },

  post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    return fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    }).then(handleResponse<T>);
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handleResponse<T>);
  },

  delete<T>(path: string, body: unknown): Promise<T> {
    return fetch(`${BASE}${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handleResponse<T>);
  },

  uploadFile(
    destPath: string,
    file: File,
    onProgress: (pct: number, speed: number) => void,
    signal: AbortSignal,
  ): Promise<{ message: string; path: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let lastLoaded = 0;
      let lastTime = Date.now();

      xhr.upload.addEventListener('progress', (e) => {
        if (!e.lengthComputable) return;
        const now = Date.now();
        const dt = (now - lastTime) / 1000;
        const speed = dt > 0 ? (e.loaded - lastLoaded) / dt : 0;
        lastLoaded = e.loaded;
        lastTime = now;
        onProgress(Math.round((e.loaded / e.total) * 100), speed);
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            const body: ApiErrorResponse = JSON.parse(xhr.responseText);
            reject(new ApiError(body.error.code, body.error.message, xhr.status));
          } catch {
            reject(new ApiError('INTERNAL_ERROR', `HTTP ${xhr.status}`, xhr.status));
          }
        }
      });

      xhr.addEventListener('error', () =>
        reject(new ApiError('NETWORK_ERROR', 'Network error', 0)),
      );

      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new ApiError('CANCELLED', 'Upload cancelled', 0));
      });

      const form = new FormData();
      form.append('file', file);
      xhr.open('POST', `/api/v1/files/upload?path=${encodeURIComponent(destPath)}`);
      xhr.send(form);
    });
  },

  // Chunked upload: splits file into CHUNK_SIZE pieces, sends sequentially with progress
  async uploadFileChunked(
    uploadId: string,
    destPath: string,
    file: File,
    onProgress: (pct: number, speed: number) => void,
    signal: AbortSignal,
  ): Promise<{ message: string; path: string }> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploaded = 0;
    let lastTime = Date.now();

    for (let i = 0; i < totalChunks; i++) {
      if (signal.aborted) throw new ApiError('CANCELLED', 'Upload cancelled', 0);
      const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const res = await fetch(
        `/api/v1/files/chunk?upload_id=${encodeURIComponent(uploadId)}&index=${i}`,
        { method: 'POST', body: chunk, signal },
      );
      if (!res.ok) throw new ApiError('INTERNAL_ERROR', `Chunk ${i} failed`, res.status);
      uploaded += chunk.size;
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      const speed = dt > 0 ? chunk.size / dt : 0;
      lastTime = now;
      onProgress(Math.round((uploaded / file.size) * 100), speed);
    }

    const finalRes = await fetch('/api/v1/files/chunk/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_id: uploadId, dest_dir: destPath, filename: file.name }),
      signal,
    });
    if (!finalRes.ok) {
      const body: ApiErrorResponse = await finalRes.json().catch(() => ({ error: { code: 'INTERNAL_ERROR', message: 'Finalize failed' } }));
      throw new ApiError(body.error.code, body.error.message, finalRes.status);
    }
    return finalRes.json();
  },
};
