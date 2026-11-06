// Écrans 06, 07, 09, 10, 11, 12, 21 et 22 réunis : la partie, du compte à rebours à la fin
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Bouton from '@/components/Bouton';
import Carte from '@/components/Carte';
import CarteJeu from '@/components/CarteJeu';
import CompteARebours from '@/components/CompteARebours';
import Dialogue from '@/components/Dialogue';
import Ecran from '@/components/Ecran';
import { IconeBonus, PastilleRarete } from '@/components/IconeBonus';
import IconeRole from '@/components/IconeRole';
import ModePoche, { IconeCadenas } from '@/components/ModePoche';
import { Petit, Texte, Titre } from '@/components/Texte';
import { BONUS, BONUS_CHAT, BONUS_SOURIS, RARETES, REGLE_RETRECISSEMENT, REGLES_BONUS, direction } from '@/lib/bonus';
import { chrono, distanceMetres } from '@/lib/geo';
import {
  activerBonus,
  animerPartie,
  arbitrerCapture,
  arbitrerPhoto,
  chargerPartie,
  choisirBonus,
  contesterPhoto,
  declarerCapture,
  ecouterPartie,
  envoyerPosition,
  etatJeu,
  expirerCaptures,
  lienPhoto,
  listerCaptures,
  listerPhotos,
  quitterPartie,
  ramasserBalise,
  repondreCapture,
  signalerCapture,
  sortieDeZone,
  terminerPartie,
  validerPhoto,
  verifierFin,
} from '@/lib/parties';
import { useSession } from '@/lib/session';
import { dansNavigateur } from '@/lib/environnement';
import { jouerSon } from '@/lib/sons';
import { arreterSuivi, demarrerSuivi, suiviDeFondDisponible } from '@/lib/suivi';
import { couleurs as theme, palette as couleurs, polices } from '@/theme';

const INTERVALLE_MS = 20000; // captures sans réponse, balises et fin de partie vérifiées toutes les 20 secondes
const INTERVALLE_RAPIDE_MS = 5000; // position envoyée et carte relue toutes les 5 secondes (la base applique les 20 s)
const FIN_BONUS_MS = 120000; // plus de bonus dans les 2 dernières minutes
const NOUVEL_ESSAI_BALISE_MS = 6000;
const DELAI_REPONSE_S = 30; // une capture sans réponse est validée au bout de 30 secondes
const DUREE_TRANSFORMATION_MS = 4000; // durée de l'écran « Tu deviens chat »
const DELAI_ANNULATION_MS = 5000; // le chat peut annuler une capture pendant 5 secondes
const ALERTE_BORD_M = 50; // la souris est prévenue à 50 m du bord de la zone
const VERROUILLAGE_AUTO_MS = 25000; // version web : mode poche après 25 s sans toucher l'écran

const REGLES_JEU = [
  'Le chat touche une souris pour de vrai, puis le signale dans l’appli. La souris confirme ou conteste, l’hôte tranche.',
  'Une souris touchée devient chat. La partie s’arrête au bout du chrono ou quand il ne reste plus de souris.',
  'Les chats voient la position des souris toutes les 20 secondes. Les souris ne voient jamais les chats.',
  'Une souris marque des points en photographiant un chat, qui valide la photo.',
  'Sortir trop longtemps du cercle transforme une souris en chat.',
  'Reste sur les trottoirs, ne traverse jamais en courant, respecte les passants.',
];

// Il y a combien de temps, en clair
function ilYa(iso, maintenant) {
  const s = Math.max(0, Math.round((maintenant - new Date(iso).getTime()) / 1000));
  if (s < 60) return `il y a ${s} s`;
  return `il y a ${Math.round(s / 60)} min`;
}

// Pastille avec icône : le rôle ne dépend pas que de la couleur
function Pastille({ texte, fond, couleur, role }) {
  return (
    <View style={[styles.pastille, { backgroundColor: fond }]}>
      {role ? <IconeRole role={role} couleur={couleur} taille={13} /> : null}
      <Text style={[styles.pastilleTexte, { color: couleur }]}>{texte}</Text>
    </View>
  );
}

function Rond({ texte, onPress, libelle, children }) {
  return (
    <Pressable onPress={onPress} style={styles.rond} accessibilityRole="button" accessibilityLabel={libelle} hitSlop={6}>
      {children ?? <Text style={styles.rondTexte}>{texte}</Text>}
    </Pressable>
  );
}

// Emplacement du bonus en réserve, à gauche du bouton principal (maquette B-01)
function EmplacementBonus({ bonus, inactif, onPress }) {
  const b = bonus ? BONUS[bonus.type] : null;
  const r = b ? RARETES[b.rarete] : null;
  const desactive = !b || inactif;
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      accessibilityRole="button"
      accessibilityLabel={b ? `Bonus ${b.nom}, ${r.nom.toLowerCase()}. Appuie pour l’utiliser.` : 'Pas de bonus en réserve'}
      accessibilityState={{ disabled: desactive }}
      style={[styles.emplacement, b && { backgroundColor: r.fond, borderColor: r.texte, borderStyle: 'solid' }, b && inactif && { opacity: 0.45 }]}
    >
      <IconeBonus type={bonus?.type ?? 'vide'} couleur={b ? couleurs.craie : couleurs.grisClair} />
      <Text style={[styles.emplacementTexte, { color: b ? couleurs.craie : couleurs.grisClair }]} numberOfLines={1}>
        {b ? b.nom : 'Bonus'}
      </Text>
    </Pressable>
  );
}

