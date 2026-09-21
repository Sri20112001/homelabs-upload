// Bumped to v3: subpath-safe shell keys (see below) purge older caches.
const CACHE = 'nodevault-v3';
// './' resolves against the SW script URL, so the shell key stays correct
// whether the app is served from the domain root or a subpath (/nodevault/).
const SHELL = './';

// Dev hosts (vite) must never be intercepted — HMR modules, /metrics and
// SPA navigations would otherwise be served stale or break outright.
function isDevHost() {
  const { hostname, port } = self.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  return port === '3456' || port === '3457' || port === '5173';
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll([SHELL]).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Lets the page trigger activation of a waiting update on user action.
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (isDevHost()) return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // fonts, CDNs, API hosts
  if (url.pathname.startsWith('/api/')) return;    // backend passthrough
  if (url.pathname === '/metrics') return;         // live metrics, never cache

  // SPA navigations: network-first, fall back to cached shell.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((res) => {
        // Clone synchronously — before the page touches the body — or the
        // later put() throws "Response body is already used".
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then((c) => c.put(SHELL, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(SHELL))
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached ?? network;
    })
  );
});
