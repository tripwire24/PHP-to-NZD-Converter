const CACHE_NAME = 'php-nzd-converter-v1';
const DYNAMIC_CACHE = 'php-nzd-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './icons/icon-72x72.png',
    './icons/icon-96x96.png',
    './icons/icon-128x128.png',
    './icons/icon-144x144.png',
    './icons/icon-152x152.png',
    './icons/icon-192x192.png',
    './icons/icon-384x384.png',
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

// Helper function to check if request is for an image
const isImageRequest = request => {
    return request.destination === 'image' || request.url.match(/\.(png|jpg|jpeg|svg|gif)$/);
};

// Helper function to check if request is for static asset
const isStaticAsset = url => {
    return STATIC_ASSETS.some(asset => url.includes(asset));
};

// Helper function to check if request is for API
const isApiRequest = url => {
    return url.includes('exchangerate-api.com') || url.includes('maps.googleapis.com');
};

// Helper function for network request with timeout
const timeoutFetch = (request, timeout = 5000) => {
    return Promise.race([
        fetch(request),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
        )
    ]);
};

// Fetch event - handle requests
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle API requests (Exchange Rate API and Google Maps)
    if (isApiRequest(url.href)) {
        event.respondWith(
            timeoutFetch(request)
                .then(response => {
                    // Clone the response before caching
                    const responseToCache = response.clone();
                    
                    // Cache the successful response
                    caches.open(DYNAMIC_CACHE)
                        .then(cache => cache.put(request, responseToCache));
                    
                    return response;
                })
                .catch(async () => {
                    // If network request fails, try to get from cache
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    // If no cached response for exchange rate API, return fallback data
                    if (url.href.includes('exchangerate-api.com')) {
                        return new Response(JSON.stringify({
                            rates: { NZD: 0.027 }, // Fallback exchange rate
                            last_updated: new Date().toISOString()
                        }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                    
                    throw new Error('Network request failed and no cache available');
                })
        );
        return;
    }

    // Handle static assets
    if (isStaticAsset(url.href)) {
        event.respondWith(
            caches.match(request)
                .then(response => response || fetch(request))
        );
        return;
    }

    // Handle image requests
    if (isImageRequest(request)) {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    
                    return fetch(request)
                        .then(networkResponse => {
                            const responseToCache = networkResponse.clone();
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => cache.put(request, responseToCache));
                            return networkResponse;
                        });
                })
        );
        return;
    }

    // Default strategy - Network first with cache fallback
    event.respondWith(
        fetch(request)
            .then(response => {
                // Don't cache responses with status !== 200
                if (!response || response.status !== 200) {
                    return response;
                }

                // Clone the response before caching
                const responseToCache = response.clone();
                caches.open(DYNAMIC_CACHE)
                    .then(cache => cache.put(request, responseToCache));
                
                return response;
            })
            .catch(async () => {
                const cachedResponse = await caches.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // If neither network nor cache available, return offline page
                if (request.mode === 'navigate') {
                    return caches.match('./offline.html');
                }
                
                return new Response('Network error happened', {
                    status: 408,
                    headers: { 'Content-Type': 'text/plain' },
                });
            })
    );
});

// Background sync for failed conversions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-conversions') {
        event.waitUntil(
            // Get all failed conversions from IndexedDB and try to save them
            syncConversions()
        );
    }
});

// Push notification handling
self.addEventListener('push', event => {
    const options = {
        body: event.data.text(),
        icon: './icons/icon-192x192.png',
        badge: './icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'Open app'
            },
            {
                action: 'close',
                title: 'Close notification'
            },
        ]
    };

    event.waitUntil(
        self.registration.showNotification('PHP to NZD Converter', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'open') {
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then(clientList => {
                    if (clientList.length > 0) {
                        return clientList[0].focus();
                    }
                    return clients.openWindow('/');
                })
        );
    }
});
