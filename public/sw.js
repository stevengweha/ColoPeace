// ==========================================
// public/sw.js - Service Worker ColoPeace v7
// ==========================================

const CACHE_NAME = 'colopeace-v9-stable'; 

// --- SYNC INTER-APP ---
let lastNotificationTag = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'STOP_NOTIFICATION') {
    lastNotificationTag = event.data.tag;
    // On garde le blocage actif pendant 5 secondes pour être large
    setTimeout(() => { lastNotificationTag = null; }, 5000);
  }
});

// 1. GESTION DES FICHIERS (FETCH)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/') || event.request.url.includes('socket.io')) return;
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchRes.clone());
          return fetchRes;
        });
      });
    })
  );
});

// 2. INSTALLATION & ACTIVATION
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => { if (key !== CACHE_NAME) return caches.delete(key); })
    ))
  );
  event.waitUntil(clients.claim());
});

// 3. ÉCOUTE DES NOTIFICATIONS PUSH
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "ColoPeace", body: event.data ? event.data.text() : "" };
  }

  const notificationTag = data.conversationId?.toString() || 'chat-notif';

  // 🚫 CONDITION 1 : Le signal de l'App (STOP_NOTIFICATION)
  if (lastNotificationTag && notificationTag === lastNotificationTag) {
    console.log("🚫 Doublon bloqué par postMessage");
    return;
  }

  const promiseChain = clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then((windowClients) => {
      // 🚫 CONDITION 2 : L'app est-elle visible ?
      const isVisible = windowClients.some(c => c.visibilityState === 'visible' || c.focused);
      
      if (isVisible) {
        console.log("🚫 Doublon bloqué : App au premier plan");
        return;
      }

      // Si on arrive ici, l'app est fermée : on affiche
      return self.registration.showNotification(data.title || "Message", {
        body: data.body || "",
        icon: '/logo.png',
        badge: '/logo.png',
        tag: notificationTag,
        renotify: true,
        data: { url: data.url || '/' }
      });
    });

  event.waitUntil(promiseChain);
});

// 4. CLIC
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