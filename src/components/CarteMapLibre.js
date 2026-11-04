// Carte de jeu de la version installable : MapLibre avec les cartes gratuites d'OpenFreeMap.
// Pas de clé ni de compte de facturation. Le style est dessiné ici, aux couleurs de Touché :
// rues, parcs, eau et bâtiments, sans aucun commerce ni point d'intérêt.
// La caméra ne peut ni sortir de la zone ni dézoomer au-delà du quartier.
import { Camera, GeoJSONSource, Layer, Map, NativeUserLocation } from '@maplibre/maplibre-react-native';
import { StyleSheet } from 'react-native';
import { couleurs } from '@/theme';

const OPENFREEMAP = 'https://tiles.openfreemap.org';
const PETITES_RUES = ['minor', 'service', 'track', 'path', 'pedestrian'];
const GRANDES_RUES = ['tertiary', 'secondary', 'primary', 'trunk', 'motorway'];
const classeParmi = (liste) => ['in', ['get', 'class'], ['literal', liste]];
const epaisseur = (min, max) => ['interpolate', ['linear'], ['zoom'], 14, min, 19, max];

const STYLE = {
  version: 8,
  name: 'Touché nuit',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: `${OPENFREEMAP}/planet`,
      attribution:
        '<a href="https://openfreemap.org">OpenFreeMap</a> <a href="https://www.openmaptiles.org/">© OpenMapTiles</a> Données <a href="https://www.openstreetmap.org/copyright">© contributeurs OpenStreetMap</a>',
    },
  },
  glyphs: `${OPENFREEMAP}/fonts/{fontstack}/{range}.pbf`,
  layers: [
    { id: 'fond', type: 'background', paint: { 'background-color': '#444441' } },
    {
      id: 'vegetation',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: classeParmi(['grass', 'wood']),
      paint: { 'fill-color': '#085041', 'fill-opacity': 0.6 },
    },
    { id: 'parcs', type: 'fill', source: 'openmaptiles', 'source-layer': 'park', paint: { 'fill-color': '#085041' } },
    { id: 'eau', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': '#0C447C' } },
    { id: 'batiments', type: 'fill', source: 'openmaptiles', 'source-layer': 'building', minzoom: 15, paint: { 'fill-color': '#2C2C2A' } },
    {
      id: 'petites-rues',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: classeParmi(PETITES_RUES),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#5F5E5A', 'line-width': epaisseur(1, 7) },
    },
    {
      id: 'grandes-rues',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: classeParmi(GRANDES_RUES),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#888780', 'line-width': epaisseur(2, 12) },
    },
    {
      id: 'noms-des-rues',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: 15,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
      },
      paint: { 'text-color': '#B4B2A9', 'text-halo-color': '#2C2C2A', 'text-halo-width': 1 },
    },
  ],
};

// Cercle de la zone, dessiné comme un polygone de 64 côtés
function cercle(centre, rayon) {
  const points = [];
  const dLat = rayon / 111320;
  const dLon = dLat / Math.cos((centre.latitude * Math.PI) / 180);
  for (let i = 0; i <= 64; i += 1) {
    const angle = (i / 64) * 2 * Math.PI;
    points.push([centre.longitude + dLon * Math.cos(angle), centre.latitude + dLat * Math.sin(angle)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [points] } };
}

// Rectangle autour du centre, au format [ouest, sud, est, nord]
function rectangle(centre, distance) {
  const dLat = distance / 111320;
  const dLon = dLat / Math.cos((centre.latitude * Math.PI) / 180);
  return [centre.longitude - dLon, centre.latitude - dLat, centre.longitude + dLon, centre.latitude + dLat];
}

export default function CarteMapLibre({ centre, rayon, points = [] }) {
  const joueurs = {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      properties: { nom: p.nom },
      geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
    })),
  };

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={STYLE}
      logo={false}
      compass={false}
      touchRotate={false}
      touchPitch={false}
      attribution
      attributionPosition={{ bottom: 8, left: 8 }}
    >
      <Camera
        initialViewState={{ bounds: rectangle(centre, rayon * 1.2) }}
        maxBounds={rectangle(centre, rayon * 1.5)}
        minZoom={14}
        maxZoom={19}
      />
      <GeoJSONSource id="zone" data={cercle(centre, rayon)}>
        <Layer id="zone-fond" type="fill" paint={{ 'fill-color': couleurs.corail, 'fill-opacity': 0.08 }} />
        <Layer id="zone-bord" type="line" paint={{ 'line-color': couleurs.corail, 'line-width': 3 }} />
      </GeoJSONSource>
      <GeoJSONSource id="joueurs" data={joueurs}>
        <Layer
          id="joueurs-points"
          type="circle"
          paint={{ 'circle-radius': 7, 'circle-color': couleurs.vertVif, 'circle-stroke-color': couleurs.craie, 'circle-stroke-width': 2 }}
        />
        <Layer
          id="joueurs-noms"
          type="symbol"
          layout={{ 'text-field': ['get', 'nom'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-offset': [0, 1.4] }}
          paint={{ 'text-color': couleurs.craie, 'text-halo-color': couleurs.encre, 'text-halo-width': 1 }}
        />
      </GeoJSONSource>
      <NativeUserLocation />
    </Map>
  );
}
