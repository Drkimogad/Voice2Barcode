// Add this immediately after install event
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
  console.log('Service Worker claiming control');
});

const CACHE_NAME = 'memoryinqr-v1.1.3';
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
// FIXED Fetch event:
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request)
          .then((fetchResponse) => {
            // Cache ALL successful requests (including external libs)
            return caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse;
              });
          })
          // TO THIS:
.catch(() => {
  if (event.request.destination === 'document') {
    // Always serve your custom offline.html, never browser's offline page
    return caches.match('/offline.html');
  }
  return Response.error();
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
