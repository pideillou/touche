// Version web : un navigateur ne peut pas suivre la position écran verrouillé.
// L'écran reste allumé pendant la partie (expo-keep-awake), et le suivi se fait au premier plan.
export const TACHE_POSITION = 'touche-position-de-fond';
export const suiviDeFondDisponible = false;

export async function demarrerSuivi() {
  return false;
}

export async function arreterSuivi() {}
