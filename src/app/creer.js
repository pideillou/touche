// Écrans 03 à 05 réunis : choix de la zone et réglages de l'hôte (mode chat contaminé)
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Bouton from '@/components/Bouton';
import Carte from '@/components/Carte';
import Champ from '@/components/Champ';
import Ecran from '@/components/Ecran';
import Reglage from '@/components/Reglage';
import { Petit, Texte, Titre } from '@/components/Texte';
import { creerPartie, listerZones } from '@/lib/parties';
import { lirePseudo, memoriserPseudo } from '@/lib/session';
import { couleurs } from '@/theme';

export default function Creer() {
  const [zones, setZones] = useState([]);
  const [zoneId, setZoneId] = useState(null);
  const [pseudo, setPseudo] = useState('');
  const [rayon, setRayon] = useState(600);
  const [duree, setDuree] = useState(30);
  const [delai, setDelai] = useState(30);
  const [invites, setInvites] = useState(true);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  function choisirZone(zone) {
    setZoneId(zone.id);
    setRayon(zone.rayon_m); // chaque zone a son rayon conseillé, que l'hôte peut ajuster
  }

  useEffect(() => {
    lirePseudo().then((p) => p && setPseudo(p));
    listerZones()
      .then((liste) => {
        setZones(liste);
        if (liste[0]) choisirZone(liste[0]);
      })
      .catch((e) => setErreur(e.message));
  }, []);

  async function valider() {
    setErreur(null);
    setChargement(true);
    try {
      await memoriserPseudo(pseudo);
      const code = await creerPartie({ zoneId, pseudo: pseudo.trim(), rayon, duree, delai, invites });
      router.replace(`/salon/${code}`);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }

  const pret = Boolean(zoneId) && pseudo.trim().length >= 2;

  return (
    <Ecran>
      <Titre>Nouvelle partie</Titre>
      <Carte accent={couleurs.corail}>
        <Texte gras>Chat contaminé</Texte>
        <Petit>Chaque souris touchée devient chat. Les autres modes arriveront ensuite.</Petit>
      </Carte>

      <Champ libelle="Ton pseudo" value={pseudo} onChangeText={setPseudo} placeholder="Matou_87" maxLength={20} autoCorrect={false} />

      <Petit>Zone de jeu à Limoges</Petit>
      {zones.map((zone) => (
        <Pressable
          key={zone.id}
          onPress={() => choisirZone(zone)}
          accessibilityRole="radio"
          accessibilityState={{ checked: zone.id === zoneId }}
        >
          <Carte accent={zone.id === zoneId ? couleurs.corail : null} style={styles.ligne}>
            <View style={{ flex: 1 }}>
              <Texte gras>{zone.nom}</Texte>
              <Petit>{zone.description}</Petit>
            </View>
            <Petit>{zone.rayon_m} m</Petit>
          </Carte>
        </Pressable>
      ))}

      <Petit>Réglages</Petit>
      <Reglage libelle="Rayon de zone" valeur={rayon} unite="m" min={200} max={1500} pas={50} onChange={setRayon} />
      <Reglage libelle="Durée" valeur={duree} unite="min" min={5} max={90} pas={5} onChange={setDuree} />
      <Reglage libelle="Délai hors zone" valeur={delai} unite="s" min={10} max={120} pas={5} onChange={setDelai} />

      <Petit>Accès à la partie</Petit>
      <View style={styles.selecteur}>
        {[
          [true, 'Invités acceptés'],
          [false, 'Compte requis'],
        ].map(([valeur, libelle]) => (
          <Pressable
            key={libelle}
            onPress={() => setInvites(valeur)}
            style={[styles.option, invites === valeur && styles.optionActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: invites === valeur }}
          >
            <Texte couleur={invites === valeur ? couleurs.craie : couleurs.encre}>{libelle}</Texte>
          </Pressable>
        ))}
      </View>

      {erreur && <Texte couleur={couleurs.corail}>{erreur}</Texte>}
      <Bouton titre="Créer le salon" variante="encre" onPress={valider} desactive={!pret} chargement={chargement} />
      <Bouton titre="Annuler" variante="contour" onPress={() => router.back()} />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selecteur: { flexDirection: 'row', backgroundColor: couleurs.grisClair, borderRadius: 14, padding: 4 },
  option: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  optionActive: { backgroundColor: couleurs.encre },
});
