/**
 * Application-wide deployment + tuning values.
 * Change these in ONE place — or via environment (.env / Vercel dashboard).
 *
 * Deployment:
 *   - Local dev / same-origin prod → leave VITE_API_URL empty. API calls go
 *     to root-absolute /api, which works from ANY page path (/, /files,
 *     /nodevault/files) and through prefix-stripping gateways.
 *   - Split hosting (e.g. Vercel) → set VITE_API_URL to the backend origin,
 *     e.g. https://api.example.com (include any gateway prefix yourself,
 *     e.g. https://host/nodevault). Vercel env var, redeploy after.
 */

const apiOrigin = (import.meta.env.VITE_API_URL as string | undefined ?? "")
  .trim()
  .replace(/\/+$/, "");

/** Backend origin, "" = same origin (dev proxy / same-host prod). */
export const API_ORIGIN = apiOrigin;

/**
 * Fully-qualified API root, e.g. "/api" or "https://api.example.com/api".
 * Always root-absolute when same-origin: the backend serves /api at the
 * domain root in every mode (direct, subpath, gateway).
 * Must match the backend route group (server/internal/router/router.go).
 */
export const API_BASE_URL = `${apiOrigin}/api`;

/** Prometheus-style metrics endpoint (always domain-root absolute). */
export const METRICS_URL = `${apiOrigin}/metrics`;

export const APP_NAME = "NodeVault";

/** Files larger than this use the chunked uploader (api/client.ts). */
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

/** Files larger than this are treated as chunked transfers (useTransfers). */
export const CHUNK_THRESHOLD = 5 * 1024 * 1024; // 5 MB — keep in sync with CHUNK_SIZE

/** Directories bigger than this render with the virtualized list. */
export const VIRTUAL_THRESHOLD = 200;

/** How often the storage pill re-fetches /api/v1/storage (ms). */
export const STORAGE_POLL_MS = 30_000;

/** Max characters shown in a text-file preview. */
export const PREVIEW_TEXT_CAP = 8000;

export const PREFS_KEY = 'fm_sort_prefs';
export const TREE_KEY = 'fm_tree_open';