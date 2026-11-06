# Touché : ce qu'il reste à faire de ton côté

## À chaque nouvelle version

1. Si un nouveau fichier `supabase/etape-N-....sql` est apparu, colle-le dans Supabase > SQL Editor, puis Run.
2. `npm install` si `package.json` a changé.
3. Version web (iPhone et ordinateur) : `npm run web`.
4. Pousse le code :
   ```
   git add .
   git commit -m "Ce qui a changé"
   git push
   ```
   La version web est en ligne une à deux minutes après, sur https://pideillou.github.io/touche/app/.
5. Appli Android : `npm run apk`, puis publie l'APK avec le workflow GitHub « Publier l'APK » (onglet Actions), avec le lien du build donné par expo.dev et un nouveau numéro de version.

## Plateformes

- Android : l'APK, téléchargeable depuis le site. La position continue d'être partagée écran verrouillé.
- iPhone : uniquement la version web (PWA), à ajouter sur l'écran d'accueil depuis Safari. L'écran doit rester allumé pendant la partie.
