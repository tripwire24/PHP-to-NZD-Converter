const CACHE_NAME = 'php-nzd-converter-v1';
const DYNAMIC_CACHE = 'php-nzd-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    'https://unpkg.com/react@17/umd/react.production.min.js',
    'https://unpkg.com/react-dom@17/umd/react-dom.production.min.js',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/tesseract.js@v2.1.0/dist/tesseract.min.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - handle requests
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request)
                    .then(fetchResponse => {
                        // Don't cache API responses
                        if (event.request.url.includes('exchangerate-api.com')) {
                            return fetchResponse;
                        }

                        // Clone the response before using it
                        const responseToCache = fetchResponse.clone();

                        // Add to cache
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return fetchResponse;
                    });
            })
            .catch(() => {
                // If it's an API request, return a default response
                if (event.request.url.includes('exchangerate-api.com')) {
                    return new Response(JSON.stringify({
                        rates: { NZD: 0.027 } // Fallback exchange rate
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            })
    );
});
