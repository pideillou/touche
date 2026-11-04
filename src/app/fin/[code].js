// Écran 15 : fin de partie et classement
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Bouton from '@/components/Bouton';
import Carte from '@/components/Carte';
import Ecran from '@/components/Ecran';
import Etiquette from '@/components/Etiquette';
import { Petit, Texte, Titre } from '@/components/Texte';
import { chrono } from '@/lib/geo';
import { chargerPartie, supprimerPhotosPartie } from '@/lib/parties';
import { useSession } from '@/lib/session';
import { arreterSuivi } from '@/lib/suivi';
import { couleurs } from '@/theme';

export default function Fin() {
  const { code } = useLocalSearchParams();
  const { session } = useSession();
  const moi = session?.user?.id;
  const [partie, setPartie] = useState(null);
  const [joueurs, setJoueurs] = useState([]);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    arreterSuivi().catch(() => {});
    chargerPartie(code)
      .then((resultat) => {
        setPartie(resultat.partie);
        setJoueurs(resultat.joueurs);
        // Les photos ne servent plus : le téléphone de l'hôte les efface du stockage
        if (resultat.partie.hote_id === moi) return supprimerPhotosPartie(resultat.partie.id);
        return null;
      })
      .catch((e) => setErreur(e.message));
  }, [code, moi]);

  if (!partie) {
    return (
      <Ecran>
        <Texte couleur={erreur ? couleurs.corail : couleurs.gris}>{erreur || 'Calcul du classement…'}</Texte>
      </Ecran>
    );
  }

  const debut = new Date(partie.debut_le).getTime();

  // Souris encore en vie : départagées par leurs photos validées
  const enVie = joueurs.filter((j) => j.role === 'souris').sort((a, b) => b.photos_validees - a.photos_validees);

  // Souris contaminées pendant la partie : classées au temps de survie
  const contaminees = joueurs
    .filter((j) => j.role === 'chat' && j.devenu_chat_le && new Date(j.devenu_chat_le).getTime() > debut)
    .map((j) => ({ ...j, survie: (new Date(j.devenu_chat_le).getTime() - debut) / 1000 }))
    .sort((a, b) => b.survie - a.survie);

  const chatsDeDepart = joueurs.filter((j) => j.role === 'chat' && !contaminees.some((c) => c.joueur_id === j.joueur_id));

  const egalite = enVie.length > 1 && enVie[0].photos_validees === enVie[1].photos_validees;
  const titre = enVie.length === 0 ? 'Les chats gagnent' : egalite ? 'Égalité entre les souris' : `${enVie[0].pseudo} gagne`;
  const sousTitre =
    enVie.length === 0
      ? 'Toutes les souris ont été contaminées.'
      : egalite
        ? `${enVie.length} souris ont tenu jusqu'au bout avec le même nombre de photos.`
        : 'Souris en vie avec le plus de photos validées.';

  return (
    <Ecran>
      <View style={styles.tete}>
        <Titre taille={30} centre>
          {titre}
        </Titre>
        <Petit centre>{sousTitre}</Petit>
        <Petit centre>
          Partie {partie.code} · {partie.zone?.nom}
        </Petit>
      </View>

      {enVie.length > 0 && <Petit>Souris en vie, aux photos validées</Petit>}
      {enVie.map((j) => (
        <Carte key={j.joueur_id} style={styles.ligne}>
          <Texte style={{ flex: 1 }}>{j.pseudo}</Texte>
          <Etiquette texte={`${j.photos_validees} photo${j.photos_validees > 1 ? 's' : ''}`} fond={couleurs.vertClair} couleur={couleurs.vert} />
        </Carte>
      ))}

      {contaminees.length > 0 && <Petit>Contaminées, au temps de survie</Petit>}
      {contaminees.map((j) => (
        <Carte key={j.joueur_id} style={styles.ligne}>
          <Texte style={{ flex: 1 }}>{j.pseudo}</Texte>
          <Petit>{chrono(j.survie)}</Petit>
        </Carte>
      ))}

      {chatsDeDepart.length > 0 && <Petit>Chat{chatsDeDepart.length > 1 ? 's' : ''} de départ</Petit>}
      {chatsDeDepart.map((j) => (
        <Carte key={j.joueur_id} style={styles.ligne}>
          <Texte style={{ flex: 1 }}>{j.pseudo}</Texte>
          <Etiquette texte="Chat" fond={couleurs.corailClair} couleur={couleurs.corail} />
        </Carte>
      ))}

      <Petit centre>Les photos de cette partie sont effacées à la fin de la partie.</Petit>
      <View style={{ flex: 1 }} />
      <Bouton titre="Rejouer" onPress={() => router.replace('/creer')} />
      <Bouton titre="Retour à l'accueil" variante="contour" onPress={() => router.replace('/')} />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  tete: { alignItems: 'center', gap: 4, paddingVertical: 12 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
