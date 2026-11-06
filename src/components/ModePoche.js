// Mode poche : écran noir qui ignore les touchers accidentels quand le téléphone est dans la poche.
// L'écran reste allumé (la position continue d'être envoyée), mais il éclaire le moins possible.
// Pour revenir au jeu, il faut maintenir le cercle 2 secondes.
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { palette, polices } from '@/theme';

const DUREE_MAINTIEN_MS = 2000;
const TAILLE = 132;
const EPAISSEUR = 6;

export function IconeCadenas({ couleur = palette.craie, taille = 16 }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 16 16" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M4.5 7 V5 A3.5 3.5 0 0 1 11.5 5 V7" stroke={couleur} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <Rect x={2.5} y={7} width={11} height={8} rx={2} fill={couleur} />
    </Svg>
  );
}

export default function ModePoche({ visible, surDeverrouiller, chrono, role, alerte }) {
  const [progression, setProgression] = useState(0);
  const debut = useRef(null);
  const minuterie = useRef(null);

  function arreter() {
    if (minuterie.current) clearInterval(minuterie.current);
    minuterie.current = null;
    debut.current = null;
    setProgression(0);
  }

  function commencer() {
    debut.current = Date.now();
    minuterie.current = setInterval(() => {
      const p = (Date.now() - debut.current) / DUREE_MAINTIEN_MS;
      if (p >= 1) {
        arreter();
        surDeverrouiller();
      } else setProgression(p);
    }, 50);
  }

  useEffect(() => arreter, []);
  useEffect(() => {
    if (!visible) arreter();
  }, [visible]);

  const r = (TAILLE - EPAISSEUR) / 2;
  const tour = 2 * Math.PI * r;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      {/* Tout l'écran capte les touchers pour qu'ils n'atteignent jamais le jeu */}
      <View style={styles.fond} onStartShouldSetResponder={() => true}>
        <Text style={styles.chrono}>{chrono}</Text>
        <Text style={styles.role}>{role}</Text>
        {alerte ? (
          <Text style={styles.alerte} accessibilityLiveRegion="assertive">
            {alerte}
          </Text>
        ) : (
          <Text style={styles.info}>Mode poche : ta position continue d'être partagée.</Text>
        )}
        <Pressable
          onPressIn={commencer}
          onPressOut={arreter}
          style={styles.cercle}
          accessibilityRole="button"
          accessibilityLabel="Maintenir deux secondes pour déverrouiller"
        >
          <Svg width={TAILLE} height={TAILLE} style={StyleSheet.absoluteFill}>
            <Circle cx={TAILLE / 2} cy={TAILLE / 2} r={r} stroke="#2A2A28" strokeWidth={EPAISSEUR} fill="none" />
            <Circle
              cx={TAILLE / 2}
              cy={TAILLE / 2}
              r={r}
              stroke={palette.gris}
              strokeWidth={EPAISSEUR}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${tour} ${tour}`}
              strokeDashoffset={tour * (1 - progression)}
              transform={`rotate(-90 ${TAILLE / 2} ${TAILLE / 2})`}
            />
          </Svg>
          <IconeCadenas couleur={palette.gris} taille={26} />
        </Pressable>
        <Text style={styles.info}>Maintiens le cercle 2 secondes pour revenir au jeu</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 28 },
  chrono: { fontFamily: polices.titre, fontSize: 56, color: '#5F5E5A' },
  role: { fontFamily: polices.texteGras, fontSize: 16, color: '#5F5E5A' },
  alerte: { fontFamily: polices.texteGras, fontSize: 20, color: palette.ambre, textAlign: 'center' },
  info: { fontFamily: polices.texte, fontSize: 14, color: '#5F5E5A', textAlign: 'center' },
  cercle: { width: TAILLE, height: TAILLE, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
});
