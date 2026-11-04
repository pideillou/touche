# Touché

Le jeu du chat dans les vraies rues de ta ville. Appli mobile Expo (React Native) avec Supabase pour les comptes, les parties et les positions.

Version actuelle : mode chat contaminé, à Limoges. On crée un salon, les amis le rejoignent avec un code de 4 caractères, tout le monde accepte les règles, l'hôte lance. Un chat est tiré au sort (deux au-delà de 10 joueurs), puis chacun voit la carte. Les chats reçoivent la position exacte des souris toutes les 20 secondes. Les souris ne voient jamais les chats.

## Mise en route

Compte une vingtaine de minutes la première fois.

### 1. Installer Node.js et les dépendances

Ouvre un terminal dans le dossier `Touché` (dans VS Code : Terminal > Nouveau terminal) et tape :

```
node -v
```

Si la commande n'est pas reconnue, installe la version LTS depuis nodejs.org, ferme le terminal et rouvre-le. Ensuite :

```
npm install
```

### 2. Créer le projet Supabase

Supabase te fournit la base de données, les comptes joueurs et le temps réel. L'offre gratuite suffit pour développer.

1. Crée un compte sur supabase.com, puis un nouveau projet. Choisis la région Paris (eu-west-3) et garde le mot de passe de la base dans un endroit sûr.
2. Quand le projet est prêt, va dans Project Settings, rubrique API. Note l'URL du projet et la clé publique (appelée publishable key, ou anon key sur les anciens projets). N'utilise jamais la clé secrète (service_role) dans l'appli.
3. Dans le dossier `Touché`, copie le fichier `.env.example` et renomme la copie en `.env`. Remplace les deux valeurs par celles de l'étape précédente.

Le fichier `.env` est listé dans `.gitignore` : il ne partira pas sur GitHub.

### 3. Créer les tables

Dans Supabase, ouvre SQL Editor, colle tout le contenu de `supabase/schema.sql` et clique sur Run. Le script crée les tables, les règles d'accès, les actions du jeu et les trois zones de Limoges (centre-ville, quartier de la gare, IUT du Limousin). Tu peux le relancer, mais il efface les parties existantes.

### 4. Autoriser les joueurs invités

Dans Authentication, rubrique Sign In / Providers, active l'option Allow anonymous sign-ins. Sans elle, l'appli ne peut pas ouvrir de session au premier lancement.

Pendant le développement, ouvre aussi le fournisseur Email dans la même rubrique et désactive Confirm email. Sinon, chaque création de compte attend un clic dans un e-mail de confirmation, et l'envoi d'e-mails de l'offre gratuite est très limité. Pense à la réactiver avant de publier l'appli.

### 5. Lancer l'appli

Installe l'appli Expo Go sur ton téléphone (Play Store ou App Store), puis dans le terminal :

```
npx expo start
```

Scanne le QR code affiché avec Expo Go. Le téléphone et le PC doivent être sur le même réseau Wi-Fi. Si ça bloque (réseau de l'IUT par exemple), utilise `npx expo start --tunnel`.

Pour tester une vraie partie, il faut deux téléphones : l'un crée le salon, l'autre le rejoint avec le code.

## Jouer gratuitement entre amis

Cette méthode ne coûte rien et marche sur Android comme sur iPhone : chacun ouvre Touché dans l'appli Expo Go, et ton PC n'a pas besoin de rester allumé pendant la partie. La seule contrainte : Expo Go ne suit pas la position écran verrouillé. L'appli garde donc l'écran allumé pendant la partie, et chacun doit éviter de verrouiller son téléphone. Une batterie externe n'est pas de trop.

Depuis mai 2026, Expo Go n'ouvre que les projets de ton compte ou d'une organisation dont tu es membre. Tes amis rejoignent donc une organisation Expo gratuite (membres illimités).

### Une seule fois, de ton côté

1. Crée un compte sur expo.dev, puis une organisation, par exemple `touche-limoges`.
2. Dans `app.json`, ajoute le nom de l'organisation juste après `"expo": {` :

```
"owner": "touche-limoges",
```

3. Dans le terminal du dossier :

```
npx eas-cli@latest login
npx eas-cli@latest init
```

4. Sur expo.dev, dans les réglages de l'organisation (Members), invite tes amis avec l'e-mail de leur compte Expo.

### Publier une version

```
npm run partager
```

La commande envoie le code de l'appli chez Expo, avec les valeurs Supabase de ton fichier `.env`. À la fin, elle affiche un lien vers la page de la mise à jour sur expo.dev, avec un QR code. Relance la commande après chaque modification du code : tes amis récupèrent la nouvelle version en rouvrant l'appli.

### Du côté de tes amis

1. Créer un compte gratuit sur expo.dev et accepter l'invitation dans l'organisation.
2. Installer Expo Go (Play Store ou App Store) et s'y connecter avec ce compte.
3. Scanner le QR code de la page de mise à jour, ou ouvrir son lien.

### Limites des offres gratuites

- Expo : jusqu'à 1 000 utilisateurs actifs par mois pour les mises à jour, largement de quoi jouer entre amis.
- Supabase : un projet gratuit se met en pause après une semaine sans activité. Il suffit de cliquer sur Restore dans le tableau de bord avant de jouer.

## Version installable (Android, téléphone en veille)

Dans Expo Go, la position s'arrête dès que le téléphone se verrouille. La version installable (un APK) garde le suivi écran éteint pendant une partie : Android affiche une notification « Partie de Touché en cours », et tout s'arrête à la fin de la partie.

Tout est gratuit. Les APK sont fabriqués dans le cloud d'Expo (EAS Build, 15 builds Android par mois dans l'offre gratuite), sans Android Studio. La carte de l'APK utilise MapLibre avec les cartes d'OpenFreeMap : pas de clé, pas d'inscription, pas de carte bancaire. Dans Expo Go, l'appli garde la carte habituelle, MapLibre n'y existe pas.

