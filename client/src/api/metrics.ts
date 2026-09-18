import { METRICS_URL } from '../config/app';

export interface ServerMetrics {
  requests_total: number;
  request_errors: number;
  upload_bytes_total: number;
  uploads_total: number;
  latency_avg_ms: number;
}

/** Fetches Prometheus-style metrics from the backend. Null when unreachable. */
export async function fetchMetrics(signal?: AbortSignal): Promise<ServerMetrics | null> {
  try {
    const res = await fetch(METRICS_URL, { signal });
    if (!res.ok) return null;
    const text = await res.text();
    const get = (name: string) => {
      const m = text.match(new RegExp(`^${name}\\s+([\\d.]+)`, 'm'));
      return m ? parseFloat(m[1]) : 0;
    };
    return {
      requests_total: get('filemanager_requests_total'),
      request_errors: get('filemanager_request_errors_total'),
      upload_bytes_total: get('filemanager_upload_bytes_total'),
      uploads_total: get('filemanager_uploads_total'),
      latency_avg_ms: get('filemanager_request_latency_avg_ms'),
    };
  } catch {
    return null;
  }
}
