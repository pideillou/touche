// Petits réglages gardés sur le téléphone : derniers réglages de l'hôte, sons, invitation PWA
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE_REGLAGES = 'touche.reglages-hote';
const CLE_SONS = 'touche.sons';
const CLE_INVITATION = 'touche.invitation-pwa-vue';

export async function lireReglagesHote() {
  try {
    return JSON.parse((await AsyncStorage.getItem(CLE_REGLAGES)) ?? 'null');
  } catch {
    return null;
  }
}

export async function memoriserReglagesHote(reglages) {
  try {
    await AsyncStorage.setItem(CLE_REGLAGES, JSON.stringify(reglages));
  } catch {
    // pas grave : l'hôte refera ses réglages
  }
}

let sonsActifs = true;
AsyncStorage.getItem(CLE_SONS)
  .then((v) => {
    if (v === 'non') sonsActifs = false;
  })
  .catch(() => {});

export const sonsSontActifs = () => sonsActifs;

export async function activerSons(actif) {
  sonsActifs = actif;
  try {
    await AsyncStorage.setItem(CLE_SONS, actif ? 'oui' : 'non');
  } catch {
    // le réglage restera valable jusqu'à la fermeture de l'appli
  }
}

export async function invitationDejaVue() {
  try {
    return (await AsyncStorage.getItem(CLE_INVITATION)) === 'oui';
  } catch {
    return false;
  }
}

export async function marquerInvitationVue() {
  try {
    await AsyncStorage.setItem(CLE_INVITATION, 'oui');
  } catch {
    // l'invitation pourra réapparaître, sans gravité
  }
}
