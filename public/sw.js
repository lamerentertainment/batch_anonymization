const CACHE_NAME = 'iusable-gliner-model-cache-v2';
const APP_CACHE_NAME = 'iusable-app-cache-v1';
const EXPECTED_URLS = [/\.onnx$/, /\.wasm$/, /\.json$/, /\.txt$/, /\.bin$/, /\.mjs$/];

// Core app assets to cache for offline use
const APP_ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/App.vue',
  '/src/style.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE_NAME).then(cache => {
      // Try to cache app assets, but don't fail if some are not available
      return Promise.allSettled(
        APP_ASSETS.map(url =>
          cache.add(url).catch(err => console.log(`Failed to cache ${url}:`, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => {
        if (key !== CACHE_NAME && key !== APP_CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const reqUrl = new URL(req.url);
  const isOriginValid = reqUrl.origin === self.location.origin;

  // Handle model files (onnx, wasm, etc.)
  if (EXPECTED_URLS.some(pattern => pattern.test(req.url)) && isOriginValid) {
    event.respondWith(
      caches.match(req).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(req).then(networkResponse => {
          if (networkResponse.ok) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(req, cloned);
            });
          }
          return networkResponse;
        }).catch(error => {
          console.error('Network fetch failed:', error);
          throw error;
        });
      })
    );
    return;
  }

  // Handle app assets (HTML, CSS, JS) - Cache first, then network
  if (isOriginValid && req.method === 'GET') {
    event.respondWith(
      caches.match(req).then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          // Update cache in background
          fetch(req).then(networkResponse => {
            if (networkResponse.ok) {
              caches.open(APP_CACHE_NAME).then(cache => {
                cache.put(req, networkResponse.clone());
              });
            }
          }).catch(() => {
            // Ignore network errors when updating cache
          });
          return cachedResponse;
        }

        // No cache, try network
        return fetch(req).then(networkResponse => {
          if (networkResponse.ok) {
            const cloned = networkResponse.clone();
            caches.open(APP_CACHE_NAME).then(cache => {
              cache.put(req, cloned);
            });
          }
          return networkResponse;
        }).catch(error => {
          console.error('Network fetch failed:', error);
          // Could return a custom offline page here
          throw error;
        });
      })
    );
  }
});