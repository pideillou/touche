// Signaux sonores courts : on sait ce qui se passe sans regarder l'écran en courant.
// Ils remplacent les vibrations sur iPhone, où le web ne peut pas faire vibrer.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { sonsSontActifs } from './preferences';

const SOURCES = {
  alerte: require('../../assets/sons/alerte.wav'), // une capture ou une photo te concerne
  succes: require('../../assets/sons/succes.wav'), // photo validée, fin de partie
  danger: require('../../assets/sons/danger.wav'), // hors zone, tu deviens chat
};

const lecteurs = {};
let modeRegle = false;

export async function jouerSon(nom) {
  if (!sonsSontActifs() || !SOURCES[nom]) return;
  try {
    if (!modeRegle) {
      modeRegle = true;
      await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    }
    lecteurs[nom] = lecteurs[nom] ?? createAudioPlayer(SOURCES[nom]);
    await lecteurs[nom].seekTo(0);
    lecteurs[nom].play();
  } catch {
    // un son raté ne doit jamais bloquer la partie
  }
}