Les potes sur iPhone continuent avec Expo Go, écran allumé (voir plus bas pourquoi). Tout le monde peut jouer dans la même partie.

### 1. Compte Expo et projet EAS

Si tu as déjà suivi « Jouer gratuitement entre amis », c'est fait. Sinon, crée un compte sur expo.dev, puis :

```
npx eas-cli@latest login
npx eas-cli@latest init
```

Si `init` indique qu'il ne peut pas écrire l'identifiant du projet à cause de `app.config.js`, copie l'identifiant affiché dans `app.json`, sous `"expo"` :

```
"extra": { "eas": { "projectId": "l-identifiant-affiché" } }
```

### 2. Variables Supabase pour les APK

Le fichier `.env` reste sur ton PC et n'est pas envoyé à Expo. Déclare les deux valeurs pour l'environnement `preview`, celui des APK à partager :

```
npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://ton-projet.supabase.co --environment preview --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_KEY --value ta-cle-publique --environment preview --visibility plaintext
```

Refais-les avec `--environment development` si tu veux aussi la version de développement (étape 4). Tu peux aussi les saisir sur expo.dev, dans les variables d'environnement du projet.

### 3. Fabriquer l'APK pour tes potes

```
npm run apk
```

Le build prend une quinzaine de minutes. À la fin, ouvre la page du build sur expo.dev, télécharge le fichier `.apk` et envoie-le à tes potes (Drive, WhatsApp, Discord…). Chacun l'ouvre sur son téléphone Android et autorise l'installation quand Android le demande.

Cet APK contient toute l'appli : il marche sans ton PC. Après une modification du code, relance `npm run apk` et renvoie le nouveau fichier : il s'installe par-dessus l'ancien.

Pendant la première partie, le téléphone demande l'accès à la position « Toujours ». Sur Android 11 et plus, il ouvre les réglages : il faut choisir « Toujours autoriser ». Sans cet accès, l'appli prévient que la position s'arrête écran éteint.

### 4. Version de développement (pour toi)

Pour tester tes modifications sur ton téléphone sans refaire d'APK à chaque fois :

```
npm run build:android
```

Installe l'APK obtenu, puis lance `npx expo start --dev-client` sur le PC et ouvre l'appli : elle charge le code depuis ton PC, comme Expo Go. Tu ne refais ce build que si tu ajoutes une bibliothèque native ou changes `app.json`.

### 5. Et l'iPhone ?

Installer l'appli sur un iPhone demande un compte Apple Developer Program (99 $ par an). Avec ce compte : `npx eas-cli@latest device:create` pour enregistrer chaque iPhone, puis `npm run build:ios`. Sans ce compte, la seule voie est de signer l'appli avec un identifiant Apple gratuit depuis un Mac et Xcode, mais elle expire au bout de 7 jours et chaque iPhone doit être branché sur ce Mac. Pour les potes sur iPhone, Expo Go reste la solution gratuite.

### Avant de publier sur les stores

