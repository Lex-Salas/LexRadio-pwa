// Service Worker para LEX Radio PWA
const CACHE_NAME = 'lex-radio-v1.2.0';
const OFFLINE_URL = '/offline.html';

// Recursos críticos para cachear
const CRITICAL_RESOURCES = [
  '/',
  '/offline.html',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css',
  'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js',
  'logo-lexradio.png',
  'apple-touch-icon.png'
];

// Recursos de programas (imágenes)
const PROGRAM_IMAGES = [
  'artista.png',
  'lextronica.png',
  'startpop.png',
  'concierto.png',
  'retrovibe.png',
  'RAMix_Total_Poster_Web.png'
];

// URLs que siempre deben ir a la red
const NETWORK_ONLY = [
  'https://stream.zeno.fm/',
  'https://stream.zeno.fm/metadata/',
  'https://cdn.onesignal.com/',
  'https://embed.tawk.to/'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Critical resources cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache resources:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Tomar control de todas las páginas
      self.clients.claim()
    ])
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones que no son GET
  if (request.method !== 'GET') return;

  // URLs que siempre van a la red
  if (NETWORK_ONLY.some(networkUrl => request.url.includes(networkUrl))) {
    return;
  }

  // Estrategia para el documento principal
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Estrategia para recursos estáticos
  if (isStaticResource(request)) {
    event.respondWith(handleStaticResource(request));
    return;
  }

  // Estrategia para metadatos de música
  if (request.url.includes('metadata')) {
    event.respondWith(handleMetadataRequest(request));
    return;
  }

  // Estrategia para imágenes
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }
});

// Manejo de peticiones de navegación
async function handleNavigationRequest(request) {
  try {
    // Intentar obtener de la red primero
    const networkResponse = await fetch(request);
    
    // Si la respuesta es exitosa, cachearla
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for navigation, serving from cache');
    
    // Si falla, intentar servir desde cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no hay cache, servir página offline
    return caches.match(OFFLINE_URL);
  }
}

// Manejo de recursos estáticos (Cache First)
async function handleStaticResource(request) {
  try {
    // Buscar primero en cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no está en cache, obtener de la red
    const networkResponse = await fetch(request);
    
    // Cachear la respuesta
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch static resource:', error);
    throw error;
  }
}

// Manejo de metadatos (Network First con timeout)
async function handleMetadataRequest(request) {
  try {
    // Crear una promesa con timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), 5000);
    });
    
    // Intentar obtener de la red con timeout
    const networkResponse = await Promise.race([
      fetch(request),
      timeoutPromise
    ]);
    
    if (networkResponse.ok) {
      // Cachear metadatos por tiempo limitado
      const cache = await caches.open(CACHE_NAME);
      const responseToCache = networkResponse.clone();
      
      // Establecer headers de expiración
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Metadata network failed, checking cache');
    
    // Intentar servir desde cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Verificar si el cache no es muy viejo (máximo 30 segundos)
      const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
      const now = Date.now();
      const cacheAge = now - parseInt(cacheTimestamp || '0');
      
      if (cacheAge < 30000) { // 30 segundos
        return cachedResponse;
      }
    }
    
    // Retornar datos por defecto si todo falla
    return new Response(JSON.stringify({
      title: 'LEX Radio - En vivo',
      artist: 'Información no disponible'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Manejo de imágenes (Cache First con fallback)
async function handleImageRequest(request) {
  try {
    // Buscar en cache primero
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Obtener de la red
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cachear la imagen
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Image failed to load:', request.url);
    
    // Retornar imagen placeholder si es una imagen de programa
    if (PROGRAM_IMAGES.some(img => request.url.includes(img))) {
      return createPlaceholderImage();
    }
    
    throw error;
  }
}

// Verificar si es un recurso estático
function isStaticResource(request) {
  const url = new URL(request.url);
  const extension = url.pathname.split('.').pop();
  const staticExtensions = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2'];
  
  return staticExtensions.includes(extension) || 
         request.url.includes('fonts.googleapis.com') ||
         request.url.includes('cdn.jsdelivr.net');
}

// Crear imagen placeholder
function createPlaceholderImage() {
  const svg = `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0f0c29"/>
      <rect x="10" y="10" width="280" height="180" fill="none" stroke="#00f0ff" stroke-width="2"/>
      <text x="150" y="100" text-anchor="middle" fill="#00f0ff" font-family="Arial" font-size="16">
        LEX Radio
      </text>
      <text x="150" y="125" text-anchor="middle" fill="#ccc" font-family="Arial" font-size="12">
        Imagen no disponible
      </text>
    </svg>
  `;
  
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

// Manejo de notificaciones push
self.addEventListener('push', event => {
  console.log('[SW] Push received');
  
  const options = {
    body: 'Nueva canción reproduciéndose en LEX Radio',
    icon: 'logo-lexradio.png',
    badge: 'logo-lexradio.png',
    tag: 'lex-radio-update',
    requireInteraction: false,
    actions: [
      {
        action: 'play',
        title: 'Reproducir',
        icon: 'icons/play-action.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: 'icons/close-action.png'
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.title = data.title || 'LEX Radio';
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('LEX Radio', options)
  );
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'play') {
    // Abrir la app y reproducir
    event.waitUntil(
      clients.openWindow('/?action=play')
    );
  } else if (event.action !== 'close') {
    // Abrir la app normalmente
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Sincronización en background
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'update-metadata') {
    event.waitUntil(
      fetch('https://stream.zeno.fm/metadata/lo1dx1b1e52tv.json')
        .then(response => response.json())
        .then(data => {
          // Enviar datos actualizados a todas las pestañas abiertas
          return self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'METADATA_UPDATE',
                data: data
              });
            });
          });
        })
        .catch(error => {
          console.error('[SW] Sync failed:', error);
        })
    );
  }
});

// Manejo de mensajes desde la aplicación
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Manejo de errores globales
self.addEventListener('error', event => {
  console.error('[SW] Global error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker loaded successfully');
