// Salon d'attente : code à partager, joueurs en direct, règles de sécurité, lancement.
// Chacun peut quitter le salon ; l'hôte peut exclure un joueur avant le lancement.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import ActiverNotifications from '@/components/ActiverNotifications';
import Bouton from '@/components/Bouton';
import Carte from '@/components/Carte';
import Dialogue from '@/components/Dialogue';
import Ecran from '@/components/Ecran';
import { Petit, Texte, Titre } from '@/components/Texte';
import { accepterRegles, chargerPartie, ecouterPartie, exclureJoueur, lancerPartie, quitterPartie } from '@/lib/parties';
import { useSession } from '@/lib/session';
import { couleurs, polices } from '@/theme';

const REGLES = [
  'Reste sur les trottoirs et les rues piétonnes.',
  'Ne traverse jamais une rue en courant.',
  'Un simple toucher suffit, aucun geste brusque.',
  'Respecte les passants et ne photographie que les joueurs.',
];

const initiales = (pseudo) => pseudo.slice(0, 2).toUpperCase();

export default function Salon() {
  const { code } = useLocalSearchParams();
  const { session } = useSession();
  const moi = session?.user?.id;
  const [partie, setPartie] = useState(null);
  const [joueurs, setJoueurs] = useState([]);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [confirmerDepart, setConfirmerDepart] = useState(false);
  const [aExclure, setAExclure] = useState(null);
  const dejaCharge = useRef(false);
  const parti = useRef(false);

  const charger = useCallback(async () => {
    try {
      const resultat = await chargerPartie(code);
      setPartie(resultat.partie);
      setJoueurs(resultat.joueurs);
      dejaCharge.current = true;
    } catch (e) {
      // Après une exclusion, la partie n'est plus visible : retour à l'accueil
      if (dejaCharge.current && !parti.current) {
        parti.current = true;
        router.replace({ pathname: '/', params: { info: "L'hôte t'a retiré du salon." } });
        return;
      }
      setErreur(e.message);
    }
  }, [code]);

  useEffect(() => {
    charger();
  }, [charger]);

  useEffect(() => {
    if (!partie?.id) return undefined;
    return ecouterPartie(partie.id, charger);
  }, [partie?.id, charger]);

  // Lancement : tout le monde part sur l'écran de jeu. Salon fermé par l'hôte : retour à l'accueil.
  useEffect(() => {
    if (partie?.statut === 'en_cours') router.replace(`/partie/${partie.code}`);
    if (partie?.statut === 'terminee' && !parti.current) {
      parti.current = true;
      router.replace({ pathname: '/', params: { info: "L'hôte a fermé le salon." } });
    }
  }, [partie?.statut, partie?.code]);

  // Retiré de la liste pendant qu'on regardait le salon
  useEffect(() => {
    if (dejaCharge.current && partie && moi && joueurs.length > 0 && !joueurs.some((j) => j.joueur_id === moi) && !parti.current) {
      parti.current = true;
      router.replace({ pathname: '/', params: { info: "L'hôte t'a retiré du salon." } });
    }
  }, [joueurs, moi, partie]);

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

  async function quitter() {
    setEnCours(true);
    try {
      parti.current = true;
      await quitterPartie(partie.id);
      router.replace('/');
    } catch (e) {
      parti.current = false;
      setErreur(e.message);
      setConfirmerDepart(false);
    } finally {
      setEnCours(false);
    }
  }

  if (!partie) {
    return (
      <Ecran retour="Accueil" surRetour={() => router.replace('/')}>
        <Titre>Salon {code}</Titre>
        <Texte couleur={erreur ? couleurs.corail : couleurs.gris}>{erreur || 'Chargement…'}</Texte>
      </Ecran>
    );
  }

  const estHote = partie.hote_id === moi;
  const moiJoueur = joueurs.find((j) => j.joueur_id === moi);
  const tousOk = joueurs.length >= 2 && joueurs.every((j) => j.regles_acceptees);

  return (
    <Ecran retour="Quitter le salon" surRetour={() => setConfirmerDepart(true)}>
      <Carte style={styles.centre}>
        <Petit>Code de la partie</Petit>
        <CodeGeant>{partie.code}</CodeGeant>
        <Pressable onPress={() => Share.share({ message: `Rejoins ma partie de Touché avec le code ${partie.code}` })} accessibilityRole="button" hitSlop={8}>
          <Texte couleur={couleurs.corail} gras>
            Partager le code
          </Texte>
        </Pressable>
      </Carte>

      <Carte style={styles.ligne}>
        <View style={{ flex: 1 }}>
          <Texte gras>{partie.zone?.nom}</Texte>
          <Petit>
            Chat contaminé · {partie.duree_min} min · {partie.rayon_m} m · {partie.invites_acceptes ? 'invités acceptés' : 'compte requis'}
          </Petit>
        </View>
      </Carte>

      <ActiverNotifications />

      <Petit>Joueurs {joueurs.length}/12</Petit>
      {joueurs.map((j) => {
        const hote = j.joueur_id === partie.hote_id;
        return (
          <Carte key={j.joueur_id} style={styles.ligne}>
            <View style={styles.avatar}>
              <Texte gras couleur={couleurs.corail}>
                {initiales(j.pseudo)}
              </Texte>
            </View>
            <View style={{ flex: 1 }}>
              <Texte gras>
                {j.pseudo}
                {hote ? ' (hôte)' : ''}
              </Texte>
              <Petit couleur={j.regles_acceptees ? couleurs.vert : couleurs.gris}>{j.regles_acceptees ? 'Prêt' : 'Lit les règles'}</Petit>
            </View>
            {estHote && !hote && (
              <Pressable onPress={() => setAExclure(j)} style={styles.exclure} accessibilityRole="button" accessibilityLabel={`Exclure ${j.pseudo}`}>
                <Petit couleur={couleurs.corail} style={styles.gras}>
                  Exclure
                </Petit>
              </Pressable>
            )}
          </Carte>
        );
      })}

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

      <Dialogue visible={confirmerDepart}>
        <Titre taille={22}>{estHote ? 'Fermer le salon ?' : 'Quitter le salon ?'}</Titre>
        <Texte>{estHote ? 'Tu es l’hôte : les autres joueurs seront renvoyés à l’accueil.' : 'Tu pourras revenir avec le même code tant que la partie n’a pas commencé.'}</Texte>
        <Bouton titre={estHote ? 'Fermer le salon' : 'Quitter'} onPress={quitter} chargement={enCours} />
        <Bouton titre="Rester" variante="contour" onPress={() => setConfirmerDepart(false)} desactive={enCours} />
      </Dialogue>

      <Dialogue visible={Boolean(aExclure)}>
        <Titre taille={22}>Exclure {aExclure?.pseudo} ?</Titre>
        <Texte>Ce joueur quitte le salon et ne pourra plus le rejoindre avec ce code.</Texte>
        <Bouton
          titre="Exclure"
          chargement={enCours}
          onPress={() => {
            const cible = aExclure;
            setAExclure(null);
            executer(() => exclureJoueur(partie.id, cible.joueur_id));
          }}
        />
        <Bouton titre="Annuler" variante="contour" onPress={() => setAExclure(null)} />
      </Dialogue>
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
  gras: { fontWeight: '600' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: couleurs.corailClair, alignItems: 'center', justifyContent: 'center' },
  exclure: { borderWidth: 1, borderColor: couleurs.grisClair, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  numero: { width: 32, height: 32, borderRadius: 16, backgroundColor: couleurs.corailClair, alignItems: 'center', justifyContent: 'center' },
});
