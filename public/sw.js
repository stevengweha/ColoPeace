// ==========================================
// public/sw.js - Service Worker ColoPeace
// ==========================================

const CACHE_NAME = 'colopeace-v2'; // Augmente ce chiffre (v3, v4...) pour forcer un nettoyage

// 1. GESTION DES FICHIERS (Corrige la mise à jour et la lenteur)
self.addEventListener('fetch', (event) => {
  // On ne touche pas aux appels API et aux Sockets
  if (event.request.url.includes('/api/') || event.request.url.includes('socket.io')) {
    return;
  }

  // On demande toujours au réseau en priorité
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // On met à jour le cache avec la version fraîche
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return response;
      })
      .catch(() => caches.match(event.request)) // Si hors-ligne, on utilise le cache
  );
});

// 2. INSTALLATION & ACTIVATION
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  // Supprime les anciens caches périmés
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  event.waitUntil(clients.claim());
});

// 3. ÉCOUTE DES NOTIFICATIONS PUSH
self.addEventListener('push', (event) => {
  let data = { title: 'ColoPeace', body: 'Nouveau message reçu' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'ColoPeace', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: data.type || 'default',
    renotify: true,
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 4. CLIC SUR LA NOTIFICATION
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const url = event.notification.data.url;
      for (let client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});