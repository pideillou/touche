# Touché

Le jeu du chat dans les vraies rues de ta ville. Appli mobile Expo (React Native) avec Supabase pour les comptes, les parties et les positions.

Version actuelle : mode chat contaminé, à Limoges. On crée un salon, les amis le rejoignent avec un code de 4 caractères, tout le monde accepte les règles, l'hôte lance. Un chat est tiré au sort (deux au-delà de 10 joueurs), puis chacun voit la carte. Les chats reçoivent la position exacte des souris toutes les 20 secondes. Les souris ne voient jamais les chats.

## Version web pour iPhone (PWA)

Les joueurs sur iPhone utilisent la version web : https://pideillou.github.io/touche/app/. Dans Safari, Partager, puis « Sur l'écran d'accueil ». Pas de compte Expo ni d'invitation. Limite : l'écran doit rester allumé pendant la partie, et l'iPhone ne vibre pas.

Pour publier une nouvelle version web :

```
npm run web
```

La commande exporte l'appli pour le web, la transforme en PWA installable (manifeste, icônes) et la copie dans `docs/app`. Il suffit ensuite de pousser le dossier `docs` sur GitHub. La carte web utilise MapLibre GL JS avec le même style que l'APK (`src/components/styleCarte.js`).
