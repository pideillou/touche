// Fond d'écran commun : couleur craie (ou encre en partie), marges et défilement
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { couleurs } from '@/theme';

export default function Ecran({ children, sombre = false, defilant = true, style }) {
  const fond = { backgroundColor: sombre ? couleurs.encre : couleurs.craie };
  return (
    <SafeAreaView style={[styles.zone, fond]}>
      <StatusBar style={sombre ? 'light' : 'dark'} />
      {defilant ? (
        <ScrollView contentContainerStyle={[styles.contenu, style]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.contenu, styles.plein, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  zone: { flex: 1 },
  contenu: { flexGrow: 1, padding: 20, gap: 12 },
  plein: { flex: 1 },
});
