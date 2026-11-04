# Touché : ce qu'il te reste à faire, dans l'ordre

Coche au fur et à mesure. Les détails de chaque étape sont dans le README.

## 1. Préparer ton PC

- [ ] Vérifie que Node.js est installé : `node -v` dans un terminal. Sinon, installe la version LTS depuis nodejs.org.
- [ ] Vérifie que Git est installé : `git --version`. Sinon, installe-le depuis git-scm.com.
- [ ] Dans le dossier `Touché`, lance `npm install`.

## 2. Supabase (la base de données)

- [ ] Crée un compte sur supabase.com, puis un projet dans la région Paris (eu-west-3).
- [ ] Copie `.env.example` en `.env` et remplis l'URL du projet et la clé publique (Project Settings, rubrique API).
- [ ] Dans SQL Editor, colle tout `supabase/schema.sql` et clique sur Run. Ce fichier contient déjà les étapes 2, 3 et 4.
- [ ] Dans Authentication, rubrique Sign In / Providers : active Allow anonymous sign-ins.
- [ ] Au même endroit, ouvre Email et désactive Confirm email.

## 3. Tester sur ton téléphone

- [ ] Installe Expo Go sur ton téléphone.
- [ ] Lance `npx expo start` (ou `npx expo start --tunnel` si le Wi-Fi bloque) et scanne le QR code.
- [ ] Crée une partie, puis rejoins-la avec un deuxième téléphone pour vérifier que tout marche.

## 4. Expo (pour publier l'appli)

- [ ] Crée un compte sur expo.dev, puis une organisation, par exemple `touche-limoges`.
- [ ] Dans `app.json`, ajoute `"owner": "touche-limoges",` juste après `"expo": {`.
- [ ] Lance `npx eas-cli@latest login`, puis `npx eas-cli@latest init`. Si on te le demande, copie l'identifiant du projet dans `app.json` (README, section Version installable).
- [ ] Déclare les variables Supabase pour les APK :
  `npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_URL --value <ton URL> --environment preview --visibility plaintext`
  puis la même commande avec `EXPO_PUBLIC_SUPABASE_KEY` et ta clé publique.

## 5. GitHub (le code et le site)

- [ ] Crée un dépôt public nommé `touche` sur github.com. Il doit être public pour que GitHub Pages soit gratuit.
- [ ] Vérifie que `.env` n'apparaît pas dans `git status` après le `git add` (il est exclu par `.gitignore`).
- [ ] Dans le dossier `Touché` :
  ```
  git init
  git add .
  git commit -m "Première version de Touché"
  git branch -M main
  git remote add origin https://github.com/<ton-pseudo>/touche.git
  git push -u origin main
  ```
- [ ] Sur GitHub : Settings, Pages, Source « Deploy from a branch », branche `main`, dossier `/docs`. Le site sera à l'adresse `https://<ton-pseudo>.github.io/touche/`.

## 6. Publier l'appli

- [ ] iPhone et Expo Go : lance `npm run partager`. Sur la page de la mise à jour (expo.dev), copie le lien d'aperçu, celui du QR code.
- [ ] Android : lance `npm run apk`. Quand le build est fini, télécharge le `.apk` depuis la page du build et renomme-le `touche.apk`.
- [ ] Sur GitHub : Releases, Draft a new release, tag `v1.0.0`, ajoute `touche.apk` en pièce jointe, puis Publish. Le bouton du site pointe tout seul vers ce fichier.
- [ ] Dans `docs/config.js`, colle le lien Expo Go dans `lienExpoGo` et ton moyen de contact dans `contact`.
- [ ] `git add .`, `git commit -m "Liens d'installation"`, `git push`.
- [ ] Ouvre le site sur ton téléphone et vérifie les deux boutons.

## 7. Inviter tes potes

- [ ] Envoie-leur l'adresse du site.
- [ ] Potes sur iPhone : ils créent un compte Expo et t'envoient leur e-mail. Invite-les dans l'organisation (expo.dev, réglages de l'organisation, Members).
- [ ] Potes sur Android : ils installent l'APK depuis le site, rien d'autre à faire.
- [ ] Avant de jouer, ouvre Supabase : si le projet est en pause (après une semaine sans partie), clique sur Restore.

## À chaque nouvelle version

- [ ] `npm run partager` pour Expo Go.
- [ ] `npm run apk`, puis une nouvelle release GitHub avec le nouveau `touche.apk` (tag `v1.0.1`, `v1.0.2`…).
- [ ] `git add .`, `git commit`, `git push`.
