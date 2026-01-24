// ==========================================
// public/sw.js - Service Worker ColoPeace v7
// ==========================================

const CACHE_NAME = 'test-v11-2024-06-20'; 

// --- SYNC INTER-APP ---
// --- SYNC INTER-APP (NOUVELLE MÉTHODE) ---
const bc = new BroadcastChannel('notif_filter');
let lastNotificationTag = null;

bc.onmessage = (event) => {
  if (event.data && event.data.type === 'STOP_NOTIFICATION') {
    // On force en String pour éviter les soucis de type (ObjectId vs String)
    lastNotificationTag = String(event.data.tag);
    console.log("✅ SW : Tag enregistré pour blocage ->", lastNotificationTag);
    
    // On garde le blocage 5s
    setTimeout(() => { 
      lastNotificationTag = null; 
      console.log("ℹ️ SW : Blocage expiré pour le tag");
    }, 5000);
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
  console.log("📥 Push reçu à l'instant !");
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn("⚠️ Payload non-JSON reçu:", event.data.text());
      data = { title: "ColoPeace", body: event.data.text() };
    }
  }

  const pushTag = data.conversationId ? String(data.conversationId) : 'chat-notif';


  const promiseChain = clients.matchAll({ type: 'window', includeUncontrolled: true })
  .then((windowClients) => {
    const isAppActive = windowClients.some(client => client.visibilityState === 'visible');
    const isBlocked = (lastNotificationTag !== null && String(lastNotificationTag) === pushTag);

    console.log(`🧐 Analyse : Tag=${pushTag} | Bloqué=${isBlocked} | Active=${isAppActive}`);

    // SI L'APP EST OUVERTE OU DÉJÀ NOTIFIÉE PAR SOCKET -> ON SORT
    if (isAppActive || isBlocked) {
      return Promise.resolve(); 
    }

    // SINON ON FORCE L'AFFICHAGE
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