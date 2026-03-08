const CACHE_NAME = 'renfe-dashboard-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/estaciones.geojson',
    'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css',
    'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Service Worker: Cacheando archivos');
                return cache.addAll(urlsToCache);
            })
            .catch((err) => console.error('Error al cachear:', err))
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Limpiando caché antiguo');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip API requests (always fetch fresh)
    if (event.request.url.includes('tiempo-real.largorecorrido.renfe.com') ||
        event.request.url.includes('corsproxy.io') ||
        event.request.url.includes('allorigins.win')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
            .catch(() => {
                // Offline fallback
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});
