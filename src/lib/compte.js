// Comptes joueurs : création, connexion, pseudo, selfie, niveau et historique
import { base64VersOctets } from './parties';
import { supabase } from './supabase';

const POINTS_PAR_NIVEAU = 250;

// Niveau 1 de 0 à 249 XP, niveau 2 de 250 à 499 XP, etc.
export function niveauDepuisXp(xp = 0) {
  return {
    niveau: Math.floor(xp / POINTS_PAR_NIVEAU) + 1,
    dansLeNiveau: xp % POINTS_PAR_NIVEAU,
    palier: POINTS_PAR_NIVEAU,
  };
}

// Messages de Supabase traduits pour les joueurs
function traduire(message) {
  if (/already (been )?registered|already exists/i.test(message)) return 'Un compte existe déjà avec cet e-mail.';
  if (/invalid login credentials/i.test(message)) return 'E-mail ou mot de passe incorrect.';
  if (/password should be at least/i.test(message)) return 'Le mot de passe est trop court.';
  if (/email not confirmed/i.test(message)) return 'Confirme ton e-mail avec le lien reçu, puis reconnecte-toi.';
  if (/invalid.*email|unable to validate email/i.test(message)) return "Cette adresse e-mail n'est pas valide.";
  return message;
}

export async function chargerProfil(id) {
  const { data, error } = await supabase.from('profils').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function enregistrerPseudo(id, pseudo) {
  const { error } = await supabase.from('profils').upsert({ id, pseudo: pseudo.trim() });
  if (error) throw new Error(error.message);
}

// L'invité devient un vrai compte : il garde le même identifiant, donc ses parties et son niveau
export async function creerCompte({ id, email, motDePasse, pseudo }) {
  const { error } = await supabase.auth.updateUser({ email: email.trim(), password: motDePasse });
  if (error) throw new Error(traduire(error.message));
  await enregistrerPseudo(id, pseudo);
}

export async function seConnecter(email, motDePasse) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
  if (error) throw new Error(traduire(error.message));
}

// Supprime définitivement le compte et ses données (exigé par les stores),
// puis ouvre une nouvelle session invitée vierge
export async function supprimerCompte(id) {
  await supabase.storage.from('avatars').remove([`${id}.jpg`]);
  const { error } = await supabase.rpc('supprimer_mon_compte');
  if (error) throw new Error(error.message);
  await supabase.auth.signOut({ scope: 'local' });
}

export async function seDeconnecter() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

// Le selfie est rangé sous le nom <identifiant>.jpg, remplacé à chaque nouvelle photo
export async function envoyerSelfie(id, base64) {
  const profil = await chargerProfil(id);
  if (!profil) throw new Error("Choisis d'abord ton pseudo.");
  const chemin = `${id}.jpg`;
  const envoi = await supabase.storage.from('avatars').upload(chemin, base64VersOctets(base64), { contentType: 'image/jpeg', upsert: true });
  if (envoi.error) throw new Error(envoi.error.message);
  const { error } = await supabase.from('profils').update({ avatar_url: chemin }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function lienAvatar(chemin) {
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(chemin, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// Toutes mes parties terminées, de la plus récente à la plus ancienne
export async function chargerHistorique(id) {
  const { data, error } = await supabase
    .from('resultats')
    .select('*, partie:parties(code, mode, fin_le, zone:zones(nom))')
    .eq('joueur_id', id)
    .order('cree_le', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
