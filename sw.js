const CACHE_NAME = 'smartplans-v5.75.0';
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
    '/prevailing-wages-ca.js',
    '/prevailing-wages-national.js',
    '/proposal-generator.js',
    '/styles.css',
    '/3d-logo.png',
    '/company-logo.png',
];

// Install — cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
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
