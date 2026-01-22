// ==========================================
// public/sw.js - Service Worker ColoPeace
// ==========================================

const CACHE_NAME = 'colopeace-v4'; 

// 1. GESTION DES FICHIERS
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/') || event.request.url.includes('socket.io')) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// 2. INSTALLATION & ACTIVATION
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  event.waitUntil(clients.claim());
});

// 3. ÉCOUTE DES NOTIFICATIONS PUSH (Avec filtre anti-doublon)
self.addEventListener('push', (event) => {
  let data = { title: 'ColoPeace', body: 'Nouveau message reçu' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'ColoPeace', body: event.data.text() };
    }
  }

  // On vérifie si l'app est ouverte et visible avant d'afficher la notif système
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    // Est-ce qu'une fenêtre de l'app est actuellement au premier plan ?
    const isAppVisible = windowClients.some(client => client.visibilityState === 'visible');

    if (isAppVisible) {
      console.log("🚫 App visible : on laisse le Socket gérer la notif in-app.");
      return; // On stoppe ici, pas de notification système
    }

    // Si l'app est fermée ou en arrière-plan, on affiche la notif
    return self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: data.type || 'default',
      renotify: true,
      data: { url: data.url || '/' }
    });
  });

  event.waitUntil(promiseChain);
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