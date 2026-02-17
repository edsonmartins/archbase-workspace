/**
 * Archbase Workspace — Service Worker
 *
 * Caching strategies:
 * - Navigation → NetworkFirst (offline serves cached index.html)
 * - Same-origin JS/CSS → StaleWhileRevalidate
 * - Images/Fonts → CacheFirst
 * - Cross-origin (MF remotes) → NetworkOnly (skip)
 */

const CACHE_NAME = 'archbase-shell-v1';
const SHELL_ORIGIN = self.location.origin;

// ── Lifecycle ─────────────────────────────────────────────

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

// ── Fetch ─────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests (MF remotes on other ports/domains)
  if (url.origin !== SHELL_ORIGIN) return;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(cacheFirst(request));
  } else {
    // StaleWhileRevalidate: return cached immediately, update in background
    const cache$ = caches.open(CACHE_NAME);
    const cached$ = cache$.then((c) => c.match(request));
    const network$ = fetch(request)
      .then(async (response) => {
        if (response.ok) {
          const cache = await cache$;
          await cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => null);

    event.respondWith(
      cached$.then((cached) => cached || network$)
        .then((r) => r || new Response('', { status: 503, statusText: 'Service Unavailable' })),
    );
    // Keep SW alive until background network update completes
    event.waitUntil(network$);
  }
});

// ── Strategies ────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}