// En-tête des fenêtres de bonus : icône, nom et rareté
function EnteteBonus({ type, titre }) {
  const b = BONUS[type];
  if (!b) return null;
  return (
    <View style={styles.enteteBonus}>
      <View style={[styles.rondBonus, { backgroundColor: RARETES[b.rarete].fond, borderColor: RARETES[b.rarete].texte }]}>
        <IconeBonus type={type} taille={26} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Titre taille={22}>{titre ?? b.nom}</Titre>
        <PastilleRarete rarete={b.rarete} />
      </View>
    </View>
  );
}

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
  const [maintenant, setMaintenant] = useState(Date.now());
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);
  const [choixCible, setChoixCible] = useState(false);
  const [horsZoneDepuis, setHorsZoneDepuis] = useState(null);
  const [devenuChatLe, setDevenuChatLe] = useState(null);
  const [suiviDeFond, setSuiviDeFond] = useState(null); // true, false, ou null tant qu'on ne sait pas
  const [captureEnAttente, setCaptureEnAttente] = useState(null); // { joueur, depuis } pendant les 5 s d'annulation
  const [panneau, setPanneau] = useState(null); // 'regles', 'menu', 'terminer', 'abandon', 'declarer'
  const [actionEnCours, setActionEnCours] = useState(false);
  const [poche, setPoche] = useState(false);
  const [etat, setEtat] = useState(null); // ce que la base me montre : souris, balises, bonus, cercle
  const [ecart, setEcart] = useState(0); // décalage entre l'horloge du téléphone et celle du serveur
  const [bonusObtenu, setBonusObtenu] = useState(null); // { type, offert } pour la fenêtre « Bonus obtenu »
  const [ongletAide, setOngletAide] = useState(null);
  const ramassage = useRef(null);
  const essaisBalise = useRef({});
  const idsRamasses = useRef(new Set());
  const idsConnus = useRef(new Set());
  const premierEtat = useRef(false);
  const signauxVus = useRef(new Set());
  const derniereTouche = useRef(Date.now());
  const positionRef = useRef(null);
  const roleAvant = useRef(null);
  const sortieEnvoyee = useRef(false);
  const finDemandee = useRef(false);
  const captureEnvoyee = useRef(null);

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
  // Zone de départ (cadre de la carte) et cercle de jeu actuel, qui peut rétrécir
  const zoneDepart = partie?.zone ? { latitude: partie.zone.latitude, longitude: partie.zone.longitude, rayon: partie.rayon_m } : null;
  const cercleJeu = etat?.cercle ?? zoneDepart;
  const centre = cercleJeu ? { latitude: cercleJeu.latitude, longitude: cercleJeu.longitude } : null;
  const rayonJeu = cercleJeu?.rayon ?? partie?.rayon_m;
  const distanceCentre = position && centre ? distanceMetres(position, centre) : null;
  const horsZone = commencee && !chronoFini && distanceCentre !== null && distanceCentre > rayonJeu;

  // Bonus : les heures viennent du serveur, corrigées du décalage d'horloge du téléphone
  const maintenantServeur = maintenant + ecart;
  const heureServeur = (iso) => (iso ? new Date(iso).getTime() : 0);
  const resteS = (iso) => Math.max(0, (heureServeur(iso) - maintenantServeur) / 1000);
  const bonusPartie = Boolean(partie?.bonus);
  const finProche = fin !== null && fin - maintenant < FIN_BONUS_MS;
  const mesBonus = etat?.mes_bonus ?? [];
  const bonusReserve = mesBonus.find((b) => b.statut === 'reserve') ?? null;
  const bonusPropose = mesBonus.find((b) => b.statut === 'propose') ?? null;
  const mesActifs = mesBonus.filter((b) => b.statut === 'actif' && heureServeur(b.fin_le) > maintenantServeur);
  const annonces = (etat?.annonces ?? []).filter((a) => heureServeur(a.fin_le) > maintenantServeur);
  const balises = (etat?.balises ?? []).filter((b) => heureServeur(b.expire_le) > maintenantServeur);
  const prochain = etat?.prochain && heureServeur(etat.prochain.le) - maintenantServeur <= 30000 ? etat.prochain : null;
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
            : bonusPropose
              ? 'remplacer'
              : bonusObtenu
                ? 'obtenu'
                : choixCible && estChat
                  ? 'cible'
                  : panneau;
  const photoAffichee = fenetre === 'photo' ? photoAValider : fenetre === 'photoArbitrage' ? photoAArbitrer : null;

  // Ce que je vois de la partie, filtré par la base selon mon rôle et les bonus en cours
  const lireEtat = useCallback(async () => {
    if (!partie?.id) return;
    const reponse = await etatJeu(partie.id);
    setEtat(reponse);
    setEcart(new Date(reponse.heure).getTime() - Date.now());
    setAutres(reponse.visibles ?? []);
  }, [partie?.id]);

  // Toutes les 5 s : j'envoie ma position et je relis la carte (souris, balises, bonus, cercle)
  useEffect(() => {
    if (!partie?.id || !moi || !commencee || partie.statut !== 'en_cours') return undefined;
    const rafraichir = async () => {
      try {
        if (positionRef.current) await envoyerPosition(partie.id, moi, positionRef.current);
        await lireEtat();
      } catch (e) {
        setErreur(e.message);
      }
    };
    rafraichir();
    const minuterie = setInterval(rafraichir, INTERVALLE_RAPIDE_MS);
    return () => clearInterval(minuterie);
  }, [partie?.id, partie?.statut, moi, commencee, monRole, lireEtat]);

  // Toutes les 20 s : captures sans réponse, vagues de balises, rétrécissement, fin de partie
  useEffect(() => {
    if (!partie?.id || !moi || !commencee || partie.statut !== 'en_cours') return undefined;
    const synchroniser = async () => {
      try {
        await expirerCaptures(partie.id);
        await animerPartie(partie.id);
        const statut = await verifierFin(partie.id);
        if (statut === 'terminee') charger();
      } catch (e) {
        setErreur(e.message);
      }
    };
    synchroniser();
    const minuterie = setInterval(synchroniser, INTERVALLE_MS);
    return () => clearInterval(minuterie);
  }, [partie?.id, partie?.statut, moi, commencee, charger]);

  // Une balise de mon camp à moins de 15 m (plus la marge du GPS) : je la ramasse, même en mode poche
  const baliseProche = useMemo(() => {
    if (!position || !balises.length) return null;
    let proche = null;
    for (const b of balises) {
      const distance = distanceMetres(position, b);
      if (!proche || distance < proche.distance) proche = { ...b, distance };
    }
    return proche;
  }, [position, balises]);

  useEffect(() => {
    if (!baliseProche || ramassage.current || finProche || !partie?.id) return;
    if (baliseProche.distance > 15 + Math.min(position?.accuracy ?? 0, 15)) return;
    if (Date.now() - (essaisBalise.current[baliseProche.id] ?? 0) < NOUVEL_ESSAI_BALISE_MS) return;
    essaisBalise.current[baliseProche.id] = Date.now();
    ramassage.current = baliseProche.id;
    (async () => {
      try {
        if (positionRef.current) await envoyerPosition(partie.id, moi, positionRef.current);
        const resultat = await ramasserBalise(partie.id, baliseProche.id);
        idsRamasses.current.add(resultat.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        jouerSon('succes');
        if (resultat.statut === 'reserve') setBonusObtenu({ type: resultat.type });
        await lireEtat();
      } catch {
        // Le serveur juge la balise trop loin (GPS imprécis) ou déjà prise : on réessaiera
      } finally {
        ramassage.current = null;
      }
    })();
  }, [baliseProche, finProche, partie?.id, moi, position?.accuracy, lireEtat]);

  // Un Flair offert (chat sans capture depuis 6 min) s'annonce comme un bonus ramassé
  useEffect(() => {
    if (!etat) return;
    for (const b of etat.mes_bonus ?? []) {
      if (b.statut !== 'reserve' || idsConnus.current.has(b.id)) continue;
      idsConnus.current.add(b.id);
      if (premierEtat.current && !idsRamasses.current.has(b.id) && b.type === 'flair') {
        setBonusObtenu({ type: 'flair', offert: true });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
    premierEtat.current = true;
  }, [etat]);

  // Une vibration pour chaque nouvel événement de bonus : pistage, piège, annonce, rétrécissement, alarme
  useEffect(() => {
    if (!etat) return;
    const signaux = [];
    if (etat.piste_jusqua) signaux.push(`piste:${etat.piste_jusqua}`);
    if (etat.revele_jusqua) signaux.push(`revele:${etat.revele_jusqua}`);
    for (const a of etat.annonces ?? []) if (a.joueur_id !== moi) signaux.push(`annonce:${a.id}`);
    if (etat.prochain) signaux.push(`prochain:${etat.prochain.le}`);
    for (const b of etat.mes_bonus ?? []) if (b.declenche_le) signaux.push(`piege:${b.id}`);
    if (etat.alarme?.length) signaux.push(`alarme:${Math.floor(Date.now() / 10000)}`);
    const nouveaux = signaux.filter((cle) => !signauxVus.current.has(cle));
    nouveaux.forEach((cle) => signauxVus.current.add(cle));
    if (nouveaux.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      jouerSon('alerte');
    }
  }, [etat, moi]);

  // Une souris qui devient chat voit l'écran 22 et le téléphone vibre
  useEffect(() => {
    if (roleAvant.current === 'souris' && monRole === 'chat') {
      setDevenuChatLe(Date.now());
      setChoixCible(false);
      setCaptureEnAttente(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      jouerSon('danger');
    }
    if (monRole) roleAvant.current = monRole;
  }, [monRole]);

  // Une capture me concerne : vibration d'alerte
  useEffect(() => {
    if (capturePourMoi) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      jouerSon('alerte');
    }
  }, [capturePourMoi?.id]);

  // Une souris m'a photographié : vibration d'alerte
  useEffect(() => {
    if (photoAValider) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      jouerSon('alerte');
    }
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
    if (horsZoneDepuis) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      jouerSon('danger');
    }
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
      jouerSon('succes');
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

  // Le chat a 5 secondes pour annuler une capture avant qu'elle parte
  useEffect(() => {
    if (!captureEnAttente || !partie?.id) return;
    if (maintenant - captureEnAttente.depuis < DELAI_ANNULATION_MS) return;
    if (captureEnvoyee.current === captureEnAttente.depuis) return;
    captureEnvoyee.current = captureEnAttente.depuis;
    const { joueur } = captureEnAttente;
    setCaptureEnAttente(null);
    agir(() => signalerCapture(partie.id, joueur.joueur_id), `Capture envoyée à ${joueur.pseudo}.`);
  }, [maintenant, captureEnAttente, partie?.id]);

  async function utiliserBonus(cible = null) {
    if (!bonusReserve) return;
    setActionEnCours(true);
    setErreur(null);
    try {
      await activerBonus(bonusReserve.id, cible);
      setPanneau(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await lireEtat();
    } catch (e) {
      setErreur(e.message);
      setPanneau(null);
    } finally {
      setActionEnCours(false);
    }
  }

  async function repondreProposition(prendre) {
    if (!bonusPropose) return;
    setActionEnCours(true);
    try {
      await choisirBonus(bonusPropose.id, prendre);
      await lireEtat();
    } catch (e) {
      setErreur(e.message);
    } finally {
      setActionEnCours(false);
    }
  }

  async function terminer() {
    setActionEnCours(true);
    try {
      await terminerPartie(partie.id);
      setPanneau(null);
      await charger();
    } catch (e) {
      setErreur(e.message);
      setPanneau(null);
    } finally {
      setActionEnCours(false);
    }
  }

  async function abandonner() {
    setActionEnCours(true);
    try {
      await quitterPartie(partie.id);
      await arreterSuivi().catch(() => {});
      router.replace('/');
    } catch (e) {
      setErreur(e.message);
      setPanneau(null);
    } finally {
      setActionEnCours(false);
    }
  }

  // Version web : sans toucher l'écran pendant 25 s, le mode poche s'active tout seul
  // (pas pendant une fenêtre ouverte ni pendant l'annulation d'une capture)
  useEffect(() => {
    if (!dansNavigateur || poche || !commencee || chronoFini || fenetre || captureEnAttente) return;
    if (maintenant - derniereTouche.current > VERROUILLAGE_AUTO_MS) setPoche(true);
  }, [maintenant, poche, commencee, chronoFini, fenetre, captureEnAttente]);

  // Les deux derniers événements de la partie, pour suivre ce qui se passe sans tout relire
  const evenements = useMemo(() => {
    if (!debut) return [];
    const nom = (id) => joueurs.find((j) => j.joueur_id === id)?.pseudo ?? 'Un joueur';
    const touches = captures.filter((c) => ['confirmee', 'validee'].includes(c.statut));
    const liste = touches.map((c) => ({ quand: c.cree_le, texte: `${nom(c.cible_id)} a été touché par ${nom(c.chat_id)}` }));
    for (const j of joueurs) {
      const devenu = j.devenu_chat_le ? new Date(j.devenu_chat_le).getTime() : null;
      if (j.role === 'chat' && devenu && devenu > debut + 1000 && !touches.some((c) => c.cible_id === j.joueur_id)) {
        liste.push({ quand: j.devenu_chat_le, texte: `${j.pseudo} est devenu chat` });
      }
    }
    for (const ph of photos) if (ph.statut === 'validee') liste.push({ quand: ph.cree_le, texte: `${nom(ph.souris_id)} a photographié ${nom(ph.chat_id)}` });
    return liste.sort((a, b) => new Date(b.quand) - new Date(a.quand)).slice(0, 2);
  }, [captures, joueurs, photos, debut]);

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

  const derniereMajSouris = autres.length ? autres.reduce((m, p) => (p.maj_le > m ? p.maj_le : m), autres[0].maj_le) : null;
  const procheDuBord = !estChat && distanceCentre !== null && !horsZone && rayonJeu - distanceCentre <= ALERTE_BORD_M;

  // Souris triées de la plus proche à la plus éloignée, d'après leur dernière position connue
  const ciblesPossibles = souris
    .map((j) => {
      const pos = autres.find((p) => p.joueur_id === j.joueur_id);
      return { ...j, distance: pos && position ? distanceMetres(position, pos) : null };
    })
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  const alertePoche = capturePourMoi
    ? `${pseudo(capturePourMoi.chat_id)} dit t'avoir touché`
    : photoAValider
      ? `${pseudo(photoAValider.souris_id)} t'a photographié`
      : captureAArbitrer || photoAArbitrer
        ? 'Une contestation attend ta décision'
        : resteHorsZone !== null
          ? `Hors zone : reviens dans le cercle (${chrono(resteHorsZone)})`
          : etat?.piste_jusqua && resteS(etat.piste_jusqua) > 0
            ? 'Un chat te piste en direct'
            : prochain
              ? `La zone rétrécit dans ${chrono(resteS(prochain.le))}`
              : null;

  // Bandeaux des bonus en cours, du plus urgent au moins urgent (3 au plus)
  const bandeaux = [];
  if (prochain) {
    bandeaux.push({ cle: 'prochain', ton: 'corail', texte: `La zone rétrécit dans ${chrono(resteS(prochain.le))} : rejoins le cercle en pointillés` });
  }
  if (etat?.revele_jusqua && resteS(etat.revele_jusqua) > 0) {
    bandeaux.push({ cle: 'revele', ton: 'corail', texte: `Piège ! Les chats te voient en direct (${chrono(resteS(etat.revele_jusqua))})` });
  }
  if (etat?.piste_jusqua && resteS(etat.piste_jusqua) > 0) {
    bandeaux.push({ cle: 'piste', ton: 'corail', texte: `Un chat te piste en direct (${chrono(resteS(etat.piste_jusqua))})` });
  }
  for (const a of annonces) {
    const avant = heureServeur(a.actif_le) > maintenantServeur;
    const reste = Math.ceil(resteS(a.fin_le));
    const nom = a.joueur_id === moi ? null : pseudo(a.joueur_id);
    if (a.type === 'rafle') {
      bandeaux.push({
        cle: a.id,
        ton: 'corail',
        texte: avant
          ? estChat
            ? `Rafle dans ${Math.ceil(resteS(a.actif_le))} s`
            : `Rafle dans ${Math.ceil(resteS(a.actif_le))} s : les chats te verront 20 s`
          : estChat
            ? `Rafle : toutes les souris en direct (${reste} s)`
            : `Rafle : les chats te voient en direct (${reste} s)`,
      });
    } else if (a.type === 'bouclier') {
      bandeaux.push({ cle: a.id, ton: 'or', texte: nom ? `Bouclier : ${nom} est intouchable encore ${reste} s` : `Bouclier actif : intouchable encore ${reste} s` });
    } else if (a.type === 'retrecissement') {
      bandeaux.push({ cle: a.id, ton: 'corail', texte: `Rétrécissement : zone réduite pendant ${chrono(reste)}` });
    } else if (a.type === 'brouillard') {
      bandeaux.push({ cle: a.id, ton: 'or', texte: estChat ? `Brouillard : les souris sont figées (${chrono(reste)})` : `Brouillard : les chats te voient figé (${chrono(reste)})` });
    }
  }
  for (const b of mesActifs) {
    const reste = chrono(resteS(b.fin_le));
    if (b.type === 'flair') bandeaux.push({ cle: b.id, ton: 'bleu', texte: `Flair : souris mises à jour toutes les 5 s (${reste})` });
    if (b.type === 'sonar') {
      const d = etat?.sonar ? direction(etat.sonar.cap) : null;
      bandeaux.push({ cle: b.id, ton: 'bleu', texte: d ? `Sonar ${d.fleche} souris la plus proche à ${etat.sonar.tranche}, vers ${d.texte}` : 'Sonar : aucune souris repérée' });
    }
    if (b.type === 'pistage') bandeaux.push({ cle: b.id, ton: 'bleu', texte: `Pistage de ${pseudo(b.cible_id)} en direct (${reste})` });
    if (b.type === 'piege') {
      const recent = b.declenche_le && maintenantServeur - heureServeur(b.declenche_le) < 30000;
      bandeaux.push({ cle: b.id, ton: recent ? 'corail' : 'bleu', texte: recent ? 'Une souris est tombée dans ton piège : elle est visible 30 s' : b.declenche_le ? 'Ton piège a servi' : `Piège posé (${reste})` });
    }
    if (b.type === 'alarme') {
      const proche = [...(etat?.alarme ?? [])].sort((x, y) => x.distance - y.distance)[0];
      const d = proche ? direction(proche.cap) : null;
      bandeaux.push({ cle: b.id, ton: proche ? 'corail' : 'bleu', texte: proche ? `Alarme ${d.fleche} chat à ${proche.distance} m, vers ${d.texte}` : `Alarme active (${reste})` });
    }
    if (b.type === 'leurre') bandeaux.push({ cle: b.id, ton: 'bleu', texte: `Leurre : ton point est figé pour les chats (${reste})` });
    if (b.type === 'cape') bandeaux.push({ cle: b.id, ton: 'bleu', texte: `Cape : tu es invisible (${reste})` });
    if (b.type === 'radar') bandeaux.push({ cle: b.id, ton: 'bleu', texte: `Radar : chats et pièges en direct (${reste})` });
  }
  const TONS = {
    corail: { fond: couleurs.corail, texte: couleurs.corailClair },
    or: { fond: couleurs.orFond, texte: couleurs.or },
    bleu: { fond: couleurs.rareFond, texte: couleurs.rare },
  };

  // Souris sous Bouclier : halo doré sur la carte des chats
  const boucliers = new Set(annonces.filter((a) => a.type === 'bouclier' && heureServeur(a.actif_le) <= maintenantServeur).map((a) => a.joueur_id));
  const pointsCarte = [
    ...(estChat
      ? autres.map((p) => ({ id: p.joueur_id, nom: pseudo(p.joueur_id), latitude: p.latitude, longitude: p.longitude, halo: boucliers.has(p.joueur_id) }))
      : []),
    ...(etat?.chats ?? []).map((c) => ({ id: c.joueur_id, nom: pseudo(c.joueur_id), latitude: c.latitude, longitude: c.longitude, genre: 'chat' })),
  ];

  return (
    <Ecran sombre defilant={false}>
      <View style={styles.racine} onTouchStart={() => (derniereTouche.current = Date.now())}>
      {/* En-tête : chrono et rôle en gros, règles et menu à portée de doigt */}
      <View style={styles.entete}>
        <Titre taille={36} couleur={couleurs.craie} style={{ flex: 1 }}>
          {chrono((fin - maintenant) / 1000)}
        </Titre>
        <Pastille
          texte={estChat ? 'Chat' : 'Souris'}
          fond={estChat ? couleurs.corail : couleurs.vert}
          couleur={estChat ? couleurs.corailClair : couleurs.vertClair}
          role={estChat ? 'chat' : 'souris'}
        />
        <Pastille
          texte={String(estChat ? souris.length : chats.length)}
          fond={couleurs.nuit}
          couleur={couleurs.craie}
          role={estChat ? 'souris' : 'chat'}
        />
        <Rond libelle="Mode poche" onPress={() => setPoche(true)}>
          <IconeCadenas />
        </Rond>
        <Rond texte="?" libelle="Règles du jeu" onPress={() => setPanneau('regles')} />
        <Rond texte="•••" libelle={estHote ? 'Menu de l’hôte' : 'Menu'} onPress={() => setPanneau('menu')} />
      </View>

      {/* Fil d'événements */}
      <View style={styles.fil} accessibilityLiveRegion="polite">
        {evenements.length > 0 ? (
          evenements.map((e, i) => (
            <View key={`${e.quand}-${i}`} style={[styles.evenement, i > 0 && { opacity: 0.6 }]}>
              <View style={[styles.puce, { backgroundColor: estChat ? couleurs.corail : couleurs.vertVif }]} />
              <Petit couleur={couleurs.craie} style={{ flex: 1 }}>
                {e.texte}, {ilYa(e.quand, maintenant)}
              </Petit>
            </View>
          ))
        ) : (
          <Petit couleur={couleurs.craie}>
            {estChat
              ? `${souris.length} souris en jeu. Bonne chasse !`
              : `${souris.length} souris en jeu · ${moiJoueur.photos_validees} photo${moiJoueur.photos_validees > 1 ? 's' : ''} validée${moiJoueur.photos_validees > 1 ? 's' : ''}`}
          </Petit>
        )}
      </View>

      {bandeaux.slice(0, 3).map((b) => (
        <View key={b.cle} style={[styles.bandeau, { backgroundColor: TONS[b.ton].fond }]} accessibilityLiveRegion="polite">
          <Texte gras couleur={TONS[b.ton].texte}>
            {b.texte}
          </Texte>
        </View>
      ))}

      {procheDuBord && (
        <View style={styles.alerte}>
          <Texte gras couleur={couleurs.encre}>
            Bord de zone à {Math.max(0, Math.round(rayonJeu - distanceCentre))} m
          </Texte>
        </View>
      )}

      {/* Écran 12 : compte à rebours hors zone */}
      {resteHorsZone !== null && (
        <Carte style={{ backgroundColor: couleurs.corail, alignItems: 'center' }}>
          <Texte gras couleur={couleurs.corailClair}>
            Tu es hors zone, à {Math.round(distanceCentre - rayonJeu)} m du bord
          </Texte>
          <Titre taille={40} couleur={couleurs.craie}>
            {chrono(resteHorsZone)}
          </Titre>
          <Petit couleur={couleurs.corailClair} centre>
            Reviens dans le cercle avant la fin, sinon tu deviens chat.
          </Petit>
        </Carte>
      )}

      <View style={styles.carte}>
        <CarteJeu
          cadre={zoneDepart}
          centre={centre}
          rayon={rayonJeu}
          prochain={prochain}
          points={pointsCarte}
          balises={balises.map((b) => ({ ...b, camp: monRole, nom: chrono(resteS(b.expire_le)) }))}
          pieges={etat?.pieges ?? []}
        />
      </View>

      {/* Légende de la carte */}
      <View style={styles.legende}>
        {estChat && (
          <View style={styles.cle}>
            <View style={[styles.point, { backgroundColor: couleurs.vertVif }]} />
            <Petit couleur={couleurs.grisClair}>Souris</Petit>
          </View>
        )}
        <View style={styles.cle}>
          <View style={[styles.point, { backgroundColor: '#378ADD' }]} />
          <Petit couleur={couleurs.grisClair}>Toi</Petit>
        </View>
        <Petit couleur={couleurs.grisClair} style={{ flex: 1, textAlign: 'right' }}>
          {estChat
            ? derniereMajSouris
              ? `Positions : ${ilYa(derniereMajSouris, maintenant)}`
              : 'Positions : en attente'
            : etat?.chats
              ? 'Radar : chats en corail'
              : 'Les chats sont invisibles'}
        </Petit>
      </View>

      {mesSignalements.map((c) => (
        <Carte key={c.id} sombre>
          <Petit couleur={couleurs.grisClair}>
            {c.statut === 'en_attente'
              ? `En attente de la réponse de ${pseudo(c.cible_id)} (${chrono(resteReponse(c.cree_le))})`
              : `${pseudo(c.cible_id)} conteste la capture, l'hôte tranche.`}
          </Petit>
        </Carte>
      ))}

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

      {/* Annulation possible pendant 5 secondes après « Toucher » */}
      {captureEnAttente && (
        <View style={styles.annulation} accessibilityLiveRegion="assertive">
          <Texte gras couleur={couleurs.encre} style={{ flex: 1 }}>
            Capture de {captureEnAttente.joueur.pseudo}
          </Texte>
          <Pressable onPress={() => setCaptureEnAttente(null)} style={styles.annuler} accessibilityRole="button">
            <Text style={styles.annulerTexte}>
              Annuler ({Math.max(0, Math.ceil((DELAI_ANNULATION_MS - (maintenant - captureEnAttente.depuis)) / 1000))} s)
            </Text>
          </Pressable>
        </View>
      )}

      {/* Action principale dans la zone du pouce */}
      {estChat ? (
        <View style={styles.actions}>
          {bonusPartie && (
            <EmplacementBonus
              bonus={bonusReserve}
              inactif={finProche}
              onPress={() => setPanneau(bonusReserve?.type === 'pistage' ? 'pistage' : 'activer')}
            />
          )}
          <Bouton titre="Toucher une souris" onPress={() => setChoixCible(true)} desactive={Boolean(captureEnAttente)} style={{ flex: 1 }} />
        </View>
      ) : (
        <>
          <View style={styles.actions}>
            {bonusPartie && <EmplacementBonus bonus={bonusReserve} inactif={finProche} onPress={() => setPanneau('activer')} />}
            <Bouton titre="Photographier un chat" variante="vert" onPress={() => router.push(`/photo/${partie.code}`)} style={{ flex: 1 }} />
          </View>
          <Bouton titre="J'ai été touché" variante="contourClair" onPress={() => setPanneau('declarer')} />
        </>
      )}

      {/* Utiliser son bonus (maquette B-03 pour le Pistage) */}
      <Dialogue visible={fenetre === 'activer'}>
        {bonusReserve && (
          <>
            <EnteteBonus type={bonusReserve.type} />
            <Texte>{BONUS[bonusReserve.type]?.effet}</Texte>
            <Bouton titre={`Activer ${BONUS[bonusReserve.type]?.nom ?? ''}`} onPress={() => utiliserBonus()} chargement={actionEnCours} />
            <Bouton titre="Plus tard" variante="contour" onPress={() => setPanneau(null)} desactive={actionEnCours} />
          </>
        )}
      </Dialogue>

      <Dialogue visible={fenetre === 'pistage'}>
        <Titre taille={22}>Qui pister ?</Titre>
        <Petit>Tu la verras en direct pendant 45 s, même sous Cape. Elle sera prévenue.</Petit>
        <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8 }}>
          {ciblesPossibles.map((j) => (
            <Pressable key={j.joueur_id} onPress={() => utiliserBonus(j.joueur_id)} style={styles.cible} accessibilityRole="button" disabled={actionEnCours}>
              <Texte gras style={{ flex: 1 }}>
                {j.pseudo}
              </Texte>
              <Petit>{j.distance !== null ? `${Math.round(j.distance)} m` : 'Position inconnue'}</Petit>
            </Pressable>
          ))}
        </ScrollView>
        <Bouton titre="Annuler, garder le bonus" variante="contour" onPress={() => setPanneau(null)} />
      </Dialogue>

      {/* Bonus ramassé ou offert (maquette B-02) */}
      <Dialogue visible={fenetre === 'obtenu'}>
        {bonusObtenu && (
          <>
            <Petit centre>{bonusObtenu.offert ? 'BONUS OFFERT' : 'BONUS OBTENU'}</Petit>
            <EnteteBonus type={bonusObtenu.type} />
            <Texte>
              {bonusObtenu.offert ? 'Tu n’as touché personne depuis 6 minutes. ' : ''}
              {BONUS[bonusObtenu.type]?.effet}
            </Texte>
            <Petit>Il t’attend dans l’emplacement bonus, en bas à gauche. Utilise-le quand tu veux.</Petit>
            <Bouton titre="Compris" onPress={() => setBonusObtenu(null)} />
          </>
        )}
      </Dialogue>

      {/* Nouveau bonus alors qu'on en porte déjà un (maquette B-07) */}
      <Dialogue visible={fenetre === 'remplacer'}>
        {bonusPropose && (
          <>
            <EnteteBonus type={bonusPropose.type} titre={`Nouveau bonus : ${BONUS[bonusPropose.type]?.nom ?? ''}`} />
            <Texte>{BONUS[bonusPropose.type]?.effet}</Texte>
            {bonusReserve && (
              <View style={styles.actuel}>
                <IconeBonus type={bonusReserve.type} couleur={theme.encre} />
                <Texte gras style={{ flex: 1 }}>
                  Tu portes déjà {BONUS[bonusReserve.type]?.nom}
                </Texte>
                <PastilleRarete rarete={BONUS[bonusReserve.type]?.rarete} />
              </View>
            )}
            <Petit>Tu ne gardes qu’un bonus à la fois. Celui que tu laisses est perdu.</Petit>
            <Bouton titre={`Prendre ${BONUS[bonusPropose.type]?.nom ?? ''}`} onPress={() => repondreProposition(true)} chargement={actionEnCours} />
            {bonusReserve && (
              <Bouton
                titre={`Garder ${BONUS[bonusReserve.type]?.nom ?? ''}`}
                variante="contour"
                onPress={() => repondreProposition(false)}
                desactive={actionEnCours}
              />
            )}
          </>
        )}
      </Dialogue>

      {/* Aide : la liste des bonus de chaque camp (maquette B-08) */}
      <Dialogue visible={fenetre === 'aideBonus'}>
        <Titre taille={22}>Les bonus</Titre>
        <View style={styles.onglets}>
          {['chat', 'souris'].map((camp) => {
            const actif = (ongletAide ?? (estChat ? 'chat' : 'souris')) === camp;
            return (
              <Pressable
                key={camp}
                onPress={() => setOngletAide(camp)}
                style={[styles.onglet, actif && { backgroundColor: theme.corail }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: actif }}
              >
                <Text style={[styles.ongletTexte, { color: actif ? couleurs.craie : theme.encre }]}>{camp === 'chat' ? 'Chat' : 'Souris'}</Text>
              </Pressable>
            );
          })}
        </View>
        <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 10 }}>
          {((ongletAide ?? (estChat ? 'chat' : 'souris')) === 'chat' ? BONUS_CHAT : BONUS_SOURIS).map((type) => (
            <View key={type} style={{ gap: 3 }}>
              <View style={styles.ligneBonus}>
                <Texte gras>{BONUS[type].nom}</Texte>
                <PastilleRarete rarete={BONUS[type].rarete} />
              </View>
              <Petit>{BONUS[type].effet}</Petit>
            </View>
          ))}
        </ScrollView>
        <Petit>Une vague de balises toutes les 4 min. Un seul bonus à la fois. Plus de bonus dans les 2 dernières minutes.</Petit>
        <Bouton titre="Fermer" variante="contour" onPress={() => setPanneau(null)} />
      </Dialogue>

      {/* Choix de la souris touchée */}
      <Dialogue visible={fenetre === 'cible'}>
        <Titre taille={20}>Qui as-tu touché ?</Titre>
        <Petit>Tu pourras annuler pendant 5 secondes. La souris devra ensuite confirmer.</Petit>
        <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
          {ciblesPossibles.map((j) => (
            <Pressable
              key={j.joueur_id}
              onPress={() => {
                setChoixCible(false);
                setCaptureEnAttente({ joueur: j, depuis: Date.now() });
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

      {/* Écran 10 : une souris confirme ou conteste, avec le temps restant */}
      <Dialogue visible={fenetre === 'capture'}>
        {capturePourMoi && (
          <>
            <Titre taille={22} centre>
              {pseudo(capturePourMoi.chat_id)} dit t'avoir touché·e
            </Titre>
            {capturePourMoi.distance_m !== null && (
              <Petit centre>
                À {Math.round(capturePourMoi.distance_m)} m de toi, {ilYa(capturePourMoi.cree_le, maintenant)}
              </Petit>
            )}
            <CompteARebours reste={resteReponse(capturePourMoi.cree_le)} total={DELAI_REPONSE_S} />
            <Petit centre>Sans réponse, la capture est validée si vous étiez proches.</Petit>
            <Bouton titre="Confirmer, je deviens chat" onPress={() => agir(() => repondreCapture(capturePourMoi.id, true))} />
            <Bouton
              titre="Contester"
              variante="contour"
              onPress={() => agir(() => repondreCapture(capturePourMoi.id, false), "Capture contestée, l'hôte va trancher.")}
            />
          </>
        )}
      </Dialogue>

      {/* Règles du jeu, accessibles à tout moment */}
      <Dialogue visible={fenetre === 'regles'}>
        <Titre taille={22}>Règles du jeu</Titre>
        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 8 }}>
          {[...REGLES_JEU, ...(bonusPartie ? REGLES_BONUS : []), ...(partie.retrecissement ? [REGLE_RETRECISSEMENT] : [])].map((r) => (
            <Texte key={r}>• {r}</Texte>
          ))}
        </ScrollView>
        {bonusPartie && <Bouton titre="Voir les bonus" onPress={() => setPanneau('aideBonus')} />}
        <Bouton titre="J'ai compris" variante="contour" onPress={() => setPanneau(null)} />
      </Dialogue>

      {/* Menu : l'hôte termine la partie, les autres peuvent abandonner */}
      <Dialogue visible={fenetre === 'menu'}>
        <Titre taille={22}>{estHote ? 'Menu de l’hôte' : 'Menu'}</Titre>
        {estHote ? (
          <Bouton titre="Terminer la partie" onPress={() => setPanneau('terminer')} />
        ) : (
          <Bouton titre="Abandonner la partie" onPress={() => setPanneau('abandon')} />
        )}
        <Bouton titre="Fermer" variante="contour" onPress={() => setPanneau(null)} />
      </Dialogue>

      <Dialogue visible={fenetre === 'terminer'}>
        <Titre taille={22}>Terminer la partie ?</Titre>
        <Texte>
          Les {souris.length} souris encore en jeu sont classées survivantes. Une partie de moins de 2 minutes ne rapporte pas d'XP.
        </Texte>
        <Bouton titre="Terminer maintenant" onPress={terminer} chargement={actionEnCours} />
        <Bouton titre="Continuer la partie" variante="contour" onPress={() => setPanneau(null)} desactive={actionEnCours} />
      </Dialogue>

      <Dialogue visible={fenetre === 'abandon'}>
        <Titre taille={22}>Abandonner ?</Titre>
        <Texte>{estChat ? 'Tu quittes la partie.' : 'Tu quittes la partie et tu comptes comme touché.'}</Texte>
        <Bouton titre="Abandonner" onPress={abandonner} chargement={actionEnCours} />
        <Bouton titre="Continuer la partie" variante="contour" onPress={() => setPanneau(null)} desactive={actionEnCours} />
      </Dialogue>

      {/* La souris se déclare touchée */}
      <Dialogue visible={fenetre === 'declarer'}>
        <Titre taille={22}>Qui t'a touché ?</Titre>
        <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8 }}>
          {chats.map((j) => (
            <Pressable
              key={j.joueur_id}
              onPress={() => {
                setPanneau(null);
                agir(() => declarerCapture(partie.id, j.joueur_id));
              }}
              style={styles.cible}
              accessibilityRole="button"
            >
              <Texte gras style={{ flex: 1 }}>
                {j.pseudo}
              </Texte>
            </Pressable>
          ))}
        </ScrollView>
        <Bouton titre="Annuler" variante="contour" onPress={() => setPanneau(null)} />
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
      </View>

      <ModePoche
        visible={poche}
        surDeverrouiller={() => {
          derniereTouche.current = Date.now();
          setPoche(false);
        }}
        chrono={chrono((fin - maintenant) / 1000)}
        role={estChat ? 'Tu es chat' : 'Tu es souris'}
        alerte={alertePoche}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  milieu: { justifyContent: 'center' },
  plein: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
  logo: { width: 160, height: 160 },
  photo: { width: '100%', height: 260, borderRadius: 12, backgroundColor: couleurs.grisClair },
  racine: { flex: 1, gap: 12 },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pastille: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  pastilleTexte: { fontFamily: polices.texteGras, fontSize: 13 },
  rond: { width: 36, height: 36, borderRadius: 18, backgroundColor: couleurs.nuit, alignItems: 'center', justifyContent: 'center' },
  rondTexte: { fontFamily: polices.texteGras, fontSize: 14, color: couleurs.craie },
  fil: { backgroundColor: couleurs.nuit, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, gap: 6 },
  evenement: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  puce: { width: 8, height: 8, borderRadius: 4 },
  alerte: { backgroundColor: couleurs.ambre, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  bandeau: { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  actions: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  emplacement: {
    width: 76,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: couleurs.gris,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  emplacementTexte: { fontFamily: polices.texteGras, fontSize: 11 },
  enteteBonus: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rondBonus: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  actuel: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.craie, borderRadius: 14, padding: 12 },
  onglets: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, backgroundColor: theme.grisClair },
  onglet: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  ongletTexte: { fontFamily: polices.texteGras, fontSize: 14 },
  ligneBonus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  carte: { flex: 1, borderRadius: 18, overflow: 'hidden', minHeight: 240 },
  legende: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cle: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  point: { width: 10, height: 10, borderRadius: 5 },
  annulation: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: couleurs.craie, borderRadius: 14, paddingVertical: 8, paddingLeft: 16, paddingRight: 8 },
  annuler: { backgroundColor: couleurs.encre, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  annulerTexte: { fontFamily: polices.texteGras, fontSize: 14, color: couleurs.craie },
  cible: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.craie, // dans les fenêtres, qui suivent le thème jour ou nuit
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
