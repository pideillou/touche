// Icônes chat et souris : le rôle ne repose jamais sur la seule couleur (accessibilité)
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

export default function IconeRole({ role, couleur, taille = 14 }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 16 16" accessibilityElementsHidden importantForAccessibility="no">
      {role === 'chat' ? (
        <Path d="M1.5 1.5 L5.5 4.6 H10.5 L14.5 1.5 V9 A6.5 6.5 0 0 1 1.5 9 Z" fill={couleur} />
      ) : (
        <>
          <Circle cx="3.6" cy="4.6" r="3.1" fill={couleur} />
          <Circle cx="12.4" cy="4.6" r="3.1" fill={couleur} />
          <Ellipse cx="8" cy="10" rx="5.2" ry="4.8" fill={couleur} />
        </>
      )}
    </Svg>
  );
}
