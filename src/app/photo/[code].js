// Écran 08 : une souris photographie un chat
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Bouton from '@/components/Bouton';
import Ecran from '@/components/Ecran';
import { Petit, Texte, Titre } from '@/components/Texte';
import { chrono } from '@/lib/geo';
import { chargerPartie, envoyerPhoto, listerPhotos } from '@/lib/parties';
import { useSession } from '@/lib/session';
import { couleurs, polices } from '@/theme';

const ATTENTE_MEME_CHAT_S = 120; // une photo par chat toutes les 2 minutes

export default function Photo() {
  const { code } = useLocalSearchParams();
  const { session } = useSession();
  const moi = session?.user?.id;
  const [permission, demanderPermission] = useCameraPermissions();
  const [partie, setPartie] = useState(null);
  const [joueurs, setJoueurs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [chatChoisi, setChatChoisi] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [maintenant, setMaintenant] = useState(Date.now());
  const appareil = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const resultat = await chargerPartie(code);
        setPartie(resultat.partie);
        setJoueurs(resultat.joueurs);
        setPhotos(await listerPhotos(resultat.partie.id));
      } catch (e) {
        setErreur(e.message);
      }
    })();
    const minuterie = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(minuterie);
  }, [code]);

  // Temps restant avant de pouvoir rephotographier ce chat
  const attente = (chatId) => {
    const derniere = photos.filter((p) => p.souris_id === moi && p.chat_id === chatId).at(-1);
    if (!derniere) return 0;
    return Math.max(0, ATTENTE_MEME_CHAT_S - (maintenant - new Date(derniere.cree_le).getTime()) / 1000);
  };

  async function prendre() {
    if (!chatChoisi) {
      setErreur("Choisis d'abord le chat que tu photographies.");
      return;
    }
    setErreur(null);
    setEnvoi(true);
    try {
      const image = await appareil.current.takePictureAsync({ quality: 0.4, base64: true });
      await envoyerPhoto(partie.id, chatChoisi, image.base64 ?? image.uri.split(',')[1]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      setErreur(e.message);
      setEnvoi(false);
    }
  }

  if (!permission || !partie) {
    return (
      <Ecran sombre>
        <Texte couleur={erreur ? couleurs.saumon : couleurs.grisClair}>{erreur || 'Préparation de l’appareil photo…'}</Texte>
      </Ecran>
    );
  }

  if (!permission.granted) {
    return (
      <Ecran sombre style={{ justifyContent: 'center' }}>
        <Titre couleur={couleurs.craie} centre>
          Appareil photo
        </Titre>
        <Texte couleur={couleurs.grisClair} centre>
          Touché a besoin de l'appareil photo pour que tu puisses photographier les chats.
        </Texte>
        <Bouton titre="Autoriser l'appareil photo" variante="vert" onPress={demanderPermission} />
        <Bouton titre="Retour" variante="contourClair" onPress={() => router.back()} />
      </Ecran>
    );
  }

  const chats = joueurs.filter((j) => j.role === 'chat');

  return (
    <Ecran sombre defilant={false}>
      <Titre taille={22} couleur={couleurs.craie}>
        Quel chat photographies-tu ?
      </Titre>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
        {chats.map((c) => {
          const reste = attente(c.joueur_id);
          const choisi = chatChoisi === c.joueur_id;
          return (
            <Pressable
              key={c.joueur_id}
              disabled={reste > 0}
              onPress={() => setChatChoisi(c.joueur_id)}
              style={[styles.chat, choisi && styles.chatChoisi, reste > 0 && { opacity: 0.45 }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: choisi, disabled: reste > 0 }}
            >
              <Text style={[styles.nomChat, choisi && { color: couleurs.corailClair }]}>{c.pseudo}</Text>
              {reste > 0 && <Text style={styles.attente}>dans {chrono(reste)}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.viseur}>
        <CameraView ref={appareil} style={StyleSheet.absoluteFill} facing="back" />
      </View>

      <Petit couleur={couleurs.grisClair} centre>
        Le chat devra confirmer que c'est bien lui. Une photo par chat toutes les 2 minutes.
      </Petit>
      {erreur && (
        <Petit couleur={couleurs.saumon} centre>
          {erreur}
        </Petit>
      )}

      <View style={styles.bas}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.retour}>
          <Texte couleur={couleurs.craie}>Retour</Texte>
        </Pressable>
        <Pressable onPress={prendre} disabled={envoi} accessibilityRole="button" accessibilityLabel="Prendre la photo" style={styles.declencheur}>
          {envoi ? <ActivityIndicator color={couleurs.craie} /> : <View style={styles.rond} />}
        </Pressable>
        <View style={styles.retour} />
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  chat: { backgroundColor: couleurs.nuit, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  chatChoisi: { backgroundColor: couleurs.corail },
  nomChat: { fontFamily: polices.titre, fontSize: 16, color: couleurs.craie },
  attente: { fontFamily: polices.texte, fontSize: 12, color: couleurs.grisClair },
  viseur: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: couleurs.nuit },
  bas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  retour: { width: 80 },
  declencheur: { width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: couleurs.craie, alignItems: 'center', justifyContent: 'center' },
  rond: { width: 56, height: 56, borderRadius: 28, backgroundColor: couleurs.vert },
});
