// Écrans 03 à 05 réunis : choix de la zone et réglages de l'hôte (mode chat contaminé)
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Bouton from '@/components/Bouton';
import Carte from '@/components/Carte';
import CarteJeu from '@/components/CarteJeu';
import Champ from '@/components/Champ';
import Ecran from '@/components/Ecran';
import Reglage from '@/components/Reglage';
import { Petit, Texte, Titre } from '@/components/Texte';
import { creerPartie, listerZones } from '@/lib/parties';
import { lirePseudo, memoriserPseudo } from '@/lib/session';
import { couleurs } from '@/theme';

const AUTOUR = 'autour'; // valeur de zoneId quand la zone est centrée sur l'hôte

export default function Creer() {
  const [zones, setZones] = useState([]);
  const [ville, setVille] = useState(null);
  const [zoneId, setZoneId] = useState(null);
  const [pseudo, setPseudo] = useState('');
  const [rayon, setRayon] = useState(600);
  const [duree, setDuree] = useState(30);
  const [delai, setDelai] = useState(30);
  const [invites, setInvites] = useState(true);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [position, setPosition] = useState(null); // centre de la zone « autour de moi »
  const [localisation, setLocalisation] = useState(false);

  // L'hôte prend sa position actuelle comme centre de la zone
  async function choisirAutour() {
    setErreur(null);
    setZoneId(AUTOUR);
    if (rayon > 800) setRayon(400);
    setLocalisation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Autorise la position pour créer la zone autour de toi.');
      const lieu = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPosition({ latitude: lieu.coords.latitude, longitude: lieu.coords.longitude, precision: lieu.coords.accuracy });
    } catch (e) {
      setPosition(null);
      setErreur(e.message);
    } finally {
      setLocalisation(false);
    }
  }

  function choisirZone(zone) {
    setZoneId(zone.id);
    setRayon(zone.rayon_m); // chaque zone a son rayon conseillé, que l'hôte peut ajuster
  }

  useEffect(() => {
    lirePseudo().then((p) => p && setPseudo(p));
    listerZones()
      .then((liste) => {
        setZones(liste);
        // Limoges reste la ville proposée par défaut
        const premiere = liste.find((z) => z.ville === 'Limoges') ?? liste[0];
        if (premiere) {
          setVille(premiere.ville);
          choisirZone(premiere);
        }
      })
      .catch((e) => setErreur(e.message));
  }, []);

  async function valider() {
    setErreur(null);
    setChargement(true);
    try {
      await memoriserPseudo(pseudo);
      const code = await creerPartie({
        zoneId,
        position: zoneId === AUTOUR ? position : null,
        pseudo: pseudo.trim(),
        rayon,
        duree,
        delai,
        invites,
      });
      router.replace(`/salon/${code}`);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }

  const autour = zoneId === AUTOUR;
  const villes = [...new Set(zones.map((z) => z.ville))];
  const pret = (autour ? Boolean(position) : Boolean(zoneId)) && pseudo.trim().length >= 2;

  return (
    <Ecran>
      <Titre>Nouvelle partie</Titre>
      <Carte accent={couleurs.corail}>
        <Texte gras>Chat contaminé</Texte>
        <Petit>Chaque souris touchée devient chat. Les autres modes arriveront ensuite.</Petit>
      </Carte>

      <Champ libelle="Ton pseudo" value={pseudo} onChangeText={setPseudo} placeholder="Matou_87" maxLength={20} autoCorrect={false} />

      <Petit>Zone de jeu</Petit>
      <Pressable onPress={choisirAutour} accessibilityRole="radio" accessibilityState={{ checked: autour }}>
        <Carte accent={autour ? couleurs.corail : null} style={styles.ligne}>
          <View style={{ flex: 1 }}>
            <Texte gras>Autour de moi</Texte>
            <Petit>
              {!autour
                ? 'La zone est centrée sur ta position actuelle, où que tu sois.'
                : localisation
                  ? 'Recherche de ta position…'
                  : position
                    ? `Centrée sur ta position (précision ${Math.round(position.precision)} m). Touche pour la reprendre.`
                    : 'Position introuvable. Touche pour réessayer.'}
            </Petit>
          </View>
          <Petit>{autour ? `${rayon} m` : 'GPS'}</Petit>
        </Carte>
      </Pressable>
      {autour && position && (
        <View style={styles.apercu}>
          <CarteJeu key={`${position.latitude}-${rayon}`} centre={position} rayon={rayon} points={[]} />
        </View>
      )}
      {autour && position && position.precision > 50 && (
        <Petit couleur={couleurs.corail}>Position peu précise : place-toi à découvert puis touche « Autour de moi » à nouveau.</Petit>
      )}

      <Petit>Ou une zone prédéfinie</Petit>
      {villes.length > 1 && (
        <View style={styles.selecteur}>
          {villes.map((nom) => (
            <Pressable
              key={nom}
              onPress={() => {
                setVille(nom);
                const premiere = zones.find((z) => z.ville === nom);
                if (premiere && !autour) choisirZone(premiere);
              }}
              style={[styles.option, ville === nom && styles.optionActive]}
              accessibilityRole="radio"
              accessibilityState={{ checked: ville === nom }}
            >
              <Texte couleur={ville === nom ? couleurs.craie : couleurs.encre}>{nom}</Texte>
            </Pressable>
          ))}
        </View>
      )}
      {zones.filter((zone) => zone.ville === ville).map((zone) => (
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
  apercu: { height: 220, borderRadius: 18, overflow: 'hidden' },
});