Apple et Google vérifient de près les applis qui utilisent la position en arrière-plan. Il faudra expliquer dans la fiche de l'appli pourquoi Touché en a besoin, et Google Play demande un formulaire de déclaration avec une courte vidéo de la fonction.

## Site de présentation

Le dossier `docs/` contient un site statique (HTML et CSS validés par le W3C) qui présente le jeu et explique l'installation sur Android et iPhone. GitHub Pages le publie directement depuis ce dossier. Les liens d'installation se règlent dans `docs/config.js`. Le bouton Android pointe tout seul vers le fichier `touche.apk` de la dernière release GitHub du dépôt.

La liste complète des étapes, dans l'ordre, est dans `A-FAIRE.md`.

## Organisation du code

```
src/app/              les écrans (un fichier = un écran, géré par Expo Router)
  _layout.js          polices, session, navigation
  index.js            accueil
  connexion.js        créer un compte ou se connecter
  profil.js           selfie, pseudo, niveau, historique
  selfie.js           appareil photo frontal pour l'avatar
  creer.js            nouvelle partie : zone et réglages
  rejoindre.js        rejoindre avec un code
  salon/[code].js     salon d'attente, règles de sécurité, lancement
  partie/[code].js    compte à rebours, carte, captures, photos, sortie de zone
  photo/[code].js     appareil photo pour photographier un chat
  fin/[code].js       classement de fin de partie
src/components/       boutons, cartes, champs, textes repris de la maquette Figma,
                      et les cartes de jeu (CarteJeu choisit MapLibre dans l'APK,
                      react-native-maps dans Expo Go)
src/lib/              accès à Supabase, session invité, comptes, calculs GPS,
                      suivi de la position en arrière-plan
src/theme.js          couleurs et polices
supabase/schema.sql   base de données complète
docs/                 site de présentation pour GitHub Pages
```

Les écrans n'écrivent jamais directement dans la base : ils passent par `src/lib/parties.js`, qui appelle les fonctions SQL. Les règles de la partie (qui peut lancer, combien de chats, qui voit quelle position) sont vérifiées par Supabase, donc un joueur ne peut pas tricher en modifiant l'appli.

## Ce qui fonctionne

- Session invité automatique, création de partie et salon en direct avec un code à 4 caractères.
- Comptes : un invité peut créer un compte sans perdre ses parties, ou se connecter à un compte existant. Profil avec selfie, pseudo, niveau (250 XP par niveau), statistiques et historique.
- Expérience gagnée à chaque fin de partie : 50 XP pour avoir joué, 100 pour avoir survécu, 20 par photo validée, 30 par capture réussie, 150 de plus pour la souris gagnante.
- Règles de sécurité à accepter, tirage au sort du chat (deux au-delà de 10 joueurs), compte à rebours.
- Carte de jeu sombre, sans les commerces et autres points d'intérêt, limitée à la zone : on ne peut ni s'en éloigner ni dézoomer sur toute la ville.
- Les chats voient la position exacte des souris toutes les 20 secondes, les souris ne voient pas les chats.
- Captures : le chat signale, la souris confirme ou conteste, l'hôte tranche, et sans réponse sous 30 secondes la capture compte.
- Sortie de zone : au-delà du délai choisi par l'hôte, la souris devient chat.
- APK Android gratuit (`npm run apk`) : la position continue d'être partagée écran éteint pendant une partie, avec une carte MapLibre sans clé. Dans Expo Go, l'écran reste allumé pendant la partie.
- Publication gratuite pour Expo Go avec `npm run partager`.
- Photos : une souris photographie un chat (une fois toutes les 2 minutes par chat), le chat confirme ou refuse, la souris peut contester un refus et l'hôte tranche. Sans réponse sous 30 secondes, la photo compte.
- Fin de partie au bout du chrono ou quand il ne reste plus de souris, avec le classement. Les positions et les photos sont alors effacées.

Si tu avais déjà exécuté une ancienne version de `schema.sql`, lance aussi dans SQL Editor les fichiers d'étape que tu n'as pas encore passés, dans l'ordre : `etape-2-captures.sql`, `etape-3-photos.sql`, puis `etape-4-comptes.sql`.

## Ce qui reste à faire

- Les autres modes : classique, perché, glacé, chasse aux trésors, traque.
- Publication sur le Play Store et l'App Store avec EAS Build. Un Mac n'est pas nécessaire, mais il faut un compte développeur Apple (99 $ par an) et un compte Google Play (25 $, une seule fois).

Carte : © contributeurs OpenStreetMap pour les coordonnées des zones.
