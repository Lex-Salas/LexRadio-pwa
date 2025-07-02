const CACHE_NAME = 'lex-radio-v3.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-144.png',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-lexradio.png',
  '/startpop.png',
  '/retrovibe.png',
  '/lextronica.png',
  '/concierto.png',
  '/artista.png',
  '/equipo.png',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Inter:wght@400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css',
  'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js'
];

// Instalación del service worker
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Archivos cacheados');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activación del service worker
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Borrando cache viejo:', cache);
            return caches.delete(cache);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Manejo de solicitudes
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(error => {
      console.warn('[ServiceWorker] Fallo en fetch:', error);
    })
  );
});
