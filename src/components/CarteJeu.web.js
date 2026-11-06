/* eslint-env browser */
// Carte de jeu de la version web (PWA) : MapLibre GL JS avec les cartes gratuites d'OpenFreeMap,
// le même style que l'APK. La caméra ne peut ni sortir de la zone ni dézoomer au-delà du quartier.
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import AttributionCarte from './AttributionCarte';
import {
  DISPOSITION_NOMS,
  PEINTURE_JOUEURS,
  PEINTURE_NOMS,
  PEINTURE_ZONE_BORD,
  PEINTURE_ZONE_FOND,
  STYLE,
  cercle,
  joueursEnGeoJson,
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

export default function CarteJeu({ centre, rayon, points = [] }) {
  const conteneur = useRef(null);
  const carte = useRef(null);
  const derniersPoints = useRef(points);
  derniersPoints.current = points;

  useEffect(() => {
    const map = new maplibregl.Map({
      container: conteneur.current,
      style: STYLE,
      bounds: rectangle(centre, rayon * 1.2),
      maxBounds: rectangle(centre, rayon * 1.5),
      minZoom: 14,
      maxZoom: 19,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: false,
    });
    map.touchZoomRotate.disableRotation();
    map.on('load', () => {
      map.addSource('zone', { type: 'geojson', data: cercle(centre, rayon) });
      map.addLayer({ id: 'zone-fond', type: 'fill', source: 'zone', paint: PEINTURE_ZONE_FOND });
      map.addLayer({ id: 'zone-bord', type: 'line', source: 'zone', paint: PEINTURE_ZONE_BORD });
      map.addSource('joueurs', { type: 'geojson', data: joueursEnGeoJson(derniersPoints.current) });
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
  }, [centre.latitude, centre.longitude, rayon]);

  // Les positions des souris changent toutes les 20 secondes
  useEffect(() => {
    const source = carte.current?.getSource('joueurs');
    if (source) source.setData(joueursEnGeoJson(points));
  }, [points]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <div ref={conteneur} style={{ position: 'absolute', inset: 0 }} />
      <AttributionCarte texte="OpenFreeMap © OpenMapTiles © contributeurs OpenStreetMap" />
    </View>
  );
}
