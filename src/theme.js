// Les couleurs et polices de Touché, reprises de la maquette Figma.
// Deux palettes : le jour, et la nuit (thème sombre du téléphone) pour ne pas éblouir
// pendant une partie de nuit : pas de blanc pur, corail adouci, textes beige doux.
import { Appearance } from 'react-native';

// Couleurs fixes, utilisées par les écrans de jeu qui sont toujours sombres
export const palette = {
  encre: '#2C2C2A',
  craie: '#F1EFE8',
  corail: '#D85A30',
  corailClair: '#FAECE7',
  vert: '#1D9E75',
  vertClair: '#E1F5EE',
  vertVif: '#5DCAA5',
  ambre: '#EF9F27',
  nuit: '#444441',
  gris: '#5F5E5A',
  grisClair: '#D3D1C7',
  blanc: '#FFFFFF',
  saumon: '#F0997B',
  // Raretés des bonus et annonces : bleu pour rare, doré pour légendaire
  rare: '#85B7EB',
  rareFond: '#1E3A5F',
  or: '#FAC775',
  orFond: '#4A3510',
};

// Le thème suit le réglage clair ou sombre du téléphone, lu au lancement de l'appli
export const themeNuit = Appearance.getColorScheme() === 'dark';

const NUIT = {
  encre: '#E8E5DC', // texte principal
  craie: '#1C1C1A', // fond des écrans
  blanc: '#2C2C2A', // cartes et fenêtres
  gris: '#B4B2A9', // texte secondaire
  grisClair: '#444441', // bordures et sélecteurs
  corail: '#C8613D',
  corailClair: '#3D2A22',
  vertClair: '#1E3A31',
};

// Couleurs des écrans clairs : elles basculent la nuit
export const couleurs = themeNuit ? { ...palette, ...NUIT } : palette;

// Noms des polices chargées dans src/app/_layout.js
export const polices = {
  titre: 'Fredoka_600SemiBold',
  texte: 'Inter_400Regular',
  texteGras: 'Inter_600SemiBold',
};

export const rayon = 18;
