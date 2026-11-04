// Envoie les deux variables Supabase du fichier .env vers EAS,
// pour les APK (preview) et la version de développement (development).
// Usage : npm run variables:eas (après « eas login » et « eas init »)
const fs = require('fs');
const { execFileSync } = require('child_process');

const lignes = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
const valeurs = {};
for (const ligne of lignes) {
  const egal = ligne.indexOf('=');
  if (egal > 0 && !ligne.trim().startsWith('#')) valeurs[ligne.slice(0, egal).trim()] = ligne.slice(egal + 1).trim();
}

for (const nom of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_KEY']) {
  const valeur = valeurs[nom];
  if (!valeur || valeur.includes('ton-projet') || valeur === 'ta-cle-publique') {
    console.error(`${nom} n'est pas rempli dans .env (README, étape 2).`);
    process.exit(1);
  }
  execFileSync(
    'npx',
    ['eas-cli@latest', 'env:set', '--name', nom, '--value', valeur, '--environment', 'preview', '--environment', 'development', '--visibility', 'plaintext', '--non-interactive'],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
  console.log(`${nom} envoyé à EAS.`);
}
