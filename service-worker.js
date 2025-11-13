const CACHE_NAME = 'memoryinqr-v1.2.1';
const URLS_TO_CACHE = [
  '/MemoryinQR/',
  '/MemoryinQR/index.html', 
  '/MemoryinQR/view.html',
  '/MemoryinQR/offline.html',
  '/MemoryinQR/auth.js',
  '/MemoryinQR/dashboard.js',
  '/MemoryinQR/utils.js',
  '/MemoryinQR/authstyles.css',
  '/MemoryinQR/dashboardstyles.css',
  '/MemoryinQR/manifest.json',
  '/MemoryinQR/favicon.ico',
  '/MemoryinQR/icons/icon-192x192.png',
  '/MemoryinQR/icons/icon-512x512.png'
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
// Install event - cache all assets
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('💾 Caching app shell and external libs');
        // Cache ONLY the critical files first
        return cache.addAll([
          '/MemoryinQR/',
          '/MemoryinQR/offline.html',
          '/MemoryinQR/index.html'
        ]).then(() => {
          console.log('✅ Critical files cached');
          return self.skipWaiting();
        });
      })
      .catch(error => {
        console.error('❌ Cache failed:', error);
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
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
          } else {
            // ADD THIS DIAGNOSTIC PART - check what's in current cache
            return caches.open(cacheName).then(cache => {
              return cache.keys().then(requests => {
                console.log('📦 Currently cached files in', cacheName, ':');
                requests.forEach(request => {
                  console.log('   -', request.url);
                });
                return true;
              });
            });
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
// TEMPORARY: Simple fetch handler to test offline.html
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  console.log('🌐 Fetch event:', request.url, 'Mode:', request.mode);
  
  // Handle page navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async error => {
        console.log('❌ Navigation failed, checking cache...');
        
        // List all cached files to debug
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        console.log('📦 All cached files:');
        keys.forEach(key => console.log('   -', key.url));
        
        // Try to serve offline.html
        const offlineResponse = await cache.match('/MemoryinQR/offline.html');
        if (offlineResponse) {
          console.log('✅ Found offline.html in cache');
          return offlineResponse;
        } else {
          console.log('❌ offline.html NOT in cache');
          return Response.error();
        }
      })
    );
    return;
  }
  
  // For other requests, use network first
  event.respondWith(fetch(request));
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
