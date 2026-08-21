/**
 * @fileoverview Service Worker de Sport Management (PWA).
 *
 * Estrategias:
 *  - Navegaciones (HTML): network-first con fallback al shell cacheado y, si no,
 *    a /offline.html. Así la app abre sin conexión y las rutas SPA siguen funcionando.
 *  - Assets propios con hash (/assets/*.js|css) e iconos: cache-first (inmutables).
 *  - Fuentes/CSS de CDN: stale-while-revalidate en una caché aparte.
 *
 * SEGURIDAD / PRIVACIDAD: nunca se cachean respuestas de datos.
 * Se ignoran peticiones no-GET, las que llevan cabecera Authorization/Cookie de sesión,
 * las de /api/* y las de Supabase u otros backends. Los datos de jugadores, partidos,
 * informes médicos, etc. no deben quedar persistidos en el dispositivo por el SW.
 */

const VERSION = 'v2';
const SHELL_CACHE = `sm-shell-${VERSION}`;
const ASSET_CACHE = `sm-assets-${VERSION}`;
const CDN_CACHE = `sm-cdn-${VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, CDN_CACHE];

/** Recursos mínimos para que la app arranque sin red */
const SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

/** Orígenes de terceros cuyos recursos estáticos sí podemos cachear */
const CDN_ORIGINS = [
  'https://cdnjs.cloudflare.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

/** Rutas de datos que NUNCA se cachean */
const NEVER_CACHE_PATHS = ['/api/', '/auth/', '/rest/', '/functions/', '/storage/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // addAll falla entero si un recurso falta: se añaden de una en una y se tolera el fallo.
      .then((cache) => Promise.all(
        SHELL_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('sm-') && !CURRENT_CACHES.includes(key))
            .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/** Permite a la app forzar la activación de una versión nueva */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/** ¿Es una petición de datos que no debemos tocar? */
function isDataRequest(request, url) {
  if (request.method !== 'GET') return true;
  if (request.headers.has('Authorization')) return true;
  if (url.searchParams.has('apikey') || url.searchParams.has('access_token')) return true;
  if (NEVER_CACHE_PATHS.some((path) => url.pathname.startsWith(path))) return true;
  // Cualquier backend externo (Supabase, Cloud Functions, APIs de federación…)
  if (url.origin !== self.location.origin && !CDN_ORIGINS.includes(url.origin)) return true;
  return false;
}

/** Assets de build con hash e iconos: inmutables */
function isImmutableAsset(url) {
  return url.origin === self.location.origin && (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/logos/') ||
    /\.(?:js|css|woff2?|ttf|png|jpe?g|svg|webp|ico)$/.test(url.pathname)
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && response.type !== 'opaque') {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  return cached || network || fetch(request);
}

/** Navegaciones SPA: red primero, shell cacheado como respaldo */
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put('/', response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match('/')) ||
           (await cache.match('/index.html')) ||
           (await cache.match('/offline.html')) ||
           new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isDataRequest(request, url)) return; // se deja pasar a la red sin intervenir

  if (CDN_ORIGINS.includes(url.origin)) {
    event.respondWith(staleWhileRevalidate(request, CDN_CACHE));
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(
      cacheFirst(request, ASSET_CACHE).catch(() =>
        caches.match(request).then((cached) => cached || Response.error())
      )
    );
  }
});
