const CACHE_NAME = 'lex-radio-cache-v1';
const APP_SHELL_URLS = [
  '/', // Cache the root path
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/manifest.json',
  // Local Icons & Images visible in the UI or manifest
  '/logo-lexradio.png',
  '/icon-144.png',
  '/artista.png',
  '/lextronica.png',
  '/startpop.png',
  '/concierto.png',
  '/retrovibe.png',
  '/RAMix_Total_Poster_Web.png',
  '/LEX.png',
  '/Jessica.png',
  // External image used in header (ensure CORS allows caching or use opaque response)
  'https://i.imgur.com/BhXCsFa.png',
  // Google Fonts CSS (font files themselves are usually handled by browser cache after this)
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&display=swap',
  // AOS library files
  'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css',
  'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js'
  // Note: Service worker file itself ('/service-worker.js') is updated automatically by the browser.
  // OneSignalSDK.page.js is probably best left to browser cache / its own mechanisms.
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Abriendo cache y cacheando app shell:', APP_SHELL_URLS);
        // Use addAll for atomic caching. If one fails, none are cached.
        // For cross-origin requests, they must support CORS, or they'll be opaque responses.
        return cache.addAll(APP_SHELL_URLS).catch(error => {
          console.error('Service Worker: Falló cache.addAll:', error);
          // Optionally, try to cache them individually if addAll fails to see which one failed
          // For simplicity here, we just log the error.
          // APP_SHELL_URLS.forEach(url => {
          //   cache.add(url).catch(err => console.warn(`Failed to cache ${url}`, err));
          // });
        });
      })
      .then(() => {
        console.log('Service Worker: App shell cacheado exitosamente.');
        return self.skipWaiting(); // Activate the new SW immediately
      })
      .catch((error) => {
        console.error('Service Worker: Falló la instalación del cache:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activado.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Borrando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Take control of uncontrolled clients
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle requests for range requests (audio/video seeking)
  if (event.request.headers.has('range')) {
    return;
  }

  // For navigation requests (HTML pages), try network first, then cache, then offline page.
  // This helps ensure users get the latest HTML if online.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If network fetch is successful, clone and cache it for future offline use
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try to serve from cache
          return caches.match(event.request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('/index.html'); // Fallback to cached index.html
            });
        })
    );
    return;
  }

  // For non-navigation requests (CSS, JS, images, etc.), use Cache First strategy.
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // console.log('Service Worker: Recurso encontrado en cache:', event.request.url);
          return cachedResponse;
        }
        // console.log('Service Worker: Recurso no encontrado en cache, buscando en red:', event.request.url);
        return fetch(event.request).then((networkResponse) => {
          // If fetching from network is successful, clone and cache it
          if (networkResponse && networkResponse.ok) {
            // Check if the request is for an external resource not in our APP_SHELL_URLS
            // or if it's a local resource we want to keep updated.
            // For simplicity, we'll cache most successful GET requests.
            // Be careful with caching opaque responses or large dynamic content.
            if (event.request.method === 'GET' && APP_SHELL_URLS.includes(new URL(event.request.url).pathname) || APP_SHELL_URLS.includes(event.request.url)) {
               const responseToCache = networkResponse.clone();
               caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
          }
          return networkResponse;
        }).catch(() => {
          // If both cache and network fail (e.g., offline and not cached)
          // For specific asset types like images, you could return a placeholder.
          // console.warn('Service Worker: Fetch failed for:', event.request.url);
          if (event.request.destination === 'image') {
            // Return a placeholder image if you have one in cache
            // return caches.match('/placeholder-image.png');
          }
          // For other types, could return a generic offline response if not handled by navigate fallback
          // return new Response("Contenido no disponible offline.", { status: 404, statusText: "Not Found" });
          return new Response(JSON.stringify({ error: "Network error" }), {
            headers: { "Content-Type": "application/json" },
            status: 503 // Service Unavailable
          });
        });
      })
  );
});
