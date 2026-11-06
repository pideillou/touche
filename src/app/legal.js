// Mentions légales, confidentialité, conditions d'utilisation et crédits des cartes
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet } from 'react-native';
import Bouton from '@/components/Bouton';
import Carte from '@/components/Carte';
import Ecran from '@/components/Ecran';
import { Petit, Texte, Titre } from '@/components/Texte';
import { couleurs } from '@/theme';

const SITE = 'https://pideillou.github.io/touche';

const PAGES = [
  ['Mentions légales', `${SITE}/mentions-legales.html`],
  ['Politique de confidentialité', `${SITE}/confidentialite.html`],
  ["Conditions d'utilisation", `${SITE}/conditions.html`],
];

const CREDITS = [
  ['Données cartographiques et zones', '© contributeurs OpenStreetMap, sous licence ODbL', 'https://www.openstreetmap.org/copyright'],
  ['Fond de carte', 'OpenFreeMap, © OpenMapTiles', 'https://openfreemap.org'],
  ['Fond de carte dans Expo Go', 'Google Maps sur Android, Plans d’Apple sur iPhone', null],
  ['Polices', 'Fredoka et Inter, sous licence SIL Open Font License 1.1', 'https://openfontlicense.org'],
  ['Bibliothèques', 'Expo, React Native, React Native Web, MapLibre et Supabase, logiciels libres', `${SITE}/mentions-legales.html#credits`],
];

function Lien({ titre, detail, url }) {
  const contenu = (
    <Carte style={styles.ligne}>
      <Texte gras>{titre}</Texte>
      {detail && <Petit>{detail}</Petit>}
    </Carte>
  );
  if (!url) return contenu;
  return (
    <Pressable onPress={() => Linking.openURL(url)} accessibilityRole="link">
      {contenu}
    </Pressable>
  );
}

export default function Legal() {
  return (
    <Ecran>
      <Titre>À propos</Titre>
      <Petit>
        Touché {Constants.expoConfig?.version ?? ''}, projet étudiant non commercial. © 2026 Touché.
      </Petit>

      <Petit>Informations légales</Petit>
      {PAGES.map(([titre, url]) => (
        <Lien key={titre} titre={titre} url={url} />
      ))}

      <Petit>Crédits</Petit>
      {CREDITS.map(([titre, detail, url]) => (
        <Lien key={titre} titre={titre} detail={detail} url={url} />
      ))}

      <Petit couleur={couleurs.gris}>
        Pour supprimer ton compte et toutes tes données : Profil, puis « Supprimer mon compte ».
      </Petit>
      <Bouton titre="Retour" variante="contour" onPress={() => router.back()} />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligne: { gap: 2 },
});
