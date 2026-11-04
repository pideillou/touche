// Réglage numérique avec deux boutons − et + (plus simple qu'un curseur au doigt en extérieur)
import { Pressable, StyleSheet, Text } from 'react-native';
import { couleurs, polices } from '@/theme';
import Carte from './Carte';
import { Texte } from './Texte';

export default function Reglage({ libelle, valeur, unite, min, max, pas, onChange }) {
  const changer = (sens) => onChange(Math.min(max, Math.max(min, valeur + sens * pas)));
  return (
    <Carte style={styles.ligne}>
      <Texte style={{ flex: 1 }}>{libelle}</Texte>
      <Pressable accessibilityLabel={`Diminuer ${libelle}`} onPress={() => changer(-1)} style={styles.rond} disabled={valeur <= min}>
        <Text style={styles.signe}>−</Text>
      </Pressable>
      <Text style={styles.valeur}>
        {valeur} {unite}
      </Text>
      <Pressable accessibilityLabel={`Augmenter ${libelle}`} onPress={() => changer(1)} style={styles.rond} disabled={valeur >= max}>
        <Text style={styles.signe}>+</Text>
      </Pressable>
    </Carte>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rond: { width: 36, height: 36, borderRadius: 18, backgroundColor: couleurs.corailClair, alignItems: 'center', justifyContent: 'center' },
  signe: { fontFamily: polices.titre, fontSize: 20, color: couleurs.corail },
  valeur: { fontFamily: polices.titre, fontSize: 16, color: couleurs.encre, minWidth: 64, textAlign: 'center' },
});
