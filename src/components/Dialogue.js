// Fenêtre par-dessus la carte (confirmation de capture, arbitrage, choix de la cible)
import { Modal, StyleSheet, View } from 'react-native';
import { couleurs, rayon } from '@/theme';

export default function Dialogue({ visible, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.fond}>
        <View style={styles.boite}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: 'rgba(44,44,42,0.75)', justifyContent: 'center', padding: 20 },
  boite: { backgroundColor: couleurs.blanc, borderRadius: rayon, borderWidth: 2, borderColor: couleurs.encre, padding: 20, gap: 12 },
});
