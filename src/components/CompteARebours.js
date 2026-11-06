// Anneau qui se vide pendant le temps de réponse, avec les secondes restantes au centre
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { couleurs, polices } from '@/theme';

export default function CompteARebours({ reste, total, taille = 96, epaisseur = 8 }) {
  const r = (taille - epaisseur) / 2;
  const tour = 2 * Math.PI * r;
  const part = Math.max(0, Math.min(1, reste / total));
  const secondes = Math.max(0, Math.ceil(reste));
  return (
    <View style={{ width: taille, height: taille, alignSelf: 'center' }} accessibilityRole="timer" accessibilityLabel={`${secondes} secondes restantes`}>
      <Svg width={taille} height={taille}>
        <Circle cx={taille / 2} cy={taille / 2} r={r} stroke={couleurs.grisClair} strokeWidth={epaisseur} fill="none" />
        <Circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          stroke={couleurs.corail}
          strokeWidth={epaisseur}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${tour} ${tour}`}
          strokeDashoffset={tour * (1 - part)}
          transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.centre]}>
        <Text style={styles.texte}>{secondes} s</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', justifyContent: 'center' },
  texte: { fontFamily: polices.titre, fontSize: 24, color: couleurs.encre },
});
