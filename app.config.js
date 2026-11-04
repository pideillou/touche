// Complète app.json.
// Version de l'appli que les mises à jour doivent viser :
// - pour Expo Go (jouer gratuitement entre amis) : la version du SDK, seule acceptée par Expo Go ;
// - pour les builds EAS (TOUCHE_CIBLE=build, voir eas.json) : une empreinte du code natif.
const pourUnBuild = process.env.TOUCHE_CIBLE === 'build';

module.exports = ({ config }) => ({
  ...config,
  runtimeVersion: pourUnBuild ? { policy: 'fingerprint' } : { policy: 'sdkVersion' },
});
