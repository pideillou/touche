// Écrans 04 et 20 réunis : salon d'attente, joueurs en direct et règles de sécurité
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import Bouton from '@/components/Bouton';
import Carte from '@/components/Carte';
import Ecran from '@/components/Ecran';
import { Petit, Texte, Titre } from '@/components/Texte';
import { accepterRegles, chargerPartie, ecouterPartie, lancerPartie } from '@/lib/parties';
import { useSession } from '@/lib/session';
import { couleurs, polices } from '@/theme';

const REGLES = [
  'Reste sur les trottoirs et les rues piétonnes.',
  'Ne traverse jamais une rue en courant.',
  'Un simple toucher suffit, aucun geste brusque.',
  'Respecte les passants et ne photographie que les joueurs.',
];

export default function Salon() {
  const { code } = useLocalSearchParams();
  const { session } = useSession();
  const moi = session?.user?.id;
  const [partie, setPartie] = useState(null);
  const [joueurs, setJoueurs] = useState([]);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    try {
      const resultat = await chargerPartie(code);
      setPartie(resultat.partie);
      setJoueurs(resultat.joueurs);
    } catch (e) {
      setErreur(e.message);
    }
  }, [code]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Mise à jour en direct quand un joueur arrive ou accepte les règles
  useEffect(() => {
    if (!partie?.id) return undefined;
    return ecouterPartie(partie.id, charger);
  }, [partie?.id, charger]);

  // Dès que l'hôte lance, tout le monde part sur l'écran de jeu
  useEffect(() => {
    if (partie?.statut === 'en_cours') router.replace(`/partie/${partie.code}`);
  }, [partie?.statut, partie?.code]);

  async function executer(fonction) {
    setErreur(null);
    setEnCours(true);
    try {
      await fonction();
      await charger();
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnCours(false);
    }
  }

  if (!partie) {
    return (
      <Ecran>
        <Titre>Salon {code}</Titre>
        <Texte couleur={erreur ? couleurs.corail : couleurs.gris}>{erreur || 'Chargement…'}</Texte>
        {erreur && <Bouton titre="Retour à l'accueil" variante="contour" onPress={() => router.replace('/')} />}
      </Ecran>
    );
  }

  const estHote = partie.hote_id === moi;
  const moiJoueur = joueurs.find((j) => j.joueur_id === moi);
  const tousOk = joueurs.length >= 2 && joueurs.every((j) => j.regles_acceptees);

  return (
    <Ecran>
      <Carte style={styles.centre}>
        <Petit>Code de la partie</Petit>
        <CodeGeant>{partie.code}</CodeGeant>
        <Pressable onPress={() => Share.share({ message: `Rejoins ma partie de Touché avec le code ${partie.code}` })}>
          <Texte couleur={couleurs.corail} gras>
            Partager le code
          </Texte>
        </Pressable>
      </Carte>

      <Carte style={styles.ligne}>
        <View style={{ flex: 1 }}>
          <Texte gras>{partie.zone?.nom}</Texte>
          <Petit>
            Chat contaminé · {partie.duree_min} min · {partie.rayon_m} m
          </Petit>
        </View>
        <Petit>{partie.invites_acceptes ? 'Invités acceptés' : 'Compte requis'}</Petit>
      </Carte>

      <Petit>Joueurs {joueurs.length}/12</Petit>
      {joueurs.map((j) => (
        <Carte key={j.joueur_id} style={styles.ligne}>
          <Texte style={{ flex: 1 }}>
            {j.pseudo}
            {j.joueur_id === partie.hote_id ? ' (hôte)' : ''}
          </Texte>
          <Petit couleur={j.regles_acceptees ? couleurs.vert : couleurs.gris}>
            {j.regles_acceptees ? 'Prêt' : 'Lit les règles'}
          </Petit>
        </Carte>
      ))}

      <Titre taille={20} style={{ marginTop: 8 }}>
        On court, mais prudemment
      </Titre>
      {REGLES.map((regle, i) => (
        <Carte key={regle} style={styles.ligne}>
          <View style={styles.numero}>
            <Texte gras couleur={couleurs.corail}>
              {i + 1}
            </Texte>
          </View>
          <Texte style={{ flex: 1 }}>{regle}</Texte>
        </Carte>
      ))}

      {erreur && <Texte couleur={couleurs.corail}>{erreur}</Texte>}

      {!moiJoueur?.regles_acceptees ? (
        <Bouton titre="J'accepte les règles" onPress={() => executer(() => accepterRegles(partie.id))} chargement={enCours} />
      ) : estHote ? (
        <>
          <Bouton titre="Lancer la partie" variante="encre" desactive={!tousOk} chargement={enCours} onPress={() => executer(() => lancerPartie(partie.id))} />
          {!tousOk && <Petit centre>Il faut au moins 2 joueurs, et que tout le monde ait accepté les règles.</Petit>}
        </>
      ) : (
        <Texte centre>En attente du lancement par l'hôte…</Texte>
      )}
    </Ecran>
  );
}

// Le code de la partie, en gros
function CodeGeant({ children }) {
  return <Texte style={{ fontFamily: polices.titre, fontSize: 40, letterSpacing: 6, lineHeight: 48 }}>{children}</Texte>;
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numero: { width: 32, height: 32, borderRadius: 16, backgroundColor: couleurs.corailClair, alignItems: 'center', justifyContent: 'center' },
});
