// Fond d'écran commun : craie le jour, anthracite la nuit (ou toujours sombre en partie),
// avec un retour en haut à gauche, au même endroit sur tous les écrans.
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { couleurs, palette, polices, themeNuit } from '@/theme';

function retourParDefaut() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function Ecran({ children, sombre = false, defilant = true, style, retour, surRetour }) {
  const fond = { backgroundColor: sombre ? palette.encre : couleurs.craie };
  const couleurRetour = sombre ? palette.craie : couleurs.corail;
  const barre = retour ? (
    <Pressable
      onPress={surRetour ?? retourParDefaut}
      accessibilityRole="button"
      accessibilityLabel={typeof retour === 'string' ? retour : 'Retour'}
      hitSlop={12}
      style={styles.retour}
    >
      <Text style={[styles.fleche, { color: couleurRetour }]}>‹</Text>
      <Text style={[styles.libelle, { color: couleurRetour }]}>{typeof retour === 'string' ? retour : 'Retour'}</Text>
    </Pressable>
  ) : null;
  return (
    <SafeAreaView style={[styles.zone, fond]}>
      <StatusBar style={sombre || themeNuit ? 'light' : 'dark'} />
      {defilant ? (
        <ScrollView contentContainerStyle={[styles.contenu, style]} keyboardShouldPersistTaps="handled">
          {barre}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.contenu, styles.plein, style]}>
          {barre}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  zone: { flex: 1 },
  contenu: { flexGrow: 1, padding: 20, gap: 12 },
  plein: { flex: 1 },
  retour: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 44 },
  fleche: { fontFamily: polices.texteGras, fontSize: 26, lineHeight: 28 },
  libelle: { fontFamily: polices.texteGras, fontSize: 16 },
});
