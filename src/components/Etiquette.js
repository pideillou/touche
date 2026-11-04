// Petite pastille colorée : « Chat », « Souris », nom du mode…
import { Text, View } from 'react-native';
import { polices } from '@/theme';

export default function Etiquette({ texte, fond, couleur }) {
  return (
    <View style={{ backgroundColor: fond, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 12 }}>
      <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleur }}>{texte}</Text>
    </View>
  );
}
