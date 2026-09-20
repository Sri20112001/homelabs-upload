import type { ApiErrorResponse } from '../types';
import { API_BASE_URL, CHUNK_SIZE } from '../config/app';
import { useAuthStore } from '../stores/authStore';

const BASE = API_BASE_URL;

// Auth rides on the HttpOnly nv_session cookie set at login.
// credentials:'include' on every request so the browser sends it
// (same-origin, and cross-origin when CORS allows credentials).
const CRED: RequestCredentials = 'include';

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Human wording per HTTP status, used only when the server did NOT supply
// its own specific message (unparseable body, proxy/gateway HTML, …).
// Server-sent messages (e.g. "file already exists") always win.
const FRIENDLY_BY_STATUS: Record<number, string> = {
  400: 'That request was invalid. Check the values and try again.',
  401: 'Your session expired. Please log in again.',
  403: 'You do not have permission to do that.',
  404: 'Not found. It may have been moved, renamed or deleted.',
  409: 'That name is already taken. Pick a different one.',
  413: 'Too large. Try a smaller file or ask an admin to raise the limit.',
  429: 'Too many requests. Wait a moment and try again.',
  500: 'Something went wrong on the server. Please try again.',
  502: 'The server is not responding. Try again in a moment.',
  503: 'The server is temporarily unavailable. Try again in a moment.',
};

function fallbackForStatus(status: number): string {
  if (status >= 500) return 'Something went wrong on the server. Please try again.';
  if (status >= 400) return 'That did not work. Check the values and try again.';
  return 'Something went wrong. Please try again.';
}

/**
 * Resolve the message a user should see. Specific server messages pass
 * through untouched; raw "HTTP 500"-style fallbacks and connection failures
 * become plain-language sentences.
 */
export function friendlyError(status: number, code: string, message: string): string {
  if (message && !/^HTTP \d+/.test(message)) return message;
  if (code === 'CANCELLED') return 'Cancelled.';
  if (!status) return 'Cannot reach the server. Check that the backend is running and try again.';
  return FRIENDLY_BY_STATUS[status] ?? fallbackForStatus(status);
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
    if (res.status === 401 && code === 'UNAUTHORIZED') {
      // Session expired / revoked / logged out elsewhere. The profile is
      // persisted in zustand, so it MUST be cleared here — otherwise the
      // stale user would bounce straight back past every auth guard.
      useAuthStore.getState().clearSession();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        const base = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');
        window.location.assign(`${base}/login`);
      }
    }
    throw new ApiError(code, friendlyError(res.status, code, message), res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Single choke point for fetch(): network-level failures (backend down,
// CORS blocked, offline) become ApiErrors with plain-language messages
// instead of raw TypeErrors like "Failed to fetch".
async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError('NETWORK_ERROR', friendlyError(0, 'NETWORK_ERROR', ''), 0);
  }
  return handleResponse<T>(res);
}

export const client = {
  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return request<T>(path, { credentials: CRED, signal });
  },

  post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      credentials: CRED,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      credentials: CRED,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'DELETE',
      credentials: CRED,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
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
          let code = 'INTERNAL_ERROR';
          let message = `HTTP ${xhr.status}`;
          try {
            const body = JSON.parse(xhr.responseText) as ApiErrorResponse;
            code = body.error.code;
            message = body.error.message;
          } catch {
            // non-JSON error body (proxy/gateway HTML) — mapped below
          }
          reject(new ApiError(code, friendlyError(xhr.status, code, message), xhr.status));
        }
      });

      xhr.addEventListener('error', () =>
        reject(new ApiError('NETWORK_ERROR', friendlyError(0, 'NETWORK_ERROR', ''), 0)),
      );

      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new ApiError('CANCELLED', 'Upload cancelled', 0));
      });

      const form = new FormData();
      form.append('file', file);
      xhr.open('POST', `${BASE}/files/upload?path=${encodeURIComponent(destPath)}`);
      xhr.withCredentials = true;
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
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploaded = 0;
    let lastTime = Date.now();

    for (let i = 0; i < totalChunks; i++) {
      if (signal.aborted) throw new ApiError('CANCELLED', 'Upload cancelled', 0);
      const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const res = await fetch(
        `${BASE}/files/chunk?upload_id=${encodeURIComponent(uploadId)}&index=${i}`,
        { method: 'POST', credentials: CRED, body: chunk, signal },
      );
      if (!res.ok) throw new ApiError('INTERNAL_ERROR', friendlyError(res.status, 'INTERNAL_ERROR', ''), res.status);
      uploaded += chunk.size;
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      const speed = dt > 0 ? chunk.size / dt : 0;
      lastTime = now;
      onProgress(Math.round((uploaded / file.size) * 100), speed);
    }

    const finalRes = await fetch(`${BASE}/files/chunk/finalize`, {
      method: 'POST',
      credentials: CRED,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_id: uploadId, dest_dir: destPath, filename: file.name }),
      signal,
    });
    if (!finalRes.ok) {
      let code = 'INTERNAL_ERROR';
      let message = '';
      try {
        const body: ApiErrorResponse = await finalRes.json();
        code = body.error.code;
        message = body.error.message;
      } catch {
        // non-JSON error body — mapped by status below
      }
      throw new ApiError(code, friendlyError(finalRes.status, code, message), finalRes.status);
    }
    return finalRes.json();
  },
};
