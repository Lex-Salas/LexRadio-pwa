
const CACHE_NAME = "lexradio-v4";

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
  "./RAMix_Total_Poster_Web.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  if (url.includes("/live")) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.includes("status-json.xsl")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(event.request, clone)
          );
          return response;
        })
        .catch(() => cached);
    })
  );
});
