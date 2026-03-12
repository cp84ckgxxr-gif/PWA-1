// Northern Star Painters - Service Worker
// Version 1.0.0

const CACHE_NAME = 'nsp-v1';
const FIREBASE_CACHE = 'nsp-firebase-v1';

// Files to cache immediately
const STATIC_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Firebase URLs to cache
const FIREBASE_URLS = [
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then(cache => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_CACHE);
            }),
            caches.open(FIREBASE_CACHE).then(cache => {
                console.log('Service Worker: Caching Firebase SDK');
                return cache.addAll(FIREBASE_URLS);
            })
        ]).then(() => {
            console.log('Service Worker: Installation complete');
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME && cache !== FIREBASE_CACHE) {
                        console.log('Service Worker: Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event - network first, cache fallback
self.addEventListener('fetch', event => {
    const url = event.request.url;
    
    // Skip chrome-extension and non-http requests
    if (!url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone the response
                const responseClone = response.clone();
                
                // Cache successful responses
                if (response.status === 200) {
                    const cacheName = url.includes('firebase') ? FIREBASE_CACHE : CACHE_NAME;
                    caches.open(cacheName).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    // If not in cache and it's the main page, return cached index
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});

// Message handler for manual cache updates
self.addEventListener('message', event => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data.action === 'clearCache') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cache => caches.delete(cache))
                );
            })
        );
    }
});
