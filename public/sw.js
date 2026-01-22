// ==========================================
// public/sw.js - Service Worker ColoPeace
// ==========================================

// 1. Installation & Activation Immédiate
self.addEventListener('install', (event) => {
  // Force le SW à prendre le contrôle immédiatement sans attendre la fermeture des onglets
  self.skipWaiting();
  console.log('✅ Service Worker : Installé');
});

self.addEventListener('activate', (event) => {
  // Prend le contrôle de tous les clients (onglets) ouverts
  event.waitUntil(clients.claim());
  console.log('🚀 Service Worker : Activé et prêt');
});

// 2. ÉCOUTE DES NOTIFICATIONS PUSH
self.addEventListener('push', function(event) {
  console.log('🔔 Signal Push reçu !');

  let data = { title: 'ColoPeace', body: 'Nouveau message reçu' };

  // Tentative de parsing du JSON envoyé par le serveur
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn('⚠️ Payload non-JSON reçu, utilisation du texte brut');
      data = { title: 'ColoPeace', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    //icon: '/logo.png',         // Assure-toi que public/logo.png existe
    badge: '/logo.png',        // Icône monochrome pour la barre de statut Android/Windows
    //vibrate: [200, 100, 200],  // Pattern de vibration
    tag: data.type || 'default', // Évite d'empiler 50 notifs identiques
    renotify: true,            // Fait vibrer même si le tag est identique
    data: {
      url: data.url || '/'     // L'URL vers laquelle naviguer au clic
    },
    actions: [
      { action: 'open', title: 'Voir' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ColoPeace', options)
  );
});

// 3. GESTION DU CLIC SUR LA NOTIFICATION
self.addEventListener('notificationclick', function(event) {
  const notification = event.notification;
  const targetUrl = notification.data.url;

  // Fermer la notification immédiatement
  notification.close();

  // Gérer la redirection
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Si un onglet de l'app est déjà ouvert sur la bonne URL, on lui donne le focus
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // 2. Sinon, on ouvre un nouvel onglet
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 4. GESTION DES MESSAGES INTERNES (Optionnel)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});