// ==========================================
// public/sw.js - Service Worker ColoPeace v6
// ==========================================

const CACHE_NAME = 'colopeace-v6'; 

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

// --- SYNC INTER-APP : BLOQUEUR DE DOUBLONS ---
let lastNotificationTag = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'STOP_NOTIFICATION') {
    lastNotificationTag = event.data.tag;
    console.log("📩 Signal reçu : Blocage du push système pour", lastNotificationTag);
    // On nettoie après 3 secondes
    setTimeout(() => { lastNotificationTag = null; }, 3000);
  }
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

// 3. ÉCOUTE DES NOTIFICATIONS PUSH
self.addEventListener('push', (event) => {
  let data = { title: 'ColoPeace', body: 'Nouveau message reçu' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data = { title: 'ColoPeace', body: event.data.text() }; }
  }

  const notificationTag = data.conversationId || 'chat-notif';

  // --- FILTRE 1 : postMessage de App.js ---
  if (notificationTag === lastNotificationTag) {
    console.log("🚫 Doublon bloqué par signal postMessage de l'App.");
    return;
  }

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    // --- FILTRE 2 : Visibilité de la fenêtre ---
    const isAppFocused = windowClients.some(client => client.focused || client.visibilityState === 'visible');

    if (isAppFocused) {
      console.log("🚫 App déjà au premier plan, pas de notif système.");
      return;
    }

    // Si on arrive ici, l'app est fermée ou en fond : on affiche.
    return self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: notificationTag,
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