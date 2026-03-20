// sw.js - Service Worker CORREGIDO
const CACHE_VERSION = 'v2.3.2'; // ← Debe coincidir con version.js
const CACHE_NAME = `cafe-valdore-${CACHE_VERSION}`;

// Recursos para cachear - ACTUALIZADO con tus archivos reales
const ASSETS_TO_CACHE = [
  // Páginas HTML principales
  '/',
  '/index.html',
  '/contacto.html',
  '/historia.html',
  '/pedidos.html',
  '/auth.html',
  '/admin-login.html',
  '/admin-inventario.html',

  // CSS REALES que usas
  '/styles.css',
  '/formulario.css',
  '/carrito.css',
  '/cerrarcarrito.css',
  '/contacto.css',
  '/productos.css',
  '/admin-inventario.css',

  // JavaScript
  '/main.js',
  '/firebaseconfig.js',
  '/chat.js',
  '/version.js',
  '/cargarPedidos.js',
  '/cargarProductos.js',
  '/admin-inventario.js',

  // Imágenes WebP
  '/bourbon.webp',
  '/caturra.webp',
  '/logo.webp',
  '/promocion.webp',
  '/superpromocion.webp',
  '/fondocafe.webp',
  '/fondo-contacto.webp',

  // Favicon
  '/favicon.ico'
];

// INSTALACIÓN - Cachear recursos críticos
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker instalándose...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cacheando recursos esenciales');
        // Usa addAll pero con manejo de errores mejorado
        return Promise.all(
          ASSETS_TO_CACHE.map(url => {
            return cache.add(url).catch(error => {
              console.warn(`⚠️ No se pudo cachear: ${url}`, error);
            });
          })
        );
      })
      .then(() => {
        console.log('✅ Instalación completada');
        return self.skipWaiting();
      })
  );
});

// ACTIVACIÓN - Limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('🎯 Service Worker activado');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('cafe-valdore-')) {
            console.log('🗑️ Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Cache limpio');
      return self.clients.claim();
    })
  );
});

// FETCH - Estrategia Cache First con Network Fallback
self.addEventListener('fetch', (event) => {
  // Solo manejar requests GET
  if (event.request.method !== 'GET') return;
  
  // Excluir APIs externas específicas
  const url = new URL(event.request.url);
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('img.shields.io')) {
    return; // Dejar que pasen directamente
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Si está en cache, devolverlo
        if (cachedResponse) {
          console.log('📨 Sirviendo desde cache:', url.pathname);
          return cachedResponse;
        }

        // Si no está en cache, hacer fetch
        return fetch(event.request)
          .then((response) => {
            // Verificar que la respuesta sea válida
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }

            // Clonar la respuesta para cachear
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Solo cachear recursos de nuestro dominio
                if (url.origin === location.origin) {
                  console.log('💾 Cacheando nuevo recurso:', url.pathname);
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch((error) => {
            console.error('❌ Error en fetch:', error);
            // Podrías servir una página offline aquí
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' },
            });
          });
      })
  );
});

// Mensajes desde la app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});