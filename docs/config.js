// Réglages du site de Touché. Remplis-les quand l'appli est publiée (voir A-FAIRE.md).
window.TOUCHE = {
  // Ouvre la dernière mise à jour du canal « amis » dans Expo Go (reste valable après chaque « npm run partager »)
  lienExpoGo: 'exp://u.expo.dev/18c3701b-de76-4a58-b6f6-30e1ba9a3f35?runtime-version=exposdk%3A58.0.0&channel-name=amis',
  // Lien direct vers l'APK Android. Laisse vide pour utiliser automatiquement
  // le fichier touche.apk de la dernière release GitHub du dépôt.
  lienApk: '',
  // Adresse e-mail de contact, codée pour que les robots qui aspirent les pages
  // ne la lisent pas : elle n'est décodée que quand un visiteur clique sur le bouton.
  // Pour la changer : l'adresse écrite à l'envers, puis encodée en base64.
  contactCode: 'bW9jLmxpYW1nQHVvbGxpZWRpcA==',
};
