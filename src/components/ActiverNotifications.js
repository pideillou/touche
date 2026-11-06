// Carte qui propose d'activer les notifications (version web), avec un message adapté à chaque cas
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Bouton from './Bouton';
import Carte from './Carte';
import { Petit, Texte } from './Texte';
import { activerNotifications, etatNotifications } from '@/lib/notifications';
import { couleurs } from '@/theme';

export default function ActiverNotifications() {
  const [etat, setEtat] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    etatNotifications()
      .then(setEtat)
      .catch(() => setEtat('indisponible'));
  }, []);

  if (!etat || etat === 'indisponible' || etat === 'actives') return null;

  async function activer() {
    setErreur(null);
    setEnCours(true);
    try {
      await activerNotifications();
      setEtat('actives');
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Carte accent={couleurs.ambre}>
      <View style={styles.texte}>
        <Texte gras>Sois prévenu même téléphone en poche</Texte>
        <Petit>
          {etat === 'installer-dabord'
            ? "Pour recevoir les notifications sur iPhone, ajoute d'abord Touché à ton écran d'accueil (Partager, puis « Sur l'écran d'accueil »), puis ouvre-le depuis son icône."
            : etat === 'refusees'
              ? 'Les notifications sont bloquées. Autorise-les pour Touché dans les réglages du téléphone.'
              : 'Une notification arrive quand un chat te touche, quand une souris te photographie, ou quand il faut trancher.'}
        </Petit>
      </View>
      {etat === 'a-activer' && <Bouton titre="Activer les notifications" variante="encre" onPress={activer} chargement={enCours} />}
      {erreur && <Petit couleur={couleurs.corail}>{erreur}</Petit>}
    </Carte>
  );
}

const styles = StyleSheet.create({
  texte: { gap: 4, marginBottom: 8 },
});
