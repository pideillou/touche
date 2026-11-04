// Écran 18 : créer un compte ou se connecter
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Bouton from '@/components/Bouton';
import Champ from '@/components/Champ';
import Ecran from '@/components/Ecran';
import { Petit, Texte, Titre } from '@/components/Texte';
import { creerCompte, seConnecter } from '@/lib/compte';
import { lirePseudo, memoriserPseudo, useSession } from '@/lib/session';
import { couleurs } from '@/theme';

export default function Connexion() {
  const { session } = useSession();
  const [mode, setMode] = useState('creation'); // 'creation' ou 'connexion'
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    lirePseudo().then((p) => p && setPseudo(p));
  }, []);

  const creation = mode === 'creation';
  const pret = email.includes('@') && motDePasse.length >= 8 && (!creation || pseudo.trim().length >= 2);

  async function valider() {
    setErreur(null);
    setChargement(true);
    try {
      if (creation) {
        await creerCompte({ id: session.user.id, email, motDePasse, pseudo });
        await memoriserPseudo(pseudo);
      } else {
        await seConnecter(email, motDePasse);
      }
      router.replace('/profil');
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <Ecran>
      <Titre taille={28}>{creation ? 'Créer ton compte' : 'Bon retour'}</Titre>
      <Petit>
        {creation
          ? 'Ton compte garde ton niveau, tes photos et ton historique. Les parties jouées en invité sur ce téléphone sont conservées.'
          : 'Connecte-toi pour retrouver ton niveau et ton historique.'}
      </Petit>

      <View style={styles.selecteur}>
        {[
          ['creation', 'Créer un compte'],
          ['connexion', "J'ai un compte"],
        ].map(([valeur, libelle]) => (
          <Pressable
            key={valeur}
            onPress={() => setMode(valeur)}
            style={[styles.option, mode === valeur && styles.optionActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: mode === valeur }}
          >
            <Texte couleur={mode === valeur ? couleurs.craie : couleurs.encre}>{libelle}</Texte>
          </Pressable>
        ))}
      </View>

      {creation && <Champ libelle="Pseudo" value={pseudo} onChangeText={setPseudo} placeholder="Matou_87" maxLength={20} autoCorrect={false} />}
      <Champ
        libelle="E-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="prenom@exemple.fr"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
      />
      <Champ
        libelle="Mot de passe (8 caractères minimum)"
        value={motDePasse}
        onChangeText={setMotDePasse}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={creation ? 'new-password' : 'current-password'}
      />

      {erreur && <Texte couleur={couleurs.corail}>{erreur}</Texte>}
      <Bouton titre={creation ? 'Créer mon compte' : 'Se connecter'} onPress={valider} desactive={!pret} chargement={chargement} />
      <Bouton titre="Continuer en invité" variante="contour" onPress={() => router.back()} />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  selecteur: { flexDirection: 'row', backgroundColor: couleurs.grisClair, borderRadius: 14, padding: 4 },
  option: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  optionActive: { backgroundColor: couleurs.encre },
});
