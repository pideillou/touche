// Écran 01 : accueil
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Bouton from '@/components/Bouton';
import Carte from '@/components/Carte';
import Champ from '@/components/Champ';
import Ecran from '@/components/Ecran';
import { Petit, Texte, Titre } from '@/components/Texte';
import { useSession } from '@/lib/session';
import { supabaseConfigure } from '@/lib/supabase';
import { couleurs } from '@/theme';

export default function Accueil() {
  const { pret, erreur } = useSession();
  const [code, setCode] = useState('');
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
        <Texte>Limoges</Texte>
        <Petit>Ta ville</Petit>
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
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  illustration: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  logo: { width: 170, height: 170 },
  profil: { backgroundColor: couleurs.corailClair, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
});
