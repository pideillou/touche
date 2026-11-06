// Savoir où tourne l'appli : version web (PWA, iPhone) ou appli Android installée
import { Platform } from 'react-native';

export const dansNavigateur = Platform.OS === 'web';
