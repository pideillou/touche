// Choisit la carte selon l'endroit où tourne l'appli :
// - dans Expo Go : react-native-maps, la seule carte disponible dans Expo Go ;
// - dans l'APK ou un build : MapLibre avec OpenFreeMap, gratuit et sans clé.
// Le require se fait ici pour ne jamais charger MapLibre dans Expo Go, où il n'existe pas.
import { dansExpoGo } from '@/lib/environnement';

const Carte = dansExpoGo ? require('./CarteExpoGo').default : require('./CarteMapLibre').default;

export default function CarteJeu(props) {
  return <Carte {...props} />;
}
