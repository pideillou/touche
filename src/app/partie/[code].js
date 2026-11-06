// Écrans 06, 07, 09, 10, 11, 12, 21 et 22 réunis : la partie, du compte à rebours à la fin
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Bouton from '@/components/Bouton';
import Carte from '@/components/Carte';
import CarteJeu from '@/components/CarteJeu';
import Dialogue from '@/components/Dialogue';
import Ecran from '@/components/Ecran';
import Etiquette from '@/components/Etiquette';
import { Petit, Texte, Titre } from '@/components/Texte';
import { chrono, distanceMetres } from '@/lib/geo';
import {
  arbitrerCapture,
  arbitrerPhoto,
  chargerPartie,
  contesterPhoto,
  ecouterPartie,
  envoyerPosition,
  expirerCaptures,
  lienPhoto,
  lirePositions,
  listerCaptures,
  listerPhotos,
  repondreCapture,
  signalerCapture,
  sortieDeZone,
  validerPhoto,
  verifierFin,
} from '@/lib/parties';
import { useSession } from '@/lib/session';
import { arreterSuivi, demarrerSuivi, suiviDeFondDisponible } from '@/lib/suivi';
import { couleurs } from '@/theme';

const INTERVALLE_MS = 20000; // positions envoyées et relues toutes les 20 secondes
const DELAI_REPONSE_S = 30; // une capture sans réponse est validée au bout de 30 secondes
const DUREE_TRANSFORMATION_MS = 4000; // durée de l'écran « Tu deviens chat »

