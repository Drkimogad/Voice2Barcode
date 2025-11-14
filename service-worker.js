// ========================================
// SERVICE WORKER - MemoryinQR
// Version: v2.0 (aligned with enhanced offline system)
// ========================================
const CACHE_NAME = 'memoryinqr-cache-v3';
const OFFLINE_CACHE = 'memoryinqr-offline-v3';

// Core app assets - USE RELATIVE PATHS FOR GITHUB PAGES
const urlsToCache = [
  '.',
  'index.html',
  'offline.html',
  'auth.js',
  'dashboard.js', 
  'utils.js',
  'authstyles.css',
  'dashboardstyles.css',
  'manifest.json',
  'favicon.ico',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  'privacy.html',
  'terms.html'
];

// External libraries to cache
const EXTERNAL_LIBS = [
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js',
  'https://unpkg.com/html5-qrcode',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
];

// ======== INSTALL EVENT ========
self.addEventListener('install', (event) => {
  console.log('🛠️ SERVICE WORKER: Installing...');
  self.skipWaiting(); // Activate immediately

  event.waitUntil(
    (async () => {
      try {
        // 1. Cache local assets
        const cache = await caches.open(CACHE_NAME);
        console.log('📦 Caching local assets...');
        await cache.addAll(urlsToCache.map(url => new Request(url, { mode: 'same-origin' })));
        console.log('✅ Local assets cached successfully');

        // 2. Cache external libraries safely
        const externalCache = await caches.open(OFFLINE_CACHE);
        console.log('🌐 Caching external libraries...');
        
        for (const url of EXTERNAL_LIBS) {
          try {
            await externalCache.add(new Request(url, { mode: 'no-cors', credentials: 'omit' }));
            console.log(`✅ Cached external lib: ${url}`);
          } catch (err) {
            console.warn(`⚠️ Could not cache external library: ${url}`, err);
          }
        }

        console.log('✅ Service worker installation completed');
      } catch (error) {
        console.error('❌ Service worker installation failed:', error);
      }
    })()
  );
});

// ======== ACTIVATE EVENT ========
self.addEventListener('activate', (event) => {
  console.log('🔄 SERVICE WORKER: Activating...');
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map(key => {
            if (key !== CACHE_NAME && key !== OFFLINE_CACHE) {
              console.log(`🗑️ Deleting old cache: ${key}`);
              return caches.delete(key);
            }
          })
        );

        // Take control immediately
        await self.clients.claim();
        console.log('✅ Service worker activated and ready');
        
        // Notify all clients about activation
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'SW_ACTIVATED' });
        });
      } catch (error) {
        console.error('❌ Service worker activation failed:', error);
      }
    })()
  );
});

// ======== FETCH EVENT - ENHANCED OFFLINE HANDLING ========
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  console.log(`🌐 SERVICE WORKER: Fetching ${request.url}`);

  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // 🎯 NAVIGATION REQUESTS (Pages) - Enhanced offline handling
  if (request.mode === 'navigate') {
    console.log('🧭 Navigation request detected');
    
    event.respondWith(
      (async () => {
        try {
          // ✅ ALWAYS TRY NETWORK FIRST for fresh content
          console.log('🌐 Trying network first for navigation...');
          const networkResponse = await fetch(request);
          
          // Cache the successful response for future offline use
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          
          console.log('✅ Network response successful');
          return networkResponse;
          
        } catch (networkError) {
          console.log('❌ Network failed, checking cache...');
          
          // ✅ NETWORK FAILED - CHECK CACHE
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log('✅ Serving cached page');
            return cachedResponse;
          }
          
          // ✅ NO CACHE - SERVE OFFLINE.HTML
          console.log('📴 No cache available, serving offline.html');
          return await caches.match('offline.html');
        }
      })()
    );
    return;
  }

  // 🎯 EXTERNAL LIBRARIES (Stale-while-revalidate)
  if (EXTERNAL_LIBS.some(libUrl => request.url.includes(libUrl))) {
    console.log('📚 External library request detected');
    
    event.respondWith(
      (async () => {
        const cache = await caches.open(OFFLINE_CACHE);
        const cachedResponse = await cache.match(request);
        
        // Always try to update cache in background
        if (navigator.onLine) {
          fetch(request)
            .then(response => {
              if (response && response.status === 200) {
                cache.put(request, response.clone());
                console.log(`✅ Updated cache for: ${request.url}`);
              }
            })
            .catch(err => console.warn(`⚠️ Cache update failed for: ${request.url}`, err));
        }
        
        // Return cached version if available, otherwise fetch
        return cachedResponse || fetch(request);
      })()
    );
    return;
  }

  // 🎯 STATIC ASSETS (Cache First)
  console.log('🖼️ Static asset request detected');
  event.respondWith(
    (async () => {
      // First, try cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('✅ Serving from cache:', request.url);
        return cachedResponse;
      }

      // Then, try network
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          console.log('✅ Cached new asset:', request.url);
        }
        return networkResponse;
      } catch (error) {
        console.log('❌ Network failed for asset:', request.url);
        
        // Return fallback for images
        if (request.destination === 'image') {
          const fallback = await caches.match('icons/icon-192x192.png');
          if (fallback) {
            console.log('🖼️ Serving image fallback');
            return fallback;
          }
        }
        
        return Response.error();
      }
    })()
  );
});

// ======== MESSAGE HANDLING ========
self.addEventListener('message', (event) => {
  console.log('📨 SERVICE WORKER: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏩ Skipping waiting phase');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    console.log('🔄 Sync triggered via message');
    event.waitUntil(triggerBackgroundSync());
  }
  
  // Handle update notifications
  if (event.data === 'updateAvailable') {
    console.log('🔄 Update available notification received');
  }
});


// ======== UPDATE NOTIFICATION ========
self.addEventListener('controllerchange', () => {
  console.log('🔄 SERVICE WORKER: Controller changed - notifying clients...');
  
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'UPDATE_AVAILABLE' });
    });
  });
});

console.log('✅ MemoryinQR Service Worker loaded successfully');
