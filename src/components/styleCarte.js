// Style de carte et formes partagés par la carte de l'APK (MapLibre natif) et celle de la version web (MapLibre GL JS)
import { palette as couleurs } from '@/theme';

const OPENFREEMAP = 'https://tiles.openfreemap.org';
const PETITES_RUES = ['minor', 'service', 'track', 'path', 'pedestrian'];
const GRANDES_RUES = ['tertiary', 'secondary', 'primary', 'trunk', 'motorway'];
const classeParmi = (liste) => ['in', ['get', 'class'], ['literal', liste]];
const epaisseur = (min, max) => ['interpolate', ['linear'], ['zoom'], 14, min, 19, max];

export const STYLE = {
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
export function cercle(centre, rayon) {
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
export function rectangle(centre, distance) {
  const dLat = distance / 111320;
  const dLon = dLat / Math.cos((centre.latitude * Math.PI) / 180);
  return [centre.longitude - dLon, centre.latitude - dLat, centre.longitude + dLon, centre.latitude + dLat];
}

// Couleurs du cercle de jeu et des joueurs, identiques sur les deux cartes
export const PEINTURE_ZONE_FOND = { 'fill-color': couleurs.corail, 'fill-opacity': 0.08 };
export const PEINTURE_ZONE_BORD = { 'line-color': couleurs.corail, 'line-width': 3 };
// Souris en vert, chats (vus au Radar) en corail
export const PEINTURE_JOUEURS = {
  'circle-radius': 7,
  'circle-color': ['match', ['get', 'genre'], 'chat', couleurs.corail, couleurs.vertVif],
  'circle-stroke-color': couleurs.craie,
  'circle-stroke-width': 2,
};
// Halo doré autour d'une souris sous Bouclier
export const PEINTURE_HALOS = {
  'circle-radius': 17,
  'circle-color': couleurs.or,
  'circle-opacity': 0.22,
  'circle-stroke-color': couleurs.or,
  'circle-stroke-width': 3,
};
export const FILTRE_HALOS = ['==', ['get', 'halo'], true];
// Prochain cercle du rétrécissement final, en pointillés
export const PEINTURE_PROCHAIN = { 'line-color': couleurs.craie, 'line-width': 2, 'line-dasharray': [2, 2] };
// Balises de bonus : un point de la couleur du camp, entouré d'un halo
export const PEINTURE_BALISES_HALO = {
  'circle-radius': 16,
  'circle-color': ['get', 'couleur'],
  'circle-opacity': 0.22,
  'circle-stroke-color': ['get', 'couleur'],
  'circle-stroke-width': 1.5,
};
export const PEINTURE_BALISES = { 'circle-radius': 7, 'circle-color': ['get', 'couleur'], 'circle-stroke-color': couleurs.craie, 'circle-stroke-width': 3 };
// Pièges : cercle saumon
export const PEINTURE_PIEGES = {
  'circle-radius': 11,
  'circle-color': couleurs.saumon,
  'circle-opacity': 0.2,
  'circle-stroke-color': couleurs.saumon,
  'circle-stroke-width': 2,
};
// Le pseudo s'affiche au-dessus du point, pour que le doigt ne le cache pas ; un seul nom si deux points se chevauchent
export const DISPOSITION_NOMS = { 'text-field': ['get', 'nom'], 'text-font': ['Noto Sans Regular'], 'text-size': 13, 'text-anchor': 'bottom', 'text-offset': [0, -0.9] };
export const PEINTURE_NOMS = { 'text-color': couleurs.craie, 'text-halo-color': couleurs.encre, 'text-halo-width': 2 };

export const VIDE = { type: 'FeatureCollection', features: [] };

// Une liste de points au format GeoJSON, avec leurs propriétés d'affichage
function enGeoJson(liste, proprietes) {
  return {
    type: 'FeatureCollection',
    features: liste.map((p) => ({
      type: 'Feature',
      properties: proprietes(p),
      geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
    })),
  };
}

// Les joueurs visibles : genre 'souris' ou 'chat', halo pour le Bouclier
export const joueursEnGeoJson = (points) =>
  enGeoJson(points, (p) => ({ nom: p.nom, genre: p.genre ?? 'souris', halo: Boolean(p.halo) }));

// Les balises : la couleur dépend du camp, le nom affiche le temps restant
export const balisesEnGeoJson = (balises) =>
  enGeoJson(balises, (b) => ({ nom: b.nom ?? 'Balise', couleur: b.camp === 'chat' ? couleurs.corail : couleurs.vertVif }));

export const piegesEnGeoJson = (pieges) => enGeoJson(pieges, () => ({}));

// Le cercle de jeu et le prochain cercle du rétrécissement
export const prochainEnGeoJson = (prochain) => (prochain ? cercle(prochain, prochain.rayon) : VIDE);
