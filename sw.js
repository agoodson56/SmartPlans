const CACHE_NAME = 'smartplans-v5.100.0';
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
    '/rate-library.js',
    '/styles.css',
    '/3d-logo.png',
    '/company-logo.png',
    '/smartplans-logo.png',
];

// Install — cache app shell, immediately take over
self.addEventListener('install', (event) => {
    // Force skip waiting — don't wait for old tabs to close
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
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
