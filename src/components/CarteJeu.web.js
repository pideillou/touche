/* eslint-env browser */
// Carte de jeu de la version web (PWA) : MapLibre GL JS avec les cartes gratuites d'OpenFreeMap,
// le même style que l'APK. La caméra ne peut ni sortir de la zone ni dézoomer au-delà du quartier.
// La zone de départ (cadre) fixe la caméra ; le cercle de jeu peut ensuite rétrécir.
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import AttributionCarte from './AttributionCarte';
import {
  DISPOSITION_NOMS,
  FILTRE_HALOS,
  PEINTURE_BALISES,
  PEINTURE_BALISES_HALO,
  PEINTURE_HALOS,
  PEINTURE_JOUEURS,
  PEINTURE_NOMS,
  PEINTURE_PIEGES,
  PEINTURE_PROCHAIN,
  PEINTURE_ZONE_BORD,
  PEINTURE_ZONE_FOND,
  STYLE,
  balisesEnGeoJson,
  cercle,
  joueursEnGeoJson,
  piegesEnGeoJson,
  prochainEnGeoJson,
  rectangle,
} from './styleCarte';
import { palette as couleurs } from '@/theme';

// Point bleu « c'est moi », mis à jour par le GPS du navigateur
function creerPointMoi() {
  const point = document.createElement('div');
  Object.assign(point.style, {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#378ADD',
    border: `3px solid ${couleurs.craie}`,
    boxShadow: '0 0 0 2px rgba(55,138,221,0.35)',
  });
  point.setAttribute('aria-label', 'Ta position');
  return point;
}

export default function CarteJeu({ cadre, centre, rayon, prochain = null, points = [], balises = [], pieges = [] }) {
  const conteneur = useRef(null);
  const carte = useRef(null);
  const zoneDepart = cadre ?? { latitude: centre.latitude, longitude: centre.longitude, rayon };

  // Données à jour, reprises au chargement de la carte
  const donnees = {
    zone: cercle(centre, rayon),
    prochain: prochainEnGeoJson(prochain),
    pieges: piegesEnGeoJson(pieges),
    balises: balisesEnGeoJson(balises),
    joueurs: joueursEnGeoJson(points),
  };
  const dernieres = useRef(donnees);
  dernieres.current = donnees;

  useEffect(() => {
    const map = new maplibregl.Map({
      container: conteneur.current,
      style: STYLE,
      bounds: rectangle(zoneDepart, zoneDepart.rayon * 1.2),
      maxBounds: rectangle(zoneDepart, zoneDepart.rayon * 1.5),
      minZoom: 14,
      maxZoom: 19,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: false,
    });
    map.touchZoomRotate.disableRotation();
    map.on('load', () => {
      const d = dernieres.current;
      for (const nom of ['zone', 'prochain', 'pieges', 'balises', 'joueurs']) map.addSource(nom, { type: 'geojson', data: d[nom] });
      map.addLayer({ id: 'zone-fond', type: 'fill', source: 'zone', paint: PEINTURE_ZONE_FOND });
      map.addLayer({ id: 'zone-bord', type: 'line', source: 'zone', paint: PEINTURE_ZONE_BORD });
      map.addLayer({ id: 'prochain-bord', type: 'line', source: 'prochain', paint: PEINTURE_PROCHAIN });
      map.addLayer({ id: 'pieges', type: 'circle', source: 'pieges', paint: PEINTURE_PIEGES });
      map.addLayer({ id: 'balises-halo', type: 'circle', source: 'balises', paint: PEINTURE_BALISES_HALO });
      map.addLayer({ id: 'balises-points', type: 'circle', source: 'balises', paint: PEINTURE_BALISES });
      map.addLayer({ id: 'balises-noms', type: 'symbol', source: 'balises', layout: DISPOSITION_NOMS, paint: PEINTURE_NOMS });
      map.addLayer({ id: 'joueurs-halos', type: 'circle', source: 'joueurs', filter: FILTRE_HALOS, paint: PEINTURE_HALOS });
      map.addLayer({ id: 'joueurs-points', type: 'circle', source: 'joueurs', paint: PEINTURE_JOUEURS });
      map.addLayer({ id: 'joueurs-noms', type: 'symbol', source: 'joueurs', layout: DISPOSITION_NOMS, paint: PEINTURE_NOMS });
    });

    const moi = new maplibregl.Marker({ element: creerPointMoi() });
    let suivi = null;
    if (navigator.geolocation) {
      suivi = navigator.geolocation.watchPosition(
        (lieu) => moi.setLngLat([lieu.coords.longitude, lieu.coords.latitude]).addTo(map),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
    }

    carte.current = map;
    return () => {
      if (suivi !== null) navigator.geolocation.clearWatch(suivi);
      map.remove();
      carte.current = null;
    };
  }, [zoneDepart.latitude, zoneDepart.longitude, zoneDepart.rayon]);

  // Positions, balises, pièges et cercles changent pendant la partie : on remplace seulement les données
  const signature = JSON.stringify(donnees);
  useEffect(() => {
    const map = carte.current;
    if (!map) return;
    for (const [nom, data] of Object.entries(dernieres.current)) map.getSource(nom)?.setData(data);
  }, [signature]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <div ref={conteneur} style={{ position: 'absolute', inset: 0 }} />
      <AttributionCarte texte="OpenFreeMap © OpenMapTiles © contributeurs OpenStreetMap" />
    </View>
  );
}
