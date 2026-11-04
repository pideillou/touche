// Connexion à Supabase. Les deux valeurs viennent du fichier .env (voir README).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const cle = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Permet d'afficher un message clair si le .env n'est pas encore rempli
export const supabaseConfigure = Boolean(url && cle && !url.includes('ton-projet'));

export const supabase = createClient(url || 'https://exemple.supabase.co', cle || 'cle-manquante', {
  auth: {
    storage: AsyncStorage, // la session reste ouverte entre deux lancements
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// On ne rafraîchit la session que quand l'appli est au premier plan
AppState.addEventListener('change', (etat) => {
  if (etat === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
