// Écran 16 : profil, niveau et historique des parties
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import ActiverNotifications from '@/components/ActiverNotifications';
import Bouton from '@/components/Bouton';
import Carte from '@/components/Carte';
import Champ from '@/components/Champ';
import Dialogue from '@/components/Dialogue';
import Ecran from '@/components/Ecran';
import Etiquette from '@/components/Etiquette';
import { Petit, Texte, Titre } from '@/components/Texte';
import {
  chargerHistorique,
  chargerProfil,
  enregistrerPseudo,
  lienAvatar,
  niveauDepuisXp,
  seDeconnecter,
  supprimerCompte,
} from '@/lib/compte';
import { activerSons, sonsSontActifs } from '@/lib/preferences';
import { lirePseudo, memoriserPseudo, useSession } from '@/lib/session';
import { couleurs } from '@/theme';

const NOMS_MODES = { contamination: 'chat contaminé' };

export default function Profil() {
  const { session } = useSession();
  const moi = session?.user?.id;
  const invite = session?.user?.is_anonymous ?? true;
  const [profil, setProfil] = useState(null);
  const [pseudo, setPseudo] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [erreur, setErreur] = useState(null);
  const [info, setInfo] = useState(null);
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [sons, setSons] = useState(sonsSontActifs());

  // Recharge à chaque retour sur l'écran (par exemple après un selfie)
  const charger = useCallback(async () => {
    if (!moi) return;
    try {
      const p = await chargerProfil(moi);
      setProfil(p);
      setPseudo(p?.pseudo ?? (await lirePseudo()) ?? '');
      setAvatar(p?.avatar_url ? await lienAvatar(p.avatar_url) : null);
      setHistorique(await chargerHistorique(moi));
    } catch (e) {
      setErreur(e.message);
    }
  }, [moi]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  async function sauverPseudo() {
    setErreur(null);
    try {
      await enregistrerPseudo(moi, pseudo);
      await memoriserPseudo(pseudo);
      setInfo('Pseudo enregistré.');
      await charger();
    } catch (e) {
      setErreur(e.message);
    }
  }

  async function supprimer() {
    setSuppression(true);
    try {
      await supprimerCompte(moi);
      setConfirmerSuppression(false);
      router.replace('/');
    } catch (e) {
      setErreur(e.message);
      setConfirmerSuppression(false);
    } finally {
      setSuppression(false);
    }
  }

  async function deconnexion() {
    try {
      await seDeconnecter();
      router.replace('/');
    } catch (e) {
      setErreur(e.message);
    }
  }

  const { niveau, dansLeNiveau, palier } = niveauDepuisXp(profil?.xp ?? 0);
  const victoires = historique.filter((r) => r.rang === 1 && r.role_final === 'souris').length;
  const photos = historique.reduce((total, r) => total + r.photos, 0);
  const date = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <Ecran retour>
      <View style={styles.tete}>
        <Pressable
          onPress={() => (profil ? router.push('/selfie') : setErreur("Choisis d'abord ton pseudo."))}
          accessibilityRole="button"
          accessibilityLabel="Prendre un selfie"
          style={styles.avatar}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.image} />
          ) : (
            <Image source={require('../../assets/logo-chat.png')} style={styles.logo} accessibilityIgnoresInvertColors />
          )}
        </Pressable>
        <Petit centre>Touche la photo pour prendre un selfie</Petit>
      </View>

      <View style={styles.ligne}>
        <Champ style={{ flex: 1 }} libelle="Pseudo" value={pseudo} onChangeText={setPseudo} maxLength={20} autoCorrect={false} />
        <Bouton titre="OK" variante="encre" style={styles.ok} onPress={sauverPseudo} desactive={pseudo.trim().length < 2} />
      </View>

      <Carte>
        <View style={styles.ligne}>
          <Titre taille={18}>Niveau {niveau}</Titre>
          <Petit>
            {dansLeNiveau} / {palier} XP
          </Petit>
        </View>
        <View style={styles.jauge}>
          <View style={[styles.remplissage, { width: `${(dansLeNiveau / palier) * 100}%` }]} />
        </View>
      </Carte>

      <View style={styles.ligne}>
        {[
          [historique.length, 'parties'],
          [victoires, 'victoires'],
          [photos, 'photos'],
        ].map(([valeur, libelle]) => (
          <Carte key={libelle} style={styles.stat}>
            <Titre taille={20} centre>
              {valeur}
            </Titre>
            <Petit centre>{libelle}</Petit>
          </Carte>
        ))}
      </View>

      {invite ? (
        <Carte accent={couleurs.corail}>
          <Texte gras>Tu joues en invité</Texte>
          <Petit>Si tu changes de téléphone ou désinstalles l'appli, ton niveau et ton historique seront perdus. Crée un compte pour les garder.</Petit>
          <Bouton titre="Créer un compte ou se connecter" onPress={() => router.push('/connexion')} style={{ marginTop: 8 }} />
        </Carte>
      ) : (
        <Petit>Connecté avec {session.user.email}</Petit>
      )}

      <Petit>Historique</Petit>
      {historique.length === 0 && <Petit>Tes parties terminées apparaîtront ici.</Petit>}
      {historique.map((r) => (
        <Carte key={r.partie_id} style={styles.ligne}>
          <View style={{ flex: 1 }}>
            <Texte>{r.partie?.zone?.nom ?? 'Partie'}</Texte>
            <Petit>
              {date(r.cree_le)} · {NOMS_MODES[r.partie?.mode] ?? r.partie?.mode} · +{r.xp_gagne} XP
            </Petit>
          </View>
          <Etiquette
            texte={r.role_final === 'souris' ? (r.rang === 1 ? '1er' : `${r.rang}e`) : 'Chat'}
            fond={r.role_final === 'souris' ? couleurs.vertClair : couleurs.corailClair}
            couleur={r.role_final === 'souris' ? couleurs.vert : couleurs.corail}
          />
        </Carte>
      ))}

      {info && <Texte couleur={couleurs.vert}>{info}</Texte>}
      {erreur && <Texte couleur={couleurs.corail}>{erreur}</Texte>}
      {!invite && <Bouton titre="Se déconnecter" variante="contour" onPress={deconnexion} />}
      <ActiverNotifications />
      <Carte style={styles.reglage}>
        <View style={{ flex: 1 }}>
          <Texte gras>Sons pendant la partie</Texte>
          <Petit>Capture, photo et sortie de zone, sans regarder l'écran.</Petit>
        </View>
        <Switch
          value={sons}
          onValueChange={(v) => {
            setSons(v);
            activerSons(v);
          }}
          accessibilityLabel="Sons pendant la partie"
        />
      </Carte>
      <Bouton titre="Mentions légales et crédits" variante="contour" onPress={() => router.push('/legal')} />
      <Bouton titre="Supprimer mon compte" variante="contour" onPress={() => setConfirmerSuppression(true)} />

      <Dialogue visible={confirmerSuppression}>
        <Titre taille={22}>Supprimer ton compte ?</Titre>
        <Texte>
          Ton pseudo, ton selfie, ton niveau et ton historique seront effacés pour de bon. Les parties que tu as créées
          seront supprimées. Cette action est définitive.
        </Texte>
        <Bouton titre="Supprimer définitivement" onPress={supprimer} chargement={suppression} />
        <Bouton titre="Annuler" variante="contour" onPress={() => setConfirmerSuppression(false)} desactive={suppression} />
      </Dialogue>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  reglage: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tete: { alignItems: 'center', gap: 6 },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: couleurs.corail,
    backgroundColor: couleurs.grisClair,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  logo: { width: 64, height: 64 },
  ligne: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  ok: { width: 70 },
  jauge: { height: 8, borderRadius: 4, backgroundColor: couleurs.grisClair, marginTop: 8, overflow: 'hidden' },
  remplissage: { height: 8, backgroundColor: couleurs.corail },
  stat: { flex: 1, alignItems: 'center' },
});
