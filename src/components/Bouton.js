// Bouton aux variantes du composant Figma « Bouton » : corail, encre, vert, contour, contourClair
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { couleurs, palette, polices, rayon, themeNuit } from '@/theme';

const VARIANTES = {
  corail: { fond: couleurs.corail, texte: themeNuit ? palette.craie : couleurs.corailClair },
  // La nuit, le bouton principal passe au corail adouci plutôt qu'à un aplat clair qui éblouit
  encre: themeNuit ? { fond: couleurs.corail, texte: palette.craie } : { fond: couleurs.encre, texte: couleurs.craie },
  vert: { fond: couleurs.vert, texte: palette.vertClair },
  contour: { bord: couleurs.encre, texte: couleurs.encre },
  contourClair: { bord: palette.craie, texte: palette.craie }, // sur les écrans de jeu, toujours sombres
};

export default function Bouton({ titre, onPress, variante = 'corail', desactive, chargement, style }) {
  const v = VARIANTES[variante];
  const inactif = desactive || chargement;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif }}
      onPress={onPress}
      disabled={inactif}
      style={({ pressed }) => [
        styles.base,
        v.fond && { backgroundColor: v.fond },
        v.bord && { borderWidth: 2, borderColor: v.bord },
        pressed && { transform: [{ scale: 0.98 }] },
        inactif && { opacity: 0.45 },
        style,
      ]}
    >
      {chargement ? <ActivityIndicator color={v.texte} /> : <Text style={[styles.texte, { color: v.texte }]}>{titre}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: rayon, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  texte: { fontFamily: polices.titre, fontSize: 17 },
});
