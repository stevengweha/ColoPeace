// ==========================================
// public/sw.js - Service Worker ColoPeace v7
// ==========================================

const CACHE_NAME = '444-cache-test-v7-564645'; 

// --- SYNC INTER-APP ---
// --- SYNC INTER-APP (NOUVELLE MÉTHODE) ---
const bc = new BroadcastChannel('notif_filter');
let lastNotificationTag = null;

bc.onmessage = (event) => {
  if (event.data && event.data.type === 'STOP_NOTIFICATION') {
    lastNotificationTag = event.data.tag;
    // On garde le blocage actif pendant 5 secondes
    setTimeout(() => { lastNotificationTag = null; }, 5000);
  }
};

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

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    // CONDITION A : Est-ce qu'une fenêtre est visible au premier plan ?
    const isAppActive = windowClients.some(client => client.visibilityState === 'visible');

    // CONDITION B : Est-ce qu'on a reçu un STOP_NOTIFICATION récemment pour ce tag ?
    const isBlockedByApp = (lastNotificationTag === notificationTag);

    if (isAppActive || isBlockedByApp) {
      console.log("🚫 Notification Push ignorée : L'utilisateur est déjà sur l'app.");
      return; 
    }

    // Si on est ici, l'app est vraiment fermée ou en arrière-plan
    return self.registration.showNotification(data.title || "Nouveau message", {
      body: data.body || "",
      icon: '/logo.png',
      badge: '/logo.png',
      tag: notificationTag, // Important pour regrouper les messages
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