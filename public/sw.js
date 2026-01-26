// ==========================================
// public/sw.js - Service Worker ColoPeace v12-21
// ==========================================

const CACHE_NAME = 'colopeace-V1-26/01/2026'; 

// --- SYNC INTER-APP (SÉCURISÉ) ---
let lastNotificationTag = null;
try {
  const bc = new BroadcastChannel('notif_filter');
  bc.onmessage = (event) => {
    if (event.data && event.data.type === 'STOP_NOTIFICATION') {
      lastNotificationTag = String(event.data.tag);
      // Nettoyage automatique après 5s
      setTimeout(() => { lastNotificationTag = null; }, 5000);
    }
  };
} catch (e) {
  console.log("BroadcastChannel non supporté sur ce navigateur.");
}

// 1. GESTION DES FICHIERS (FETCH) - Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  // Ignorer les appels API et Sockets
  if (event.request.url.includes('/api/') || event.request.url.includes('socket.io')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // On tente toujours de mettre à jour le cache depuis le réseau
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // On ne met en cache que les réponses valides (200)
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Si réseau HS, on espère avoir le cache
            return cachedResponse;
          });

        // Retourne le cache immédiatement, sinon attend le réseau
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// 2. INSTALLATION & ACTIVATION
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🗑️ Ancien cache supprimé :", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. ÉCOUTE DES NOTIFICATIONS PUSH
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "ColoPeace", body: event.data.text() };
  }

  const pushTag = data.conversationId ? String(data.conversationId) : 'chat-notif';

  const promiseChain = self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then((windowClients) => {
      const isAppActive = windowClients.some(client => client.visibilityState === 'visible');
      const isBlocked = (lastNotificationTag !== null && String(lastNotificationTag) === pushTag);

      // Ne pas afficher si l'app est active ou bloquée par BroadcastChannel
      if (isAppActive || isBlocked) return;

      return self.registration.showNotification(data.title || "ColoPeace 💬", {
        body: data.body || "Nouveau message reçu",
        tag: pushTag,
        renotify: true,
        data: { url: data.url || '/' },
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [100, 50, 100]
      });
    });

  event.waitUntil(promiseChain);
});

// 4. CLIC SUR NOTIFICATION
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si un onglet est déjà ouvert sur l'URL, on lui donne le focus
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Sinon on ouvre une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});