const CACHE_NAME = "lexradio-v4"; // Aumenta la versión para limpiar cache viejo

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./logo-lexradio.png",

  "./css/style.css",
  "./js/main.js",

  "./artista.png",
  "./lextronica.png",
  "./startpop.png",
  "./concierto.png",
  "./retrovibe.png",
  "./RAMix_Total_Poster_Web.png",
  "./LEX.png",
  "./Jessica.png",

  "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&display=swap",
  "https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css",
  "https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js",
  "https://https://i.imgur.com/m7xt2YZ.png"
];

// URLs que NUNCA deben cachearse
const NEVER_CACHE = [
  'status-json.xsl',
  '/live',
  'itunes.apple.com'
];

// Función para verificar si una URL no debe cachearse
function shouldNotCache(url) {
  return NEVER_CACHE.some(pattern => url.includes(pattern));
}

// INSTALACIÓN
self.addEventListener("install", (event) => {
  console.log("[SW] Install v4");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ACTIVACIÓN (limpiar caches viejos)
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate v4");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Eliminando cache viejo:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // No interferir con peticiones de rango (audio streaming)
  if (event.request.headers.has("range")) {
    return;
  }

  // CRÍTICO: No cachear metadatos ni stream de audio
  if (shouldNotCache(url)) {
    console.log("[SW] Bypass cache para:", url);
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
    );
    return;
  }

  // Navegación (HTML) → estrategia: Network First con fallback a cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match("./index.html");
        })
    );
    return;
  }

  // Otros recursos (CSS, JS, imágenes) → Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          // Cachear respuestas válidas
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return new Response("Offline", { status: 503, statusText: "Offline" });
        });
    })
  );
});
