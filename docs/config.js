// Réglages du site de Touché. Remplis-les quand l'appli est publiée (voir A-FAIRE.md).
window.TOUCHE = {
  // Lien de la mise à jour pour Expo Go, affiché sur expo.dev après « npm run partager »
  lienExpoGo: 'https://expo.dev/preview/update?message=Version+pour+jouer+entre+amis&updateRuntimeVersion=exposdk%3A58.0.0&createdAt=2026-11-05T07%3A58%3A40.036Z&slug=exp&projectId=18c3701b-de76-4a58-b6f6-30e1ba9a3f35&group=9a4a339a-5895-4cb4-88f7-aa6a1de825ce',
  // Lien direct vers l'APK Android. Laisse vide pour utiliser automatiquement
  // le fichier touche.apk de la dernière release GitHub du dépôt.
  lienApk: '',
  // Adresse e-mail de contact, codée pour que les robots qui aspirent les pages
  // ne la lisent pas : elle n'est décodée que quand un visiteur clique sur le bouton.
  // Pour la changer : l'adresse écrite à l'envers, puis encodée en base64.
  contactCode: 'bW9jLmxpYW1nQHVvbGxpZWRpcA==',
};
