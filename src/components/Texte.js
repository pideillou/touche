// Trois styles de texte : Titre (Fredoka), Texte (Inter), Petit (légende grise)
import { Text } from 'react-native';
import { couleurs, polices } from '@/theme';

export function Titre({ children, taille = 24, couleur = couleurs.encre, centre, style }) {
  return (
    <Text style={[{ fontFamily: polices.titre, fontSize: taille, color: couleur }, centre && { textAlign: 'center' }, style]}>
      {children}
    </Text>
  );
}

export function Texte({ children, gras, couleur = couleurs.encre, centre, style }) {
  return (
    <Text
      style={[
        { fontFamily: gras ? polices.texteGras : polices.texte, fontSize: 15, color: couleur, lineHeight: 21 },
        centre && { textAlign: 'center' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Petit({ children, couleur = couleurs.gris, centre, style }) {
  return (
    <Text style={[{ fontFamily: polices.texte, fontSize: 13, color: couleur, lineHeight: 18 }, centre && { textAlign: 'center' }, style]}>
      {children}
    </Text>
  );
}
