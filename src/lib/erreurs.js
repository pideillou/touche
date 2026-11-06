// Messages d'erreur en français : ceux de la base sont déjà rédigés,
// on traduit ici les erreurs techniques (réseau, session, droits).
const TRADUCTIONS = [
  [/failed to fetch|network request failed|networkerror|load failed/i, "Pas de connexion à Internet. Vérifie ton réseau puis réessaie."],
  [/jwt expired|invalid jwt|refresh token/i, "Ta session a expiré. Ferme puis rouvre Touché."],
  [/row-level security|permission denied|not authorized|unauthorized/i, "Tu n'as pas le droit de faire cette action."],
  [/duplicate key/i, 'Cette action a déjà été faite.'],
  [/violates check constraint/i, "Une des valeurs n'est pas valide."],
  [/payload too large|exceeded the maximum allowed size|entity too large/i, 'La photo est trop lourde. Réessaie.'],
  [/invalid mime type|mime type .* is not supported/i, "Ce type de fichier n'est pas accepté."],
  [/timeout|timed out/i, 'Le serveur met trop de temps à répondre. Réessaie dans un instant.'],
  [/rate limit|too many requests/i, 'Trop de tentatives. Patiente une minute.'],
];

export function traduireErreur(message) {
  const texte = String(message ?? '');
  for (const [motif, traduction] of TRADUCTIONS) if (motif.test(texte)) return traduction;
  // Les messages en français viennent de la base et sont faits pour être lus tels quels
  if (/[éèàçù]|^(Seul|Tu |Ce |Cette |La |Le |Il |Aucune|Photo|Position|Connexion)/.test(texte)) return texte;
  return texte ? `Une erreur est survenue (${texte}).` : 'Une erreur est survenue.';
}
