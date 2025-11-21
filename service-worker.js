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
// Version: v5.8 - With Debug Logging
// ========================================
const CACHE_NAME = 'memoryinqr-cache-v6.0.2';
const OFFLINE_CACHE = 'memoryinqr-offline';
const CURRENT_ENV = 'GITHUB';
//const CURRENT_ENV = 'FIREBASE';

console.log('🛠️ SERVICE WORKER: Script loading...');

const ENV_CONFIG = {
    GITHUB: { root: '/MemoryinQR/' },
    FIREBASE: { root: '/' }
};

function getPath(path) {
    const root = ENV_CONFIG[CURRENT_ENV].root;
    return root + path.replace(/^\//, '');
}

function getRuntimePath(path) {
    const root = ENV_CONFIG[CURRENT_ENV].root;
    return root + path.replace(/^\//, '');
}

function fetchWithTimeout(resource, timeout = 7000) {
    console.log('⏱️ fetchWithTimeout:', resource, timeout);
    const controller = new AbortController();
    const id = setTimeout(() => {
        console.log('⏰ Fetch timeout reached');
        controller.abort();
    }, timeout);
    return fetch(resource, { signal: controller.signal })
        .finally(() => {
            clearTimeout(id);
            console.log('🧹 Fetch timeout cleared');
        });
}

const urlsToCache = [
    'index.html', 'offline.html', 'auth.js', 'dashboard.js', 'utils.js',
    'authstyles.css', 'dashboardstyles.css', 'manifest.json', 'favicon.ico',
    'icons/icon-192x192.png', 'icons/icon-512x512.png', 'privacy.html', 'terms.html'
].map(getPath);

const EXTERNAL_LIBS = [
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js',
    'https://unpkg.com/html5-qrcode',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
];

// INSTALL
self.addEventListener('install', (event) => {
    console.log('🛠️ SERVICE WORKER: Installing for', CURRENT_ENV);
    self.skipWaiting();

    event.waitUntil((async () => {
        try {
            const cache = await caches.open(CACHE_NAME);
            console.log('📦 Opening cache:', CACHE_NAME);
            
            for (const url of urlsToCache) {
                try {
                    console.log('🔍 Attempting to cache:', url);
                    await cache.add(new Request(url, { mode: 'same-origin' }));
                    console.log('✅ Cached:', url);
                } catch (err) {
                    console.warn('⚠️ Failed to cache:', url, err);
                }
            }

            const extCache = await caches.open(OFFLINE_CACHE);
            console.log('📦 Opening external cache:', OFFLINE_CACHE);
            
            for (const lib of EXTERNAL_LIBS) {
                try {
                    console.log('🔍 Attempting to cache external:', lib);
                    await extCache.add(new Request(lib, { mode: 'no-cors', credentials: 'omit' }));
                    console.log('✅ Cached external:', lib);
                } catch (err) {
                    console.warn('⚠️ Could not cache external lib:', lib, err);
                }
            }
            
            console.log('✅ Installation completed');
        } catch (err) {
            console.error('❌ Install failed', err);
        }
    })());
});

// ACTIVATE
self.addEventListener('activate', (event) => {
    console.log('🔄 SERVICE WORKER: Activating...');
    event.waitUntil((async () => {
        try {
            const keys = await caches.keys();
            console.log('🗑️ Checking old caches:', keys);
            
            await Promise.all(keys.map(k => {
                if (k !== CACHE_NAME && k !== OFFLINE_CACHE) {
                    console.log('🗑️ Deleting old cache:', k);
                    return caches.delete(k);
                }
            }));
            
            await self.clients.claim();
            console.log('✅ Service worker activated and controlling clients');
            
        } catch (err) {
            console.error('❌ Activate failed', err);
        }
    })());
});

// FETCH
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    console.log('🌐 FETCH:', request.method, url.pathname, 'mode:', request.mode);

    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
        console.log('⏩ Skipping non-GET request');
        return;
    }

// ENHANCED ONLINE.TXT BYPASS - Add to your existing fetch handler
if (url.pathname.includes('online.txt')) {
    console.log('🔄 ABSOLUTE BYPASS: online.txt request detected');
    
    // Complete bypass - no caching, no service worker interference
    event.respondWith(
        fetch(request, {
            cache: 'no-store',
            credentials: 'omit',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }).catch(error => {
            console.log('❌ online.txt fetch failed:', error);
            return new Response('OFFLINE', { 
                status: 503,
                headers: { 'Content-Type': 'text/plain' }
            });
        })
    );
    return;
}

    // NAVIGATION REQUESTS
    if (request.mode === 'navigate') {
        console.log('🧭 NAVIGATION REQUEST:', url.pathname);
        
        event.respondWith((async () => {
            try {
                console.log('🌐 Attempting network fetch for navigation');
                const networkResponse = await fetchWithTimeout(request, 7000);
                console.log('📡 Network response status:', networkResponse.status);
                
                if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(request, networkResponse.clone());
                    console.log('💾 Cached network response');
                }
                return networkResponse;
                
            } catch (networkError) {
                console.log('❌ Navigation network failed:', networkError.message);
                
                const cached = await caches.match(request);
                console.log('📦 Cache check result:', cached ? 'FOUND' : 'NOT FOUND');
                
                if (cached) {
                    console.log('✅ Serving from cache');
                    return cached;
                }
                
// Check if this is an offline.html request specifically
if (url.pathname.includes('offline.html')) {
    console.log('🎯 Specifically requesting offline.html');
    const offline = await caches.match(getRuntimePath('offline.html'));
    if (offline) {
        console.log('✅ Serving offline.html specifically');
        return offline;
    }
}

const cached = await caches.match(request);
if (cached) {
    console.log('✅ Serving from cache:', request.url);
    return cached;
}

console.log('🆘 Generic fallback to offline.html');
const offline = await caches.match(getRuntimePath('offline.html'));
return offline || new Response('<h1>Offline</h1>', { 
    headers: { 'Content-Type' : 'text/html' } 
});
            }
        })());
        return;
    }

    // EXTERNAL LIBRARIES
    if (EXTERNAL_LIBS.some(lib => request.url.startsWith(lib))) {
        console.log('📚 External library request:', request.url);
        event.respondWith((async () => {
            const cache = await caches.open(OFFLINE_CACHE);
            const cached = await cache.match(request);
            console.log('📦 External lib cached:', cached ? 'YES' : 'NO');
            
            if (navigator.onLine) {
                fetch(request).then(resp => {
                    if (resp && resp.status === 200) {
                        cache.put(request, resp.clone());
                        console.log('🔄 Updated external lib cache');
                    }
                }).catch(() => {});
            }
            return cached || fetch(request);
        })());
        return;
    }

    // STATIC ASSETS
    console.log('📄 Static asset request:', request.destination, url.pathname);
    event.respondWith((async () => {
        const cachedResponse = await caches.match(request);
        console.log('📦 Static asset cached:', cachedResponse ? 'YES' : 'NO');
        
        if (cachedResponse) {
            if (navigator.onLine) {
                fetch(request).then(async (networkResp) => {
                    try {
                        if (networkResp && networkResp.status === 200) {
                            const cache = await caches.open(CACHE_NAME);
                            cache.put(request, networkResp.clone());
                            console.log('🔄 Updated static asset cache');
                        }
                    } catch (e) {}
                }).catch(() => {});
            }
            return cachedResponse;
        }

        try {
            console.log('🌐 Fetching static asset from network');
            const networkResp = await fetch(request);
            if (networkResp && networkResp.status === 200) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, networkResp.clone());
                console.log('💾 Cached new static asset');
            }
            return networkResp;
        } catch (err) {
            console.log('❌ Static asset fetch failed:', err.message);
            return Response.error();
        }
    })());
});

self.addEventListener('message', (event) => {
    console.log('📨 Service Worker message:', event.data);
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('✅ MemoryinQR Service Worker loaded with debug logging');
