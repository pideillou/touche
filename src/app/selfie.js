// Prise du selfie qui sert d'avatar
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Bouton from '@/components/Bouton';
import Ecran from '@/components/Ecran';
import { Petit, Texte, Titre } from '@/components/Texte';
import { envoyerSelfie } from '@/lib/compte';
import { useSession } from '@/lib/session';
import { couleurs } from '@/theme';

export default function Selfie() {
  const { session } = useSession();
  const [permission, demanderPermission] = useCameraPermissions();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const appareil = useRef(null);

  async function prendre() {
    setErreur(null);
    setEnvoi(true);
    try {
      const image = await appareil.current.takePictureAsync({ quality: 0.5, base64: true });
      await envoyerSelfie(session.user.id, image.base64 ?? image.uri.split(',')[1]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      setErreur(e.message);
      setEnvoi(false);
    }
  }

  if (!permission) {
    return (
      <Ecran sombre>
        <Texte couleur={couleurs.grisClair}>Préparation de l'appareil photo…</Texte>
      </Ecran>
    );
  }

  if (!permission.granted) {
    return (
      <Ecran sombre style={{ justifyContent: 'center' }}>
        <Titre couleur={couleurs.craie} centre>
          Selfie
        </Titre>
        <Texte couleur={couleurs.grisClair} centre>
          Autorise l'appareil photo pour prendre ton selfie d'avatar.
        </Texte>
        <Bouton titre="Autoriser l'appareil photo" onPress={demanderPermission} />
        <Bouton titre="Retour" variante="contourClair" onPress={() => router.back()} />
      </Ecran>
    );
  }

  return (
    <Ecran sombre defilant={false}>
      <Titre taille={22} couleur={couleurs.craie}>
        Ton selfie
      </Titre>
      <View style={styles.cadre}>
        <CameraView ref={appareil} style={StyleSheet.absoluteFill} facing="front" />
      </View>
      <Petit couleur={couleurs.grisClair} centre>
        Il s'affiche sur ton profil et remplace l'ancien.
      </Petit>
      {erreur && (
        <Petit couleur={couleurs.saumon} centre>
          {erreur}
        </Petit>
      )}
      <View style={styles.bas}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.cote}>
          <Texte couleur={couleurs.craie}>Retour</Texte>
        </Pressable>
        <Pressable onPress={prendre} disabled={envoi} accessibilityRole="button" accessibilityLabel="Prendre le selfie" style={styles.declencheur}>
          {envoi ? <ActivityIndicator color={couleurs.craie} /> : <View style={styles.rond} />}
        </Pressable>
        <View style={styles.cote} />
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  cadre: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: couleurs.nuit },
  bas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cote: { width: 80 },
  declencheur: { width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: couleurs.craie, alignItems: 'center', justifyContent: 'center' },
  rond: { width: 56, height: 56, borderRadius: 28, backgroundColor: couleurs.corail },
});
