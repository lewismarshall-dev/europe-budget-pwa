'use strict';

// DISCLOSURE: I don't really know how this workds... but it does

const cacheName = 'v1';

self.addEventListener('activate', (e) => {
  // Clear unwated caches
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== cacheName) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  if (!(e.request.url.indexOf('http') === 0)) return; // skip the request. if request is not made with http protocol

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Make copy clone of response
        const resClone = res.clone();
        // Open a cache
        caches.open(cacheName).then((cache) => {
          // Add response to cache
          cache.put(e.request, resClone);
        });
        return res;
      })
      .catch((er) => {
        caches.match(e.request).then((res) => res);
      })
  );
});
