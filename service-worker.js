const CACHE_NAME = 'lexradio-v5';
const APP_SHELL = [
  './','./index.html','./manifest.json','./logo-lexradio.png',
  './css/style.css','./css/lex-platform.css','./js/main.js','./js/lex-platform.js',
  './data/programacion.json','./data/replay.json',
  './artista.jpg','./lextronica.jpg','./startpop.jpg','./concierto.jpg','./retrovibe.jpg',
  './RAMix_Total_Poster_Web.jpg','./LEX.jpg','./Jessica.jpg'
];
const NEVER_CACHE = ['status-json.xsl','stream.zeno.fm','/live','itunes.apple.com'];
const shouldNotCache = url => NEVER_CACHE.some(pattern => url.includes(pattern));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  if (shouldNotCache(req.url)) {
    event.respondWith(fetch(req, {cache:'no-store'}));
    return;
  }
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(res => {
      const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy)); return res;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
    if (res && res.ok && new URL(req.url).origin === self.location.origin) {
      const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,copy));
    }
    return res;
  }).catch(()=>new Response('Offline',{status:503,statusText:'Offline'}))));
});