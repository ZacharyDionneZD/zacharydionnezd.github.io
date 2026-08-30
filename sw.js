const CACHE_NAME = 'v1'; // Changez ici à chaque modification (v2, v3...)

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles.css',
  '/app.js',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-192x192-maskable.png',
  '/icons/icon-512x512-maskable.png',
  '/sounds/A4.opus',
  '/sounds/Asharp4.opus',
  '/sounds/B4.opus',
  '/sounds/C4.opus',
  '/sounds/Csharp4.opus',
  '/sounds/D4.opus',
  '/sounds/Dsharp4.opus',
  '/sounds/E4.opus',
  '/sounds/F4.opus',
  '/sounds/Fsharp4.opus',
  '/sounds/G4.opus',
  '/sounds/Gsharp4.opus'
];

// 1. Installation : Mise en cache initiale
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. Activation : SUPPRESSION DE L'ANCIEN CACHE
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si le cache trouvé n'est pas la version actuelle, on le détruit
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SW] Suppression de l\'ancien cache :', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Interception : Sert le cache, sinon le réseau
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response; // Trouvé dans le cache actuel
      }

      // Si c'est un nouveau fichier pas encore dans la liste initiale, on le télécharge
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});