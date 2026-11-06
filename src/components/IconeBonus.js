// Icônes des bonus et pastille de rareté, reprises de la maquette Figma (page V3 bonus)
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { RARETES } from '@/lib/bonus';
import { polices } from '@/theme';

const TRACES = {
  vide: [<Path key="a" d="M12 6v12M6 12h12" />],
  flair: [<Path key="a" d="M20 12a8 8 0 1 1-2.3-5.6" />, <Path key="b" d="M20 4v4h-4" />],
  sonar: [
    <Circle key="a" cx={12} cy={12} r={2} />,
    <Path key="b" d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 19.1a10 10 0 0 0 0-14.2" />,
  ],
  pistage: [
    <Circle key="a" cx={12} cy={12} r={8} />,
    <Circle key="b" cx={12} cy={12} r={2.5} />,
    <Path key="c" d="M12 1v4M12 19v4M1 12h4M19 12h4" />,
  ],
  piege: [<Path key="a" d="M3 15l2.25-5 2.25 5 2.25-5 2.25 5 2.25-5 2.25 5 2.25-5L21 15" />, <Path key="b" d="M3 19h18" />],
  retrecissement: [<Path key="a" d="M4 4l5 5M9 4v5H4M20 20l-5-5M15 20v-5h5M20 4l-5 5M15 4v5h5M4 20l5-5M9 20v-5H4" />],
  rafle: [<Path key="a" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />, <Circle key="b" cx={12} cy={12} r={3} />],
  alarme: [<Path key="a" d="M6 9a6 6 0 0 1 12 0c0 6 3 8 3 8H3s3-2 3-8" />, <Path key="b" d="M10.3 21a2 2 0 0 0 3.4 0" />],
  leurre: [<Path key="a" d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" />, <Circle key="b" cx={12} cy={10} r={2} />],
  cape: [
    <Path key="a" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />,
    <Circle key="b" cx={12} cy={12} r={3} />,
    <Path key="c" d="M3 3l18 18" />,
  ],
  radar: [<Circle key="a" cx={12} cy={12} r={9} />, <Circle key="b" cx={12} cy={12} r={4} />, <Path key="c" d="M12 12l6-6" />],
  bouclier: [
    <Path key="a" d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />,
  ],
  brouillard: [<Path key="a" d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z" />],
};

export function IconeBonus({ type, couleur = '#F1EFE8', taille = 20 }) {
  return (
    <Svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke={couleur}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {TRACES[type] ?? TRACES.vide}
    </Svg>
  );
}

export function PastilleRarete({ rarete }) {
  const r = RARETES[rarete];
  if (!r) return null;
  return (
    <View style={[styles.pastille, { backgroundColor: r.fond }]}>
      <Text style={[styles.texte, { color: r.texte }]}>{r.nom.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pastille: { alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  texte: { fontFamily: polices.texteGras, fontSize: 10, letterSpacing: 0.6 },
});
