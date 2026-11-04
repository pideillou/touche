// Ouvre une session « invité » automatiquement au premier lancement.
// Un invité peut ensuite transformer sa session en vrai compte (voir lib/compte.js).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, supabaseConfigure } from './supabase';

const SessionContext = createContext({ session: null, pret: false, erreur: null });

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (!supabaseConfigure) {
      setPret(true);
      return;
    }
    let actif = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (actif) setSession(data.session);
      } else {
        const reponse = await supabase.auth.signInAnonymously();
        if (reponse.error) setErreur(reponse.error.message);
        else if (actif) setSession(reponse.data.session);
      }
      if (actif) setPret(true);
    })();
    const { data } = supabase.auth.onAuthStateChange((evenement, nouvelle) => {
      setSession(nouvelle);
      // Après une déconnexion, on repart en invité pour pouvoir rejouer tout de suite
      if (evenement === 'SIGNED_OUT') supabase.auth.signInAnonymously();
    });
    return () => {
      actif = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={{ session, pret, erreur }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

// Le dernier pseudo utilisé est gardé sur le téléphone pour pré-remplir les champs
const CLE_PSEUDO = 'touche.pseudo';
export const lirePseudo = () => AsyncStorage.getItem(CLE_PSEUDO);
export const memoriserPseudo = (pseudo) => AsyncStorage.setItem(CLE_PSEUDO, pseudo.trim());