export default function Partie() {
  const { code } = useLocalSearchParams();
  const { session } = useSession();
  const moi = session?.user?.id;
  useKeepAwake(); // l'écran ne se met pas en veille pendant la partie

  const [partie, setPartie] = useState(null);
  const [joueurs, setJoueurs] = useState([]);
  const [captures, setCaptures] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [urlPhoto, setUrlPhoto] = useState(null);
  const [photosIgnorees, setPhotosIgnorees] = useState([]);
  const [position, setPosition] = useState(null);
  const [autres, setAutres] = useState([]);
  const [derniereSynchro, setDerniereSynchro] = useState(null);
  const [maintenant, setMaintenant] = useState(Date.now());
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);
  const [choixCible, setChoixCible] = useState(false);
  const [horsZoneDepuis, setHorsZoneDepuis] = useState(null);
  const [devenuChatLe, setDevenuChatLe] = useState(null);
  const [suiviDeFond, setSuiviDeFond] = useState(null); // true, false, ou null tant qu'on ne sait pas
  const positionRef = useRef(null);
  const roleAvant = useRef(null);
  const sortieEnvoyee = useRef(false);
  const finDemandee = useRef(false);

  const charger = useCallback(async () => {
    try {
      const resultat = await chargerPartie(code);
      setPartie(resultat.partie);
      setJoueurs(resultat.joueurs);
      setCaptures(await listerCaptures(resultat.partie.id));
      setPhotos(await listerPhotos(resultat.partie.id));
    } catch (e) {
      setErreur(e.message);
    }
  }, [code]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Rôles, captures et statut de la partie changent en direct
  useEffect(() => {
    if (!partie?.id) return undefined;
    return ecouterPartie(partie.id, charger);
  }, [partie?.id, charger]);

  // Horloge de l'écran (chrono, comptes à rebours)
  useEffect(() => {
    const minuterie = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(minuterie);
  }, []);

  // Suivi GPS au premier plan (le suivi écran éteint demandera une version installable de l'appli)
  useEffect(() => {
    let abonnement;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErreur('Touché a besoin de ta position pour jouer. Autorise-la dans les réglages du téléphone.');
        return;
      }
      abonnement = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 2 },
        (lieu) => {
          positionRef.current = lieu.coords;
          setPosition(lieu.coords);
        },
      );
    })();
    return () => abonnement?.remove();
  }, []);

  // ---------- Valeurs calculées (même quand la partie n'est pas encore chargée) ----------
  const moiJoueur = joueurs.find((j) => j.joueur_id === moi);
  const monRole = moiJoueur?.role;
  const estChat = monRole === 'chat';
  const estHote = partie?.hote_id === moi;
  const debut = partie?.debut_le ? new Date(partie.debut_le).getTime() : null;
  const fin = partie?.fin_le ? new Date(partie.fin_le).getTime() : null;
  const commencee = debut !== null && maintenant >= debut;
  const chronoFini = fin !== null && maintenant >= fin;
  const centre = partie?.zone ? { latitude: partie.zone.latitude, longitude: partie.zone.longitude } : null;
  const distanceCentre = position && centre ? distanceMetres(position, centre) : null;
  const horsZone = commencee && !chronoFini && distanceCentre !== null && distanceCentre > partie.rayon_m;
  const resteHorsZone = horsZoneDepuis && partie ? partie.delai_hors_zone_s - (maintenant - horsZoneDepuis) / 1000 : null;
  const delaiHorsZoneEcoule = resteHorsZone !== null && resteHorsZone <= 0;
  const capturePourMoi = captures.find((c) => c.cible_id === moi && c.statut === 'en_attente');
  const captureAArbitrer = estHote ? captures.find((c) => c.statut === 'contestee') : null;
  const mesSignalements = captures.filter((c) => c.chat_id === moi && ['en_attente', 'contestee'].includes(c.statut));
  const pseudo = (id) => joueurs.find((j) => j.joueur_id === id)?.pseudo ?? 'Un joueur';
  const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const resteReponse = (iso) => DELAI_REPONSE_S - (maintenant - new Date(iso).getTime()) / 1000;
  const photoAValider = estChat ? photos.find((p) => p.chat_id === moi && p.statut === 'en_attente') : null;
  const photoAArbitrer = estHote ? photos.find((p) => p.statut === 'contestee') : null;
  const photoRefusee = photos.find((p) => p.souris_id === moi && p.statut === 'refusee' && !photosIgnorees.includes(p.id));

  // Une seule fenêtre à la fois, de la plus urgente à la moins urgente
  const fenetre = capturePourMoi
    ? 'capture'
    : captureAArbitrer
      ? 'arbitrage'
      : photoAValider
        ? 'photo'
        : photoAArbitrer
          ? 'photoArbitrage'
          : photoRefusee
            ? 'photoRefusee'
            : choixCible && estChat
              ? 'cible'
              : null;
  const photoAffichee = fenetre === 'photo' ? photoAValider : fenetre === 'photoArbitrage' ? photoAArbitrer : null;

  // Toutes les 20 s : j'envoie ma position, je valide les captures sans réponse,
  // je vérifie la fin de partie, et si je suis chat je relis la position des souris
  useEffect(() => {
    if (!partie?.id || !moi || !commencee || partie.statut !== 'en_cours') return undefined;
    const synchroniser = async () => {
      try {
        if (positionRef.current) await envoyerPosition(partie.id, moi, positionRef.current);
        await expirerCaptures(partie.id);
        const statut = await verifierFin(partie.id);
        if (statut === 'terminee') {
          charger();
          return;
        }
        const liste = await lirePositions(partie.id);
        setAutres(liste.filter((p) => p.joueur_id !== moi));
        setDerniereSynchro(Date.now());
      } catch (e) {
        setErreur(e.message);
      }
    };
    synchroniser();
    const minuterie = setInterval(synchroniser, INTERVALLE_MS);
    return () => clearInterval(minuterie);
  }, [partie?.id, partie?.statut, moi, commencee, monRole, charger]);

  // Une souris qui devient chat voit l'écran 22 et le téléphone vibre
  useEffect(() => {
    if (roleAvant.current === 'souris' && monRole === 'chat') {
      setDevenuChatLe(Date.now());
      setChoixCible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    if (monRole) roleAvant.current = monRole;
  }, [monRole]);

  // Une capture me concerne : vibration d'alerte
  useEffect(() => {
    if (capturePourMoi) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [capturePourMoi?.id]);

  // Une souris m'a photographié : vibration d'alerte
  useEffect(() => {
    if (photoAValider) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [photoAValider?.id]);

  // Le stockage des photos est privé : on demande un lien temporaire pour l'afficher
  useEffect(() => {
    setUrlPhoto(null);
    if (!photoAffichee) return;
    lienPhoto(photoAffichee.chemin)
      .then(setUrlPhoto)
      .catch((e) => setErreur(e.message));
  }, [photoAffichee?.id, photoAffichee?.chemin]);

  // Hors zone : on lance le compte à rebours, avec une vibration forte
  useEffect(() => {
    if (horsZone && !estChat) {
      setHorsZoneDepuis((depuis) => depuis ?? Date.now());
    } else {
      setHorsZoneDepuis(null);
      sortieEnvoyee.current = false;
    }
  }, [horsZone, estChat]);

  useEffect(() => {
    if (horsZoneDepuis) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, [horsZoneDepuis]);

  // Délai écoulé hors zone : la base vérifie la position et transforme la souris en chat
  useEffect(() => {
    if (!delaiHorsZoneEcoule || sortieEnvoyee.current || !partie?.id) return;
    sortieEnvoyee.current = true;
    (async () => {
      try {
        if (positionRef.current) await envoyerPosition(partie.id, moi, positionRef.current);
        await sortieDeZone(partie.id);
        await charger();
      } catch (e) {
        setErreur(e.message);
      }
    })();
  }, [delaiHorsZoneEcoule, partie?.id, moi, charger]);

  // Fin du chrono : on demande à la base de clore la partie
  useEffect(() => {
    if (!chronoFini || finDemandee.current || !partie?.id) return;
    finDemandee.current = true;
    verifierFin(partie.id)
      .then(charger)
      .catch((e) => setErreur(e.message));
  }, [chronoFini, partie?.id, charger]);

  // Pendant la partie, la position continue d'être envoyée écran éteint (version installable)
  useEffect(() => {
    if (!partie?.id || !moi || !commencee || partie.statut !== 'en_cours') return;
    demarrerSuivi(partie.id, moi)
      .then(setSuiviDeFond)
      .catch(() => setSuiviDeFond(false));
  }, [partie?.id, partie?.statut, moi, commencee]);

  // Partie close : on coupe le suivi et direction l'écran de fin
  useEffect(() => {
    if (partie?.statut === 'terminee') {
      arreterSuivi().catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace(`/fin/${partie.code}`);
    }
  }, [partie?.statut, partie?.code]);

  async function agir(fonction, succes) {
    setErreur(null);
    try {
      await fonction();
      setMessage(succes ?? null);
      await charger();
    } catch (e) {
      setErreur(e.message);
    }
  }

  // ---------- Affichage ----------

  if (!partie || !moiJoueur) {
    return (
      <Ecran sombre>
        <Texte couleur={erreur ? couleurs.saumon : couleurs.grisClair}>{erreur || 'Chargement de la partie…'}</Texte>
      </Ecran>
    );
  }

  const chats = joueurs.filter((j) => j.role === 'chat');
  const souris = joueurs.filter((j) => j.role === 'souris');

  // Écran 21 : compte à rebours avant le départ
  if (!commencee) {
    return (
      <Ecran sombre style={styles.milieu}>
        <Petit couleur={couleurs.grisClair} centre>
          La partie commence dans
        </Petit>
        <Titre taille={96} couleur={couleurs.craie} centre>
          {chrono((debut - maintenant) / 1000)}
        </Titre>
        <Carte style={{ backgroundColor: estChat ? couleurs.corail : couleurs.vert, alignItems: 'center', padding: 18 }}>
          <Titre couleur={estChat ? couleurs.corailClair : couleurs.vertClair}>{estChat ? 'Tu es chat' : 'Tu es souris'}</Titre>
          <Petit couleur={estChat ? couleurs.corailClair : couleurs.vertClair} centre>
            {estChat
              ? 'Touche les souris pour les contaminer. Tu verras leur position toutes les 20 secondes.'
              : 'Ne te fais pas toucher. Les chats sont invisibles sur ta carte.'}
          </Petit>
        </Carte>
        <Petit couleur={couleurs.grisClair} centre>
          {chats.map((c) => c.pseudo).join(' et ')} {chats.length > 1 ? 'sont les chats' : 'est le chat'}
        </Petit>
      </Ecran>
    );
  }

  // Écran 22 : tu deviens chat
  if (devenuChatLe && maintenant - devenuChatLe < DUREE_TRANSFORMATION_MS) {
    return (
      <View style={[styles.plein, { backgroundColor: couleurs.corail }]}>
        <Image source={require('../../../assets/logo-chat.png')} style={styles.logo} accessibilityIgnoresInvertColors />
        <Titre taille={36} couleur={couleurs.craie} centre>
          Tu deviens chat
        </Titre>
        <Texte couleur={couleurs.corailClair} centre>
          À ton tour de chasser les souris.
        </Texte>
      </View>
    );
  }

  const prochaineMaj = derniereSynchro ? (derniereSynchro + INTERVALLE_MS - maintenant) / 1000 : null;

  // Souris triées de la plus proche à la plus éloignée, d'après leur dernière position connue
  const ciblesPossibles = souris
    .map((j) => {
      const pos = autres.find((p) => p.joueur_id === j.joueur_id);
      return { ...j, distance: pos && position ? distanceMetres(position, pos) : null };
    })
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  return (
    <Ecran sombre defilant={false}>
      <View style={styles.entete}>
        <Titre taille={28} couleur={couleurs.craie}>
          {chrono((fin - maintenant) / 1000)}
        </Titre>
        <Etiquette
          texte={estChat ? 'Chat' : 'Souris'}
          fond={estChat ? couleurs.corail : couleurs.vert}
          couleur={estChat ? couleurs.corailClair : couleurs.vertClair}
        />
        <Etiquette
          texte={estChat ? `${souris.length} souris` : `${moiJoueur.photos_validees} photo${moiJoueur.photos_validees > 1 ? 's' : ''}`}
          fond={couleurs.nuit}
          couleur={couleurs.craie}
        />
      </View>

      <View style={styles.carte}>
        <CarteJeu
          centre={centre}
          rayon={partie.rayon_m}
          points={estChat ? autres.map((p) => ({ id: p.joueur_id, nom: pseudo(p.joueur_id), latitude: p.latitude, longitude: p.longitude })) : []}
        />
      </View>

      {/* Écran 12 : compte à rebours hors zone */}
      {resteHorsZone !== null && (
        <Carte style={{ backgroundColor: couleurs.corail, alignItems: 'center' }}>
          <Texte gras couleur={couleurs.corailClair}>
            Tu es hors zone, à {Math.round(distanceCentre - partie.rayon_m)} m du bord
          </Texte>
          <Titre taille={40} couleur={couleurs.craie}>
            {chrono(resteHorsZone)}
          </Titre>
          <Petit couleur={couleurs.corailClair} centre>
            Reviens dans le cercle avant la fin, sinon tu deviens chat.
          </Petit>
        </Carte>
      )}

      {mesSignalements.map((c) => (
        <Carte key={c.id} sombre>
          <Petit couleur={couleurs.grisClair}>
            {c.statut === 'en_attente'
              ? `En attente de la réponse de ${pseudo(c.cible_id)} (${chrono(resteReponse(c.cree_le))})`
              : `${pseudo(c.cible_id)} conteste la capture, l'hôte tranche.`}
          </Petit>
        </Carte>
      ))}

      <Petit couleur={couleurs.grisClair} centre>
        {estChat
          ? `Position exacte des souris, prochaine mise à jour dans ${prochaineMaj !== null ? chrono(prochaineMaj) : '…'}`
          : distanceCentre !== null
            ? `Les chats sont invisibles. Bord de zone à ${Math.max(0, Math.round(partie.rayon_m - distanceCentre))} m.`
            : 'Recherche de ta position…'}
      </Petit>
      {suiviDeFond === false && (
        <Petit couleur={couleurs.ambre} centre>
          {suiviDeFondDisponible
            ? "Sans l'accès à la position « Toujours », ta position s'arrête quand l'écran s'éteint."
            : "Sur cette version, l'écran reste allumé pendant la partie : ne le verrouille pas et garde Touché ouvert, sinon ta position s'arrête."}
        </Petit>
      )}
      {message && (
        <Petit couleur={couleurs.vertVif} centre>
          {message}
        </Petit>
      )}
      {erreur && (
        <Petit couleur={couleurs.saumon} centre>
          {erreur}
        </Petit>
      )}
      {estChat ? (
        <Bouton titre="J'ai touché quelqu'un" onPress={() => setChoixCible(true)} />
      ) : (
        <Bouton titre="Photographier un chat" variante="vert" onPress={() => router.push(`/photo/${partie.code}`)} />
      )}

      {/* Choix de la souris touchée */}
      <Dialogue visible={fenetre === 'cible'}>
        <Titre taille={20}>Qui as-tu touché ?</Titre>
        <Petit>La souris devra confirmer. Sans réponse sous {DELAI_REPONSE_S} s, la capture compte.</Petit>
        <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
          {ciblesPossibles.map((j) => (
            <Pressable
              key={j.joueur_id}
              onPress={() => {
                setChoixCible(false);
                agir(() => signalerCapture(partie.id, j.joueur_id), `Capture envoyée à ${j.pseudo}.`);
              }}
              style={styles.cible}
              accessibilityRole="button"
            >
              <Texte gras style={{ flex: 1 }}>
                {j.pseudo}
              </Texte>
              <Petit>{j.distance !== null ? `${Math.round(j.distance)} m` : 'Position inconnue'}</Petit>
            </Pressable>
          ))}
          {ciblesPossibles.length === 0 && <Texte>Il ne reste plus de souris.</Texte>}
        </ScrollView>
        <Bouton titre="Annuler" variante="contour" onPress={() => setChoixCible(false)} />
      </Dialogue>

      {/* Écran 10 : une souris confirme ou conteste */}
      <Dialogue visible={fenetre === 'capture'}>
        {capturePourMoi && (
          <>
            <Titre taille={20} centre>
              {pseudo(capturePourMoi.chat_id)} dit t'avoir touché·e
            </Titre>
            {capturePourMoi.distance_m !== null && (
              <Petit centre>Distance au moment du signalement : {Math.round(capturePourMoi.distance_m)} m</Petit>
            )}
            <Bouton
              titre="Confirmer, je deviens chat"
              onPress={() => agir(() => repondreCapture(capturePourMoi.id, true))}
            />
            <Bouton
              titre="Contester"
              variante="contour"
              onPress={() => agir(() => repondreCapture(capturePourMoi.id, false), "Capture contestée, l'hôte va trancher.")}
            />
            <Petit centre>
              Sans réponse dans {chrono(resteReponse(capturePourMoi.cree_le))}, la
              capture est validée.
            </Petit>
          </>
        )}
      </Dialogue>

      {/* Écran 11 : l'hôte tranche une capture contestée */}
      <Dialogue visible={fenetre === 'arbitrage'}>
        {captureAArbitrer && (
          <>
            <Titre taille={20} centre>
              Capture contestée
            </Titre>
            <Texte centre>
              {pseudo(captureAArbitrer.chat_id)} dit avoir touché {pseudo(captureAArbitrer.cible_id)}, qui conteste.
            </Texte>
            {captureAArbitrer.distance_m !== null && (
              <Petit centre>Distance au moment du signalement : {Math.round(captureAArbitrer.distance_m)} m</Petit>
            )}
            <Bouton titre="Valider la capture" onPress={() => agir(() => arbitrerCapture(captureAArbitrer.id, true))} />
            <Bouton titre="Refuser" variante="contour" onPress={() => agir(() => arbitrerCapture(captureAArbitrer.id, false))} />
            <Petit centre>Visible uniquement par toi, l'hôte.</Petit>
          </>
        )}
      </Dialogue>

      {/* Écran 09 : le chat photographié valide ou refuse */}
      <Dialogue visible={fenetre === 'photo'}>
        {photoAValider && (
          <>
            <Titre taille={20} centre>
              Une souris t'a photographié
            </Titre>
            {urlPhoto ? <Image source={{ uri: urlPhoto }} style={styles.photo} /> : <View style={styles.photo} />}
            <Petit centre>
              {pseudo(photoAValider.souris_id)}, à {heure(photoAValider.cree_le)}
            </Petit>
            <Bouton titre="C'est bien moi" onPress={() => agir(() => validerPhoto(photoAValider.id, true))} />
            <Bouton titre="Ce n'est pas moi" variante="contour" onPress={() => agir(() => validerPhoto(photoAValider.id, false))} />
            <Petit centre>
              Sans réponse dans {chrono(resteReponse(photoAValider.cree_le))}, la photo est validée. Si la souris conteste un refus, l'hôte
              tranche.
            </Petit>
          </>
        )}
      </Dialogue>

      {/* La souris peut contester une photo refusée */}
      <Dialogue visible={fenetre === 'photoRefusee'}>
        {photoRefusee && (
          <>
            <Titre taille={20} centre>
              Photo refusée
            </Titre>
            <Texte centre>{pseudo(photoRefusee.chat_id)} dit que ce n'est pas lui sur ta photo.</Texte>
            <Bouton
              titre="Contester"
              onPress={() => agir(() => contesterPhoto(photoRefusee.id), "Photo contestée, l'hôte va trancher.")}
            />
            <Bouton titre="Laisser tomber" variante="contour" onPress={() => setPhotosIgnorees((liste) => [...liste, photoRefusee.id])} />
          </>
        )}
      </Dialogue>

      {/* L'hôte tranche une photo contestée */}
      <Dialogue visible={fenetre === 'photoArbitrage'}>
        {photoAArbitrer && (
          <>
            <Titre taille={20} centre>
              Photo contestée
            </Titre>
            {urlPhoto ? <Image source={{ uri: urlPhoto }} style={styles.photo} /> : <View style={styles.photo} />}
            <Texte centre>
              {pseudo(photoAArbitrer.souris_id)} dit avoir photographié {pseudo(photoAArbitrer.chat_id)}, qui refuse.
            </Texte>
            <Bouton titre="Valider la photo" onPress={() => agir(() => arbitrerPhoto(photoAArbitrer.id, true))} />
            <Bouton titre="Refuser" variante="contour" onPress={() => agir(() => arbitrerPhoto(photoAArbitrer.id, false))} />
            <Petit centre>Visible uniquement par toi, l'hôte.</Petit>
          </>
        )}
      </Dialogue>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  milieu: { justifyContent: 'center' },
  plein: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
  logo: { width: 160, height: 160 },
  photo: { width: '100%', height: 260, borderRadius: 12, backgroundColor: couleurs.grisClair },
  entete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  carte: { flex: 1, borderRadius: 18, overflow: 'hidden', minHeight: 260 },
  cible: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: couleurs.craie,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
