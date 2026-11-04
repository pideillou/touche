// Point de départ de l'appli : polices, session et navigation entre les écrans
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { SessionProvider } from '@/lib/session';
import '@/lib/suivi'; // déclare la tâche de suivi de fond dès le lancement
import { couleurs } from '@/theme';

export default function Racine() {
  const [policesPretes] = useFonts({ Fredoka_600SemiBold, Inter_400Regular, Inter_600SemiBold });

  if (!policesPretes) {
    return (
      <View style={{ flex: 1, backgroundColor: couleurs.corail, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={couleurs.craie} />
      </View>
    );
  }

  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </SessionProvider>
  );
}
