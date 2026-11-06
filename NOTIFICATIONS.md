# Activer les notifications de la version web

Une capture, une photo ou une contestation envoie une notification au joueur concerné, même téléphone en poche. Sur iPhone : iOS 16.4 ou plus, et Touché ajouté à l'écran d'accueil.

Compte environ 15 minutes, une seule fois.

## 1. Créer les clés des notifications

Dans le terminal du dossier `Touché` :

```
npx web-push generate-vapid-keys
```

La commande affiche une **Public Key** et une **Private Key**. Garde la fenêtre ouverte. La clé privée ne doit jamais aller sur GitHub ni dans le fichier `.env`.

Ajoute la clé publique à la fin de ton fichier `.env` :

```
EXPO_PUBLIC_VAPID_PUBLIC_KEY=la-public-key
```

## 2. Créer le secret partagé entre la base et la fonction

Dans Supabase, SQL Editor, lance :

```sql
select vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'touche_webhook_secret');
select decrypted_secret from vault.decrypted_secrets where name = 'touche_webhook_secret';
```

Copie la valeur affichée par la seconde ligne.

## 3. Déployer la fonction « notifier »

1. Dans Supabase, ouvre **Edge Functions**, puis **Deploy a new function** et **Via Editor**.
2. Nomme-la `notifier`, remplace le code d'exemple par tout le contenu de `supabase/functions/notifier/index.ts`, puis **Deploy**.
3. Dans les réglages de la fonction, désactive **Verify JWT** (ou « Enforce JWT verification ») : la base l'appelle avec le secret de l'étape 2, pas avec une session.
4. Dans **Edge Functions**, puis **Secrets**, ajoute trois secrets :
   - `VAPID_PUBLIC_KEY` : la Public Key de l'étape 1 ;
   - `VAPID_PRIVATE_KEY` : la Private Key de l'étape 1 ;
   - `TOUCHE_SECRET` : la valeur copiée à l'étape 2.

## 4. Brancher la base

Dans SQL Editor, lance `supabase/etape-10-notifications.sql`.

## 5. Publier la version web

```
npm run web
git add .
git commit -m "Notifications web"
git push
```

## 6. Tester

Sur un iPhone, ouvre Touché depuis son icône d'écran d'accueil, entre dans un salon, puis touche **Activer les notifications**. Pendant une partie, verrouille le téléphone, demande à un ami de te « toucher » dans l'appli : la notification doit arriver en quelques secondes.
