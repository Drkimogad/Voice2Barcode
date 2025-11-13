const CACHE_NAME = 'memoryinqr-v1.1.4';
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
  console.log('🛠️ Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('💾 Caching app shell and external libs');
        // Cache core app files first, then external libs
        return cache.addAll(URLS_TO_CACHE)
          .then(() => {
            console.log('✅ Core app files cached');
            return cache.addAll(EXTERNAL_LIBS);
          })
          .then(() => {
            console.log('✅ External libs cached');
          });
      })
      .catch(error => {
        console.error('❌ Cache failed:', error);
      })
      .then(() => {
        console.log('⚡ skipWaiting called');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🎯 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('🗑️ Cleaning old caches:', cacheNames);
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🚮 Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('👑 Claiming clients');
      return self.clients.claim();
    })
    .then(() => {
      console.log('✅ Service Worker fully activated');
    })
  );
});

// DEBUGGED Fetch event - handle offline properly
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  console.log('🌐 Fetch event:', request.method, request.url);
  
  // Handle navigation requests (page loads) separately
  if (request.mode === 'navigate') {
    console.log('🧭 Navigation request detected');
    event.respondWith(
      fetch(request)
        .then(response => {
          console.log('✅ Navigation fetch successful');
          return response;
        })
        .catch(error => {
          console.log('❌ Navigation failed, serving offline.html');
          return caches.match('/offline.html')
            .then(offlineResponse => {
              if (offlineResponse) {
                console.log('📄 Serving offline.html');
                return offlineResponse;
              }
              console.log('⚠️ offline.html not in cache');
              return Response.error();
            });
        })
    );
    return;
  }
  
  // For all other requests (CSS, JS, images, etc.)
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('💾 Serving from cache:', request.url);
          return cachedResponse;
        }
        
        console.log('🌐 Fetching from network:', request.url);
        return fetch(request)
          .then(networkResponse => {
            // Cache successful responses
            if (networkResponse.ok) {
              console.log('✅ Network fetch successful, caching:', request.url);
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, responseClone))
                .catch(cacheError => {
                  console.error('❌ Cache put failed:', cacheError);
                });
            }
            return networkResponse;
          })
          .catch(error => {
            console.log('❌ Network failed for:', request.url);
            // For non-navigation requests, return error or cached fallback
            if (request.destination === 'style' || request.destination === 'script') {
              return caches.match(request);
            }
            return Response.error();
          });
      })
  );
});

// Check for updates
self.addEventListener('message', (event) => {
  console.log('📨 Message received:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 Skip waiting requested');
    self.skipWaiting();
  }
});

// Global error handling
self.addEventListener('error', (event) => {
  console.error('🔥 Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('🔥 Service Worker promise rejection:', event.reason);
});

console.log('✅ Service Worker script loaded');
