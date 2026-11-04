// Bloc blanc arrondi, ou gris nuit sur les écrans sombres
import { View } from 'react-native';
import { couleurs, rayon } from '@/theme';

export default function Carte({ children, sombre, accent, style }) {
  return (
    <View
      style={[
        { backgroundColor: sombre ? couleurs.nuit : couleurs.blanc, borderRadius: rayon, padding: 14, gap: 4 },
        accent && { borderWidth: 2, borderColor: accent },
        style,
      ]}
    >
      {children}
    </View>
  );
}
