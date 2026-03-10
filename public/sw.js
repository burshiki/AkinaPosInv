const CACHE_NAME = 'akina-pos-v1';
const STATIC_ASSETS = [
    '/',
    '/offline',
    '/manifest.json',
];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: network-first for pages, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and cross-origin
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;

    // Static assets (JS, CSS, fonts, images): cache-first
    if (
        url.pathname.startsWith('/build/') ||
        url.pathname.startsWith('/icons/') ||
        url.pathname.match(/\.(js|css|woff2?|ttf|png|jpg|svg|ico)$/)
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // API endpoints for product data: network-first with cache fallback
    if (url.pathname.startsWith('/api/') || url.pathname.includes('/products')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // HTML pages: network-first, offline fallback
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() =>
                    caches.match(request).then((cached) => cached || caches.match('/offline'))
                )
        );
        return;
    }
});

// Listen for sync events to process queued sales
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-offline-sales') {
        event.waitUntil(syncOfflineSales());
    }
});

async function syncOfflineSales() {
    // Post message to all clients to trigger sync from IndexedDB
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
        client.postMessage({ type: 'SYNC_OFFLINE_SALES' });
    });
}
