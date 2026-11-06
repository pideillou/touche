// Complète app.json : la version visée par l'appli Android est une empreinte de son code natif.
module.exports = ({ config }) => ({
  ...config,
  runtimeVersion: { policy: 'fingerprint' },
});
