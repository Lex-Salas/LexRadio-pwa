const CACHE_NAME = "lexradio-v3";

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
  "https://i.imgur.com/BhXCsFa.png"
];

// INSTALACIÓN
self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ACTIVACIÓN (limpiar caches viejos)
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
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
  // No interferir con peticiones de rango (audio streaming)
  if (event.request.headers.has("range")) {
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
          // Si no hay red ni cache, devolvemos algo por defecto opcional
          return new Response("Offline", { status: 503, statusText: "Offline" });
        });
    })
  );
});
