const CACHE_NAME = 'memoryinqr-v1.0.0';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/view.html',
  '/offline.html',
  '/auth.js',
  '/dashboard.js', 
  '/utils.js',
  '/authstyles.css',
  '/dashboardstyles.css',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// External libraries to cache
const EXTERNAL_LIBS = [
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js',
  'https://unpkg.com/html5-qrcode',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell and external libs');
        return cache.addAll([...URLS_TO_CACHE, ...EXTERNAL_LIBS]);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip Firebase requests and external API calls
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((fetchResponse) => {
            // Cache new requests (except external libs which are already cached)
            if (!event.request.url.startsWith('http')) {
              return fetchResponse;
            }
            
            return caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse;
              });
          })
          .catch(() => {
            // If both cache and network fail, show offline page for HTML requests
            if (event.request.destination === 'document') {
              return caches.match('/offline.html');
            }
            return null;
          });
      })
  );
});

// Check for updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
