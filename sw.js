const CACHE_NAME = 'smartplans-v5.144.1';
const APP_SHELL = [
    '/',
    '/index.html',
    '/app.js',
    '/ai-engine.js',
    '/export-engine.js',
    '/formula-engine-3d.js',
    '/cable-analyzer.js',
    '/scale-calibration.js',
    '/pricing-database.js',
    '/pricing-service.js',
    '/prevailing-wages-ca.js',
    '/prevailing-wages-national.js',
    '/proposal-generator.js',
    '/company-credentials.js',
    '/rate-library.js',
    '/styles.css',
    '/3d-logo.png',
    '/company-logo.png',
    '/smartplans-logo.png',
];

// Install — cache app shell, then take over.
// H1 fix (audit 2026-04-27): cache.addAll() is atomic per spec. If any single URL
// 404s (file renamed, not yet propagated, or removed from APP_SHELL list out of sync
// with the deployed bundle), the entire install rejects. The new SW never activates,
// users stay on the old cached version forever. Replace with Promise.allSettled over
// individual fetch+put so a single missing file doesn't block the deploy. Failures
// are logged so we still notice them.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            const results = await Promise.allSettled(APP_SHELL.map(async (url) => {
                const res = await fetch(url, { cache: 'reload' });
                if (!res || !res.ok) throw new Error(`${url} -> ${res ? res.status : 'no response'}`);
                await cache.put(url, res);
                return url;
            }));
            const failed = results
                .map((r, i) => r.status === 'rejected' ? { url: APP_SHELL[i], reason: r.reason && r.reason.message } : null)
                .filter(Boolean);
            if (failed.length > 0) {
                console.warn(`[SW] ${failed.length}/${APP_SHELL.length} app-shell entries failed to cache during install:`, failed);
            } else {
                console.log(`[SW] App shell cached (${APP_SHELL.length} entries) → ${CACHE_NAME}`);
            }
            // skipWaiting AFTER cache attempt finishes — even if some entries failed,
            // the SW takes over (network-first fetch handler will recover those URLs
            // on next request). Pre-fix: a single 404 stranded the entire SW update.
            return self.skipWaiting();
        })
    );
});

// Activate — nuke ALL old caches, claim all clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
                console.log(`[SW] Deleting old cache: ${k}`);
                return caches.delete(k);
            }))
        ).then(() => {
            console.log(`[SW] ${CACHE_NAME} activated — claiming all clients`);
            return self.clients.claim();
        })
    );
});

// Message handler — allows page to force-skip waiting
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Fetch — network-first for API, stale-while-revalidate for same-origin assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip cross-origin requests — let the browser handle CDNs, fonts, Sentry, etc.
    if (url.origin !== self.location.origin) return;

    // API calls — network-only, never cache
    if (url.pathname.startsWith('/api/')) {
        if (event.request.method === 'GET') {
            event.respondWith(fetch(event.request));
        }
        return;
    }

    // JS files — network-first so deployments take effect immediately
    const isJsFile = /\.js$/.test(url.pathname);
    if (isJsFile) {
        event.respondWith(
            fetch(event.request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => caches.match(event.request))
        );
        return;
    }

    // Other static assets (CSS, HTML, images) — stale-while-revalidate
    const isStaticAsset = /\.(css|html|png|jpg|woff2|svg)$/.test(url.pathname);
    if (isStaticAsset) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                const fetchPromise = fetch(event.request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
        );
    }
});
