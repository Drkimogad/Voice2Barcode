/*Key Lessons:
Never use cache.addAll() - it fails if ANY file fails
Use new Request() with same-origin mode
Cache files individually with try/catch
Be consistent with path patterns
Handle failures gracefully - don't break the whole install
This pattern works reliably for GitHub Pages' specific URL structure! 🚀

NB: SO REGISTERATION ALWAYS USE ABSOLUTE PATH TO WHETHER GITHUB OR FIREBASE
GitHub Pages Registration:
navigator.serviceWorker.register('/MemoryinQR/service-worker.js');
Firebase Registration:
navigator.serviceWorker.register('/service-worker.js');

Your app code (auth.js, offline.html) stays exactly the same - they use relative paths (./file.js) that work on both platforms! 🚀
*/

// ========================================
// SERVICE WORKER - MemoryinQR (Multi-Platform)
// Version: v5.4 - GitHub Pages & Firebase Compatible
// ========================================
// Add this helper at the top:
function getOfflinePage() {
    return CURRENT_ENV === 'GITHUB' ? '/MemoryinQR/offline.html' : '/offline.html';
}
// Then use it everywhere:
//.catch(() => caches.match(getOfflinePage())); // ✅ Consistent
//const offline = await caches.match(getOfflinePage()); // ✅ Consistent

const CACHE_NAME = 'memoryinqr-cache-v5.6';
const OFFLINE_CACHE = 'memoryinqr-offline-v4.5';

// ✅ ONE-LINE SWITCH - Change this for deployment!
const CURRENT_ENV = 'GITHUB'; // Change to 'FIREBASE' for Firebase hosting

// ✅ ENVIRONMENT CONFIG
const ENV_CONFIG = {
    GITHUB: {
        root: '/MemoryinQR/',  // ✅ GitHub Pages subdirectory
    },
    FIREBASE: {
        root: '/',  // ✅ Firebase root domain
    }
};

// ✅ Helper function to get correct paths
function getPath(path) {
    const root = ENV_CONFIG[CURRENT_ENV].root;
    return root + path.replace(/^\//, ''); // Remove leading slash if present
}

// Core app assets - Environment-aware paths
const urlsToCache = [
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
].map(getPath); // ✅ Automatically applies correct root

// External libs (unchanged)
const EXTERNAL_LIBS = [
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js',
    'https://unpkg.com/html5-qrcode',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
];

// ✅ FIXED INSTALL: Individual caching with try/catch
self.addEventListener('install', (event) => {
    console.log(`🛠️ SERVICE WORKER: Installing for ${CURRENT_ENV}...`);
    self.skipWaiting();

    event.waitUntil((async () => {
        try {
            const cache = await caches.open(CACHE_NAME);
            
            // ✅ CACHE LOCAL ASSETS INDIVIDUALLY
            for (const url of urlsToCache) {
                try {
                    await cache.add(new Request(url, { mode: 'same-origin' }));
                    console.log('✅ Cached:', url);
                } catch (err) {
                    console.warn('⚠️ Failed to cache:', url, err);
                }
            }

            // ✅ CACHE EXTERNAL LIBS INDIVIDUALLY  
            const extCache = await caches.open(OFFLINE_CACHE);
            for (const lib of EXTERNAL_LIBS) {
                try {
                    await extCache.add(new Request(lib, { mode: 'no-cors', credentials: 'omit' }));
                    console.log('✅ Cached external:', lib);
                } catch (err) {
                    console.warn('⚠️ Could not cache external lib:', lib, err);
                }
            }
            
            console.log(`✅ Installation completed for ${CURRENT_ENV}`);
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
if (url.pathname.endsWith('/online.txt')) {
    // do not cache this file; always try network
    event.respondWith(
        fetch(request, { cache: 'no-store', credentials: 'omit' })
      .catch(() => caches.match(getOfflinePage())); // ✅ Consistent
    );
    return;
}
    // do not cache this file; always try network
    event.respondWith(
      fetch(request, { cache: 'no-store', credentials: 'omit' })
     .catch(() => caches.match(getOfflinePage())); // ✅ Consistent
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
        const offline = await caches.match(getOfflinePage()); // ✅ Consistent
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
