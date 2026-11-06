/* eslint-env browser */
// Écran 01 : accueil
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import Bouton from '@/components/Bouton';
import Carte from '@/components/Carte';
import Champ from '@/components/Champ';
import Dialogue from '@/components/Dialogue';
import Ecran from '@/components/Ecran';
import { Petit, Texte, Titre } from '@/components/Texte';
import { invitationDejaVue, marquerInvitationVue } from '@/lib/preferences';
import { useSession } from '@/lib/session';
import { supabaseConfigure } from '@/lib/supabase';
import { couleurs } from '@/theme';

// Version web sur iPhone, ouverte dans Safari et pas depuis l'écran d'accueil
function iphoneDansSafari() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installee = window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
  return ios && !installee;
}

export default function Accueil() {
  const { pret, erreur } = useSession();
  const { info } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [invitation, setInvitation] = useState(false);

  useEffect(() => {
    if (!iphoneDansSafari()) return;
    invitationDejaVue().then((vue) => setInvitation(!vue));
  }, []);

  function fermerInvitation() {
    setInvitation(false);
    marquerInvitationVue();
  }
  const codePret = code.trim().length === 4;
  const actif = pret && supabaseConfigure && !erreur;

  return (
    <Ecran>
      <View style={styles.ligne}>
        <Titre taille={32}>Touché</Titre>
        <Pressable onPress={() => router.push('/profil')} accessibilityRole="button" style={styles.profil} disabled={!actif}>
          <Texte gras couleur={couleurs.corail}>
            Profil
          </Texte>
        </Pressable>
      </View>

      {info ? (
        <Carte accent={couleurs.ambre}>
          <Texte>{info}</Texte>
        </Carte>
      ) : null}

      {!supabaseConfigure && (
        <Carte accent={couleurs.corail}>
          <Texte gras>Supabase n'est pas encore relié</Texte>
          <Petit>Copie le fichier .env.example en .env, remplis-le, puis relance l'appli (README, étape 2).</Petit>
        </Carte>
      )}
      {erreur && (
        <Carte accent={couleurs.corail}>
          <Texte gras>Connexion impossible</Texte>
          <Petit>{erreur}</Petit>
        </Carte>
      )}

      <Carte style={styles.ligne}>
        <Texte>Limoges · Châteauroux</Texte>
        <Petit>Ou autour de toi</Petit>
      </Carte>
      <View style={[styles.ligne, { paddingHorizontal: 6 }]}>
        <Petit>Angoulême</Petit>
        <Petit>Bientôt</Petit>
      </View>

      <View style={styles.illustration}>
        <Image source={require('../../assets/logo-chat.png')} style={styles.logo} accessibilityIgnoresInvertColors />
      </View>

      <Bouton titre="Créer une partie" onPress={() => router.push('/creer')} desactive={!actif} />
      <Petit>Rejoindre avec un code</Petit>
      <View style={styles.ligne}>
        <Champ
          style={{ flex: 1 }}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="KX7P"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={4}
          accessibilityLabel="Code de la partie"
        />
        <Bouton
          titre="Go"
          variante="encre"
          style={{ width: 90 }}
          desactive={!codePret || !actif}
          onPress={() => router.push({ pathname: '/rejoindre', params: { code: code.trim() } })}
        />
      </View>
      <Dialogue visible={invitation}>
        <Titre taille={22}>Installe Touché</Titre>
        <Petit>Plein écran et icône sur ton accueil, sans App Store.</Petit>
        <Texte>1. Touche le bouton Partager, en bas de Safari.</Texte>
        <Texte>2. Choisis « Sur l'écran d'accueil ».</Texte>
        <Texte>3. Ouvre Touché depuis sa nouvelle icône.</Texte>
        <Bouton titre="J'ai compris" onPress={fermerInvitation} />
        <Bouton titre="Plus tard" variante="contour" onPress={() => setInvitation(false)} />
      </Dialogue>

      <Pressable onPress={() => router.push('/legal')} accessibilityRole="link" style={styles.legal}>
        <Petit centre couleur={couleurs.gris}>
          Mentions légales et crédits · Cartes © contributeurs OpenStreetMap
        </Petit>
      </Pressable>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  illustration: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  logo: { width: 170, height: 170 },
  legal: { paddingVertical: 8 },
  profil: { backgroundColor: couleurs.corailClair, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
});
