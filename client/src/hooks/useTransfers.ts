import { useState, useCallback } from 'react';
import { client } from '../api/client';
import type { TransferItem } from '../types';

const CHUNK_THRESHOLD = 5 * 1024 * 1024; // 5 MB
let nextId = 0;
let nextUploadId = 0;

export function useTransfers() {
  const [transfers, setTransfers] = useState<TransferItem[]>([]);

  const update = useCallback((id: string, patch: Partial<TransferItem>) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const enqueue = useCallback(
    async (file: File, destPath: string) => {
      const id = String(++nextId);
      const abort = new AbortController();
      const chunked = file.size > CHUNK_THRESHOLD;
      const uploadId = chunked ? `upload-${++nextUploadId}` : undefined;

      const item: TransferItem = {
        id,
        name: file.name,
        size: file.size,
        progress: 0,
        speed: 0,
        status: 'uploading',
        destPath,
        abortController: abort,
        chunked,
        uploadId,
      };
      setTransfers((prev) => [item, ...prev]);

      try {
        if (chunked && uploadId) {
          await client.uploadFileChunked(
            uploadId,
            destPath,
            file,
            (pct, speed) => update(id, { progress: pct, speed }),
            abort.signal,
          );
        } else {
          await client.uploadFile(
            destPath,
            file,
            (pct, speed) => update(id, { progress: pct, speed }),
            abort.signal,
          );
        }
        update(id, { status: 'completed', progress: 100, speed: 0 });
      } catch (e: unknown) {
        const msg = (e as Error).message ?? 'Upload failed';
        if (msg === 'Upload cancelled') {
          update(id, { status: 'cancelled', speed: 0 });
        } else {
          update(id, { status: 'failed', speed: 0, error: msg });
        }
      }
    },
    [update],
  );

  const cancel = useCallback(
    (id: string) => {
      setTransfers((prev) => {
        const t = prev.find((x) => x.id === id);
        t?.abortController?.abort();
        return prev;
      });
    },
    [],
  );

  const clearDone = useCallback(() => {
    setTransfers((prev) => prev.filter((t) => t.status === 'uploading'));
  }, []);

  const activeCount = transfers.filter((t) => t.status === 'uploading').length;

  return { transfers, enqueue, cancel, clearDone, activeCount };
}
