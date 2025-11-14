// ========================================
// SERVICE WORKER - MemoryinQR (Fixed)
// Purpose: Network-first for navigations & dynamic content,
//          cache-fallback for offline usage.
// Version: v2.1
// ========================================

const CACHE_NAME = 'memoryinqr-cache-v5.1';
const OFFLINE_CACHE = 'memoryinqr-offline-v4.1';

// Core app assets - relative paths (suitable for GitHub Pages)
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
 // 'favicon.ico',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  'privacy.html',
  'terms.html'
];

// External libs - we will try to cache, but these are handled as opaque responses
const EXTERNAL_LIBS = [
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js',
  'https://unpkg.com/html5-qrcode',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
];

// Helper: timeout for fetch so network-first doesn't hang forever
function fetchWithTimeout(request, timeout = 7000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network timeout'));
    }, timeout);

    fetch(request).then(response => {
      clearTimeout(timer);
      resolve(response);
    }).catch(err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// INSTALL: cache core assets (including offline.html)
self.addEventListener('install', (event) => {
  console.log('🛠️ SERVICE WORKER: Installing and caching core assets...');
  self.skipWaiting();

  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(urlsToCache);
      // Cache external libs in separate OFFLINE_CACHE (best-effort)
      const extCache = await caches.open(OFFLINE_CACHE);
      for (const lib of EXTERNAL_LIBS) {
        try {
          // try to cache external lib (no-cors may produce opaque response)
          await extCache.add(new Request(lib, { mode: 'no-cors', credentials: 'omit' }));
        } catch (err) {
          console.warn('⚠️ Could not cache external lib (best-effort):', lib, err);
        }
      }
      console.log('✅ Installation caching complete');
    } catch (err) {
      console.error('❌ Install failed', err);
    }
  })());
});

// ACTIVATE: clean old caches and take control
self.addEventListener('activate', (event) => {
  console.log('🔄 SERVICE WORKER: Activating...');
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => {
        if (k !== CACHE_NAME && k !== OFFLINE_CACHE) {
          console.log('🗑️ Deleting old cache:', k);
          return caches.delete(k);
        }
      }));
      await self.clients.claim();
      console.log('✅ Service worker activated');
      // notify clients if needed
      const allClients = await self.clients.matchAll();
      allClients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED' }));
    } catch (err) {
      console.error('❌ Activate failed', err);
    }
  })());
});

// FETCH: network-first for navigations, stale-while-revalidate for external libs,
// cache-first for static assets with network update fallback.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // skip non-GET or chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Bypass SW for a dedicated online check endpoint (online.txt)
  // Put an "online.txt" file at your project root with text "OK"
  if (url.pathname.endsWith('/online.txt')) {
    // do not cache this file; always try network
    event.respondWith(
      fetch(request, { cache: 'no-store', credentials: 'omit' })
        .catch(() => caches.match('offline.html')) // fallback if even online.txt fails
    );
    return;
  }

  // NAVIGATION REQUESTS (pages) -> NETWORK FIRST (with timeout) then CACHE then offline.html
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Try network first, but ensure it times out if slow
        const networkResponse = await fetchWithTimeout(request, 7000);
        // Only cache valid 200/html responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        } else if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'opaque') {
          // opaque responses (from no-cors) can still be used but avoid caching as main HTML
          // (skip caching to avoid serving opaque HTML later)
        }
        return networkResponse;
      } catch (networkError) {
        // Network failed or timed out -> try cache
        const cached = await caches.match(request);
        if (cached) {
          return cached;
        }
        // Final fallback: offline.html
        const offline = await caches.match('offline.html');
        return offline || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // EXTERNAL LIBRARIES -> STALE-WHILE-REVALIDATE
  if (EXTERNAL_LIBS.some(lib => request.url.startsWith(lib))) {
    event.respondWith((async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      const cached = await cache.match(request);
      // Trigger background update if online
      if (navigator.onLine) {
        fetch(request).then(resp => {
          if (resp && resp.status === 200) {
            cache.put(request, resp.clone());
          }
        }).catch(() => { /* silent fail */ });
      }
      return cached || fetch(request).catch(() => cached) ;
    })());
    return;
  }

  // STATIC ASSETS -> CACHE FIRST then network update
  event.respondWith((async () => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Background update to refresh cache (non-blocking)
      if (navigator.onLine) {
        fetch(request).then(async (networkResp) => {
          try {
            if (networkResp && networkResp.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(request, networkResp.clone());
            }
          } catch (e) {
            // swallow caching errors
          }
        }).catch(() => { /* ignore update errors */ });
      }
      return cachedResponse;
    }

    // No cache -> try network then cache result for next time
    try {
      const networkResp = await fetch(request);
      if (networkResp && networkResp.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResp.clone());
      }
      return networkResp;
    } catch (err) {
      // If request is an image, serve a fallback icon if present
      if (request.destination === 'image') {
        const fallback = await caches.match('icons/icon-192x192.png');
        if (fallback) return fallback;
      }
      // Generic network error fallback
      return Response.error();
    }
  })());
});

// MESSAGE handling (skip waiting or other commands)
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data.type === 'TRIGGER_SYNC') {
    // placeholder: trigger sync logic if used
    event.waitUntil(Promise.resolve());
  }
});

// Optional: notify clients on controllerchange (for updates)
self.addEventListener('controllerchange', () => {
  self.clients.matchAll().then(clients => {
    clients.forEach(c => c.postMessage({ type: 'UPDATE_AVAILABLE' }));
  });
});

console.log('✅ MemoryinQR Service Worker (network-first) loaded');
