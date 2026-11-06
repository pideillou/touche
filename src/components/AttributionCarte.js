// Mention des sources de la carte, visible en permanence (exigée par la licence ODbL d'OpenStreetMap)
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { couleurs, polices } from '@/theme';

export default function AttributionCarte({ texte }) {
  return (
    <Pressable
      style={styles.cadre}
      onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
      accessibilityRole="link"
      accessibilityLabel={`${texte}. Ouvre la page des droits d'OpenStreetMap.`}
    >
      <Text style={styles.texte}>{texte}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cadre: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    maxWidth: '75%',
    backgroundColor: 'rgba(44,44,42,0.7)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  texte: { color: couleurs.craie, fontFamily: polices.texte, fontSize: 10 },
});
