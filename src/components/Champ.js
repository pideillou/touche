// Champ de saisie avec son libellé
import { StyleSheet, TextInput, View } from 'react-native';
import { couleurs, polices, rayon } from '@/theme';
import { Petit } from './Texte';

export default function Champ({ libelle, style, ...props }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {libelle ? <Petit>{libelle}</Petit> : null}
      <TextInput placeholderTextColor={couleurs.grisClair} style={styles.champ} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  champ: {
    backgroundColor: couleurs.blanc,
    borderRadius: rayon,
    borderWidth: 2,
    borderColor: couleurs.grisClair,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: polices.texte,
    fontSize: 16,
    color: couleurs.encre,
  },
});
