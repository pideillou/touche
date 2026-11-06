// Toutes les requêtes liées aux parties. Les écrans n'appellent que ces fonctions.
import { traduireErreur } from './erreurs';
import { supabase } from './supabase';

// Appelle une fonction SQL (voir supabase/schema.sql) et renvoie son résultat
async function action(nom, parametres) {
  const { data, error } = await supabase.rpc(nom, parametres);
  if (error) throw new Error(traduireErreur(error.message));
  return data;
}

// Zones prédéfinies de toutes les villes (les zones « autour de l'hôte » sont exclues)
export async function listerZones() {
  const { data, error } = await supabase.from('zones').select('*').eq('perso', false).order('ville').order('ordre');
  if (error) throw new Error(traduireErreur(error.message));
  return data;
}

// Soit une zone de la liste (zoneId), soit une zone centrée sur l'hôte (position)
export const creerPartie = ({ zoneId, position, pseudo, rayon, duree, delai, invites, bonus = true, retrecissement = true }) =>
  action('creer_partie', {
    p_zone: position ? null : zoneId,
    p_pseudo: pseudo,
    p_rayon: rayon,
    p_duree: duree,
    p_delai: delai,
    p_invites: invites,
    p_bonus: bonus,
    p_retrecissement: retrecissement,
    ...(position ? { p_latitude: position.latitude, p_longitude: position.longitude } : {}),
  });

export const rejoindrePartie = (code, pseudo) => action('rejoindre_partie', { p_code: code, p_pseudo: pseudo });
export const accepterRegles = (partieId) => action('accepter_regles', { p_partie: partieId });
export const quitterPartie = (partieId) => action('quitter_partie', { p_partie: partieId });
export const exclureJoueur = (partieId, joueurId) => action('exclure_joueur', { p_partie: partieId, p_joueur: joueurId });
export const terminerPartie = (partieId) => action('terminer_partie', { p_partie: partieId });
export const declarerCapture = (partieId, chatId) => action('declarer_capture', { p_partie: partieId, p_chat: chatId });
export const lancerPartie = (partieId) => action('lancer_partie', { p_partie: partieId });

// Charge une partie (avec sa zone) et la liste de ses joueurs
export async function chargerPartie(code) {
  const { data: partie, error } = await supabase
    .from('parties')
    .select('*, zone:zones(*)')
    .eq('code', String(code).toUpperCase())
    .single();
  if (error) throw new Error('Partie introuvable.');
  const reponse = await supabase.from('joueurs').select('*').eq('partie_id', partie.id).order('rejoint_le');
  if (reponse.error) throw new Error(traduireErreur(reponse.error.message));
  return { partie, joueurs: reponse.data };
}

// Prévient l'écran dès qu'un joueur arrive, accepte les règles, est capturé, ou que la partie change
export function ecouterPartie(partieId, surChangement) {
  const canal = supabase
    .channel(`partie-${partieId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'joueurs', filter: `partie_id=eq.${partieId}` }, surChangement)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parties', filter: `id=eq.${partieId}` }, surChangement)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'captures', filter: `partie_id=eq.${partieId}` }, surChangement)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `partie_id=eq.${partieId}` }, surChangement)
    .subscribe();
  return () => supabase.removeChannel(canal);
}

export async function envoyerPosition(partieId, joueurId, coords) {
  const { error } = await supabase.from('positions').upsert({
    partie_id: partieId,
    joueur_id: joueurId,
    latitude: coords.latitude,
    longitude: coords.longitude,
    precision_m: coords.accuracy,
    maj_le: new Date().toISOString(),
  });
  if (error) throw new Error(traduireErreur(error.message));
}

// Ce que je vois de la partie : souris visibles (si je suis chat), balises de mon camp, mes bonus,
// bonus annoncés et cercle de jeu. La base applique les effets des bonus avant de répondre.
export const etatJeu = (partieId) => action('etat_jeu', { p_partie: partieId });

// Vagues de balises, Flair offert et rétrécissement final : n'importe quel téléphone peut faire avancer la partie
export const animerPartie = (partieId) => action('animer_partie', { p_partie: partieId });
export const ramasserBalise = (partieId, baliseId) => action('ramasser_balise', { p_partie: partieId, p_balise: baliseId });
export const choisirBonus = (bonusId, prendre) => action('choisir_bonus', { p_bonus: bonusId, p_prendre: prendre });
export const activerBonus = (bonusId, cibleId = null) => action('activer_bonus', { p_bonus: bonusId, p_cible: cibleId });

// ---------- Captures, sortie de zone et fin de partie ----------

export async function listerCaptures(partieId) {
  const { data, error } = await supabase.from('captures').select('*').eq('partie_id', partieId).order('cree_le');
  if (error) throw new Error(traduireErreur(error.message));
  return data;
}

export const signalerCapture = (partieId, cibleId) => action('signaler_capture', { p_partie: partieId, p_cible: cibleId });
export const repondreCapture = (captureId, confirme) => action('repondre_capture', { p_capture: captureId, p_confirme: confirme });
export const arbitrerCapture = (captureId, valide) => action('arbitrer_capture', { p_capture: captureId, p_valide: valide });
export const expirerCaptures = (partieId) => action('expirer_captures', { p_partie: partieId });
export const sortieDeZone = (partieId) => action('sortie_de_zone', { p_partie: partieId });
export const verifierFin = (partieId) => action('verifier_fin', { p_partie: partieId });

// ---------- Photos des chats ----------

// L'appareil photo donne l'image en base64, le stockage attend des octets
export function base64VersOctets(base64) {
  // Sur le web, l'appareil photo peut renvoyer « data:image/jpeg;base64,... »
  const binaire = atob(base64.replace(/^data:[^,]*,/, ''));
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i += 1) octets[i] = binaire.charCodeAt(i);
  return octets.buffer;
}

export async function listerPhotos(partieId) {
  const { data, error } = await supabase.from('photos').select('*').eq('partie_id', partieId).order('cree_le');
  if (error) throw new Error(traduireErreur(error.message));
  return data;
}

// Range la photo dans le dossier de la partie, puis l'enregistre pour validation par le chat
export async function envoyerPhoto(partieId, chatId, base64) {
  const chemin = `${partieId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from('photos').upload(chemin, base64VersOctets(base64), { contentType: 'image/jpeg' });
  if (error) throw new Error(traduireErreur(error.message));
  return action('envoyer_photo', { p_partie: partieId, p_chat: chatId, p_chemin: chemin });
}

// Le stockage est privé : on obtient un lien valable 10 minutes
export async function lienPhoto(chemin) {
  const { data, error } = await supabase.storage.from('photos').createSignedUrl(chemin, 600);
  if (error) throw new Error(traduireErreur(error.message));
  return data.signedUrl;
}

export const validerPhoto = (photoId, valide) => action('valider_photo', { p_photo: photoId, p_valide: valide });
export const contesterPhoto = (photoId) => action('contester_photo', { p_photo: photoId });
export const arbitrerPhoto = (photoId, valide) => action('arbitrer_photo', { p_photo: photoId, p_valide: valide });

// En fin de partie, les joueurs effacent toutes les photos de la partie
export async function supprimerPhotosPartie(partieId) {
  const { data, error } = await supabase.storage.from('photos').list(partieId, { limit: 1000 });
  if (error) throw new Error(traduireErreur(error.message));
  if (data.length === 0) return;
  const reponse = await supabase.storage.from('photos').remove(data.map((fichier) => `${partieId}/${fichier.name}`));
  if (reponse.error) throw new Error(traduireErreur(reponse.error.message));
}
