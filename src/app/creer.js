// Nouvelle partie : zone (autour de soi ou zone de ville), préréglage de durée, options repliées
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
import { lireReglagesHote, memoriserReglagesHote } from '@/lib/preferences';
import { lirePseudo, memoriserPseudo } from '@/lib/session';
import { couleurs } from '@/theme';

const AUTOUR = 'autour'; // valeur de zoneId quand la zone est centrée sur l'hôte
const PRESETS = [
  { nom: 'Rapide', duree: 15 },
  { nom: 'Classique', duree: 30 },
  { nom: 'Longue', duree: 60 },
];

// Sélecteur à segments, comme sur la maquette
function Segments({ options, actif, surChoix }) {
  return (
    <View style={styles.selecteur}>
      {options.map((o) => {
        const choisi = o.valeur === actif;
        return (
          <Pressable
            key={o.valeur}
            onPress={() => surChoix(o.valeur)}
            style={[styles.option, choisi && styles.optionActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: choisi }}
          >
            <Texte gras couleur={choisi ? couleurs.craie : couleurs.encre}>{o.libelle}</Texte>
            {o.detail ? <Petit couleur={choisi ? couleurs.grisClair : couleurs.gris}>{o.detail}</Petit> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Creer() {
  const [zones, setZones] = useState([]);
  const [ville, setVille] = useState(null);
  const [zoneId, setZoneId] = useState(null);
  const [pseudo, setPseudo] = useState('');
  const [pseudoConnu, setPseudoConnu] = useState(false);
  const [modifierPseudo, setModifierPseudo] = useState(false);
  const [rayon, setRayon] = useState(600);
  const [duree, setDuree] = useState(30);
  const [delai, setDelai] = useState(30);
  const [invites, setInvites] = useState(true);
  const [options, setOptions] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [position, setPosition] = useState(null);
  const [localisation, setLocalisation] = useState(false);

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
    lirePseudo().then((p) => {
      if (p) {
        setPseudo(p);
        setPseudoConnu(true);
      }
    });
    // L'hôte retrouve ses derniers réglages
    lireReglagesHote().then((r) => {
      if (!r) return;
      if (r.duree) setDuree(r.duree);
      if (r.delai) setDelai(r.delai);
      if (typeof r.invites === 'boolean') setInvites(r.invites);
    });
    listerZones()
      .then((liste) => {
        setZones(liste);
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
      await memoriserReglagesHote({ duree, delai, invites });
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
  const preset = PRESETS.find((p) => p.duree === duree)?.duree ?? null;

  return (
    <Ecran retour>
      <Titre taille={28}>Nouvelle partie</Titre>

      {pseudoConnu && !modifierPseudo ? (
        <View style={styles.ligne}>
          <Petit>Tu joues en tant que {pseudo} ·</Petit>
          <Pressable onPress={() => setModifierPseudo(true)} accessibilityRole="button" hitSlop={10}>
            <Petit couleur={couleurs.corail} style={styles.lien}>
              Modifier
            </Petit>
          </Pressable>
        </View>
      ) : (
        <Champ libelle="Ton pseudo" value={pseudo} onChangeText={setPseudo} placeholder="Matou_87" maxLength={20} autoCorrect={false} />
      )}

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
                    ? `Centrée sur ta position (précision ${Math.round(position.precision)} m)`
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

      {villes.length > 1 && (
        <Segments
          options={villes.map((v) => ({ valeur: v, libelle: v }))}
          actif={ville}
          surChoix={(nom) => {
            setVille(nom);
            const premiere = zones.find((z) => z.ville === nom);
            if (premiere && !autour) choisirZone(premiere);
          }}
        />
      )}
      {zones
        .filter((zone) => zone.ville === ville)
        .map((zone) => (
          <Pressable key={zone.id} onPress={() => choisirZone(zone)} accessibilityRole="radio" accessibilityState={{ checked: zone.id === zoneId }}>
            <Carte accent={zone.id === zoneId ? couleurs.corail : null} style={styles.ligne}>
              <View style={{ flex: 1 }}>
                <Texte gras>{zone.nom}</Texte>
                <Petit>{zone.description}</Petit>
              </View>
              <Petit>{zone.rayon_m} m</Petit>
            </Carte>
          </Pressable>
        ))}

      <Petit>Durée</Petit>
      <Segments
        options={PRESETS.map((p) => ({ valeur: p.duree, libelle: p.nom, detail: `${p.duree} min` }))}
        actif={preset}
        surChoix={setDuree}
      />

      <Pressable onPress={() => setOptions((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: options }}>
        <Carte style={styles.ligne}>
          <View style={{ flex: 1 }}>
            <Texte gras>Plus d'options</Texte>
            <Petit>
              Rayon {rayon} m · Durée {duree} min · Délai hors zone {delai} s · {invites ? 'Invités acceptés' : 'Compte requis'}
            </Petit>
          </View>
          <Texte gras couleur={couleurs.gris}>{options ? '⌃' : '⌄'}</Texte>
        </Carte>
      </Pressable>
      {options && (
        <>
          <Reglage libelle="Rayon de zone" valeur={rayon} unite="m" min={200} max={1500} pas={50} onChange={setRayon} />
          <Reglage libelle="Durée" valeur={duree} unite="min" min={5} max={90} pas={5} onChange={setDuree} />
          <Reglage libelle="Délai hors zone" valeur={delai} unite="s" min={10} max={120} pas={5} onChange={setDelai} />
          <Segments
            options={[
              { valeur: true, libelle: 'Invités acceptés' },
              { valeur: false, libelle: 'Compte requis' },
            ]}
            actif={invites}
            surChoix={setInvites}
          />
        </>
      )}

      <View style={{ flex: 1 }} />
      {erreur && <Texte couleur={couleurs.corail}>{erreur}</Texte>}
      <Bouton titre="Créer le salon" variante="encre" onPress={valider} desactive={!pret} chargement={chargement} />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  lien: { fontWeight: '600' },
  selecteur: { flexDirection: 'row', backgroundColor: couleurs.grisClair, borderRadius: 14, padding: 4, gap: 4 },
  option: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 11 },
  optionActive: { backgroundColor: couleurs.encre },
  apercu: { height: 220, borderRadius: 18, overflow: 'hidden' },
});
