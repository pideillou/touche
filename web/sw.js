/* eslint-env serviceworker */
// Service worker de la version web : reçoit les notifications de Touché.
// Il ne met rien en cache, pour que chaque ouverture charge toujours la dernière version.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evenement) => evenement.waitUntil(self.clients.claim()));

self.addEventListener('push', (evenement) => {
  let donnees = {};
  try {
    donnees = evenement.data ? evenement.data.json() : {};
  } catch (e) {
    donnees = { titre: 'Touché', texte: evenement.data ? evenement.data.text() : '' };
  }
  evenement.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      // Touché est déjà ouvert à l'écran : l'appli affiche elle-même la fenêtre, pas besoin de notification
      if (fenetres.some((f) => f.visibilityState === 'visible')) return undefined;
      return self.registration.showNotification(donnees.titre || 'Touché', {
        body: donnees.texte || '',
        icon: '/touche/app/icone-192.png',
        badge: '/touche/app/icone-192.png',
        tag: donnees.etiquette || 'touche',
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: { lien: donnees.lien || '/touche/app/' },
      });
    }),
  );
});

self.addEventListener('notificationclick', (evenement) => {
  evenement.notification.close();
  const lien = (evenement.notification.data && evenement.notification.data.lien) || '/touche/app/';
  evenement.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      const ouverte = fenetres.find((f) => f.url.indexOf('/touche/app/') !== -1);
      if (ouverte) return ouverte.focus().then((f) => (f.navigate ? f.navigate(lien) : f));
      return self.clients.openWindow(lien);
    }),
  );
});
