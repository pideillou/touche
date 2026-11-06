// Catalogue des bonus. Les durées et les règles sont celles de la base (supabase/etape-11-bonus.sql) :
// l'appli ne fait qu'afficher, c'est le serveur qui décide.

export const RARETES = {
  commun: { nom: 'Commun', fond: '#444441', texte: '#D3D1C7' },
  rare: { nom: 'Rare', fond: '#1E3A5F', texte: '#85B7EB' },
  legendaire: { nom: 'Légendaire', fond: '#4A3510', texte: '#FAC775' },
};

export const BONUS = {
  flair: { nom: 'Flair', camp: 'chat', rarete: 'commun', effet: 'Les souris se mettent à jour toutes les 5 s au lieu de 20 s, pendant 1 minute.' },
  sonar: { nom: 'Sonar', camp: 'chat', rarete: 'commun', effet: 'Une flèche indique la souris la plus proche et sa distance approximative, pendant 15 s.' },
  pistage: { nom: 'Pistage', camp: 'chat', rarete: 'rare', effet: 'Tu choisis une souris et tu la suis en direct pendant 45 s, même sous Cape ou Leurre. Elle est prévenue.' },
  piege: { nom: 'Piège', camp: 'chat', rarete: 'rare', effet: 'Pose un piège invisible de 20 m là où tu es, pendant 5 min. La souris qui marche dedans apparaît en direct pour tous les chats pendant 30 s.' },
  retrecissement: { nom: 'Rétrécissement', camp: 'chat', rarete: 'legendaire', effet: 'La zone perd 30 % de son rayon pendant 3 min. Tout le monde est prévenu.' },
  rafle: { nom: 'Rafle', camp: 'chat', rarete: 'legendaire', effet: 'Toutes les souris sont visibles en direct par tous les chats pendant 20 s, après 5 s de préavis.' },
  alarme: { nom: 'Alarme', camp: 'souris', rarete: 'commun', effet: 'Ton téléphone vibre dès qu’un chat approche à moins de 100 m, avec sa direction, pendant 3 min.' },
  leurre: { nom: 'Leurre', camp: 'souris', rarete: 'commun', effet: 'Ton point reste figé sur la carte des chats pendant 1 minute, pendant que tu pars ailleurs.' },
  cape: { nom: 'Cape', camp: 'souris', rarete: 'rare', effet: 'Tu disparais de la carte des chats pendant 45 s.' },
  radar: { nom: 'Radar', camp: 'souris', rarete: 'rare', effet: 'Tu vois tous les chats et leurs pièges en direct pendant 30 s.' },
  bouclier: { nom: 'Bouclier', camp: 'souris', rarete: 'legendaire', effet: 'Personne ne peut te toucher pendant 30 s. Tout le monde le sait, alors choisis bien ton moment.' },
  brouillard: { nom: 'Brouillard', camp: 'souris', rarete: 'legendaire', effet: 'Les chats voient toutes les souris figées pendant 90 s. Tout le monde est prévenu.' },
};

export const BONUS_CHAT = ['flair', 'sonar', 'pistage', 'piege', 'retrecissement', 'rafle'];
export const BONUS_SOURIS = ['alarme', 'leurre', 'cape', 'radar', 'bouclier', 'brouillard'];

export const REGLES_BONUS = [
  'Toutes les 4 minutes, des balises apparaissent : les chats ne voient que les leurs, les souris aussi. Passe à moins de 15 m pour en ramasser une.',
  'Tu ne gardes qu’un bonus à la fois. Il t’attend en bas à gauche, utilise-le quand tu veux.',
  'Un chat qui n’a touché personne depuis 6 minutes reçoit un Flair offert.',
  'Plus de bonus dans les 2 dernières minutes : la fin se joue à la course.',
];

export const REGLE_RETRECISSEMENT =
  'En fin de partie (3 souris restantes ou 5 dernières minutes), la zone rétrécit toutes les 90 s. Le nouveau cercle s’affiche 30 s avant.';

const DIRECTIONS = ['le nord', 'le nord-est', 'l’est', 'le sud-est', 'le sud', 'le sud-ouest', 'l’ouest', 'le nord-ouest'];
const FLECHES = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

// Cap en degrés vers une direction lisible et une flèche (carte orientée nord en haut)
export function direction(cap) {
  const i = Math.round((((cap % 360) + 360) % 360) / 45) % 8;
  return { texte: DIRECTIONS[i], fleche: FLECHES[i] };
}
