self.addEventListener('install', function(event) {
  console.log('Service Worker instalando...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activado.');
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).catch(function() {
      return new Response("Estás offline. Verificá tu conexión.");
    })
  );
});