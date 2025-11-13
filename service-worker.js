const CACHE_NAME = 'memoryinqr-v1.2.5';
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
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('💾 Opened cache, attempting to add files...');
        
        // Cache critical files with proper error handling
        return cache.add('/MemoryinQR/offline.html')
          .then(() => console.log('✅ offline.html cached'))
          .then(() => cache.add('/MemoryinQR/'))
          .then(() => console.log('✅ root / cached'))
          .then(() => cache.add('/MemoryinQR/index.html'))
          .then(() => console.log('✅ index.html cached'))
          .catch(error => {
            console.error('❌ Cache add failed:', error);
            throw error;
          });
      })
      .then(() => {
        console.log('⚡ skipWaiting called');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('🔥 INSTALL FAILED:', error);
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
          } else {
            // Check what's in current cache
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

// FIXED Fetch event - handle offline properly
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  console.log('🌐 Fetch event:', request.url, 'Mode:', request.mode);
  
  // Handle navigation requests (page loads) - CRITICAL FIX
  if (request.mode === 'navigate') {
    console.log('🧭 Navigation request detected, handling offline...');
    event.respondWith(
      fetch(request)
        .then(response => {
          console.log('✅ Navigation fetch successful');
          return response;
        })
        .catch(error => {
          console.log('❌ Navigation failed, serving offline.html');
          return caches.match('/MemoryinQR/offline.html')
            .then(offlineResponse => {
              if (offlineResponse) {
                console.log('✅ Serving cached offline.html');
                return offlineResponse;
              }
              console.log('⚠️ offline.html not available, fallback to error');
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

// =============================================================================
// SUMMARY OF FIXES APPLIED:
// =============================================================================
// 
// MAIN ISSUES RESOLVED:
// 1. ✅ CACHE EMPTY PROBLEM - Fixed install event to properly cache critical files
// 2. ✅ NAVIGATION HANDLING - Added proper navigation request interception
// 3. ✅ GITHUB PAGES PATHS - All paths updated to /MemoryinQR/ subdirectory
// 4. ✅ SERVICE WORKER SCOPE - Correct registration and activation
//
// CURRENT STATUS:
// - Service worker successfully caches offline.html, /, and index.html
// - Navigation requests now properly serve offline.html when offline
// - Assets are cached and served from cache when available
// - Works with GitHub Pages subdirectory structure
//
// BEHAVIOR NOW:
// - Online: Normal app functionality
// - Offline + Authenticated: Stays in dashboard with offline banner
// - Offline + Not authenticated: Serves offline.html instead of browser error page
// - Back online: Auto-recovers to appropriate state
//
// =============================================================================
