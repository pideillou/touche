// Suivi de la position écran éteint, pendant une partie seulement.
// Une tâche de fond reçoit les positions du téléphone et envoie la dernière à Supabase
// toutes les 20 secondes environ. Elle s'arrête à la fin de la partie.
// Dans Expo Go, le suivi de fond n'existe pas : l'appli garde alors le suivi écran allumé.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { dansExpoGo } from './environnement';
import { supabase } from './supabase';

export const TACHE_POSITION = 'touche-position-de-fond';
const CLE_SUIVI = 'touche.suivi'; // partie et joueur suivis
const CLE_DERNIER_ENVOI = 'touche.suivi.dernier-envoi';
const INTERVALLE_MS = 20000;

export const suiviDeFondDisponible = !dansExpoGo;

// La tâche doit être déclarée dès le chargement de l'appli (import dans src/app/_layout.js)
if (suiviDeFondDisponible) {
  TaskManager.defineTask(TACHE_POSITION, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    try {
      const suivi = JSON.parse((await AsyncStorage.getItem(CLE_SUIVI)) ?? 'null');
      if (!suivi) return;
      const dernierEnvoi = Number((await AsyncStorage.getItem(CLE_DERNIER_ENVOI)) ?? 0);
      if (Date.now() - dernierEnvoi < INTERVALLE_MS - 3000) return;
      const { coords } = data.locations[data.locations.length - 1];
      const { error: erreurEnvoi } = await supabase.from('positions').upsert({
        partie_id: suivi.partieId,
        joueur_id: suivi.joueurId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        precision_m: coords.accuracy,
        maj_le: new Date().toISOString(),
      });
      // La base refuse les positions quand la partie est finie : on coupe le suivi
      if (erreurEnvoi) await arreterSuivi();
      else await AsyncStorage.setItem(CLE_DERNIER_ENVOI, String(Date.now()));
    } catch {
      // Pas de réseau : la prochaine position réessaiera
    }
  });
}

// Démarre le suivi de fond. Renvoie false si le joueur n'a pas donné l'accès « Toujours ».
export async function demarrerSuivi(partieId, joueurId) {
  if (!suiviDeFondDisponible) return false;
  const premierPlan = await Location.requestForegroundPermissionsAsync();
  if (premierPlan.status !== 'granted') return false;
  const fond = await Location.requestBackgroundPermissionsAsync();
  if (fond.status !== 'granted') return false;

  await AsyncStorage.setItem(CLE_SUIVI, JSON.stringify({ partieId, joueurId }));
  if (await Location.hasStartedLocationUpdatesAsync(TACHE_POSITION)) return true;
  await Location.startLocationUpdatesAsync(TACHE_POSITION, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10000,
    distanceInterval: 5,
    deferredUpdatesInterval: INTERVALLE_MS,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Fitness,
    showsBackgroundLocationIndicator: true,
    // Android affiche une notification tant que le suivi tourne
    foregroundService: {
      notificationTitle: 'Partie de Touché en cours',
      notificationBody: "Ta position est partagée avec les joueurs de ta partie jusqu'à la fin.",
      notificationColor: '#D85A30',
    },
  });
  return true;
}

export async function arreterSuivi() {
  await AsyncStorage.multiRemove([CLE_SUIVI, CLE_DERNIER_ENVOI]);
  if (!suiviDeFondDisponible) return;
  if (await Location.hasStartedLocationUpdatesAsync(TACHE_POSITION)) {
    await Location.stopLocationUpdatesAsync(TACHE_POSITION);
  }
}
