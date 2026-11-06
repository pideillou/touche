// Transforme l'export web d'Expo (dossier dist-web) en PWA installable,
// puis la copie dans docs/app pour GitHub Pages : https://pideillou.github.io/touche/app/
// Usage : npm run web (lance l'export puis ce script)
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const source = path.join(racine, 'dist-web');
const cible = path.join(racine, 'docs', 'app');
const base = '/touche/app/';

if (!fs.existsSync(path.join(source, 'index.html'))) {
  console.error("Export web introuvable : lance d'abord « npx expo export --platform web --output-dir dist-web ».");
  process.exit(1);
}

// 1. Icônes et manifeste : ce qui permet « Sur l'écran d'accueil » sur iPhone et l'installation sur Android
for (const taille of [180, 192, 512]) {
  fs.copyFileSync(path.join(racine, 'assets', 'pwa', `icone-${taille}.png`), path.join(source, `icone-${taille}.png`));
}
const manifeste = {
  name: 'Touché',
  short_name: 'Touché',
  description: 'Le jeu du chat, dans les vraies rues de ta ville.',
  lang: 'fr',
  start_url: base,
  scope: base,
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F1EFE8',
  theme_color: '#D85A30',
  icons: [
    { src: `${base}icone-192.png`, sizes: '192x192', type: 'image/png' },
    { src: `${base}icone-512.png`, sizes: '512x512', type: 'image/png' },
    { src: `${base}icone-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(source, 'manifest.webmanifest'), `${JSON.stringify(manifeste, null, 2)}\n`);

// 2. Page d'accueil : balises pour l'installation, en français et valides au W3C
let html = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
html = html
  .replace(/\s*<meta httpEquiv="X-UA-Compatible"[^>]*>/, '')
  .replace(/\s*\/>/g, '>')
  .replace(/<!--[\s\S]*?-->\s*/g, '')
  .replace('<title>Touché</title>', [
    '<title>Touché</title>',
    '<meta name="description" content="Touché, le jeu du chat dans les vraies rues de ta ville.">',
    `<link rel="manifest" href="${base}manifest.webmanifest">`,
    `<link rel="apple-touch-icon" href="${base}icone-180.png">`,
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-title" content="Touché">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  ].join('\n    '))
  .replace(/<noscript>[\s\S]*?<\/noscript>/, '<noscript>Touché a besoin de JavaScript pour fonctionner.</noscript>')
  .replace('body {\n        overflow: hidden;\n      }', 'body {\n        overflow: hidden;\n        margin: 0;\n        background: #F1EFE8;\n      }');
fs.writeFileSync(path.join(source, 'index.html'), html);

// 3. Publication : on remplace l'ancienne version de docs/app par la nouvelle
fs.rmSync(cible, { recursive: true, force: true });
fs.cpSync(source, cible, { recursive: true });
console.log(`PWA prête dans docs/app (${base}). Pousse le dossier docs sur GitHub pour la mettre en ligne.`);
