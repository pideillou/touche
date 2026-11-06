// Carte de jeu de la version installable : MapLibre avec les cartes gratuites d'OpenFreeMap.
// Pas de clé ni de compte de facturation. Le style est dessiné ici, aux couleurs de Touché :
// rues, parcs, eau et bâtiments, sans aucun commerce ni point d'intérêt.
// La caméra ne peut ni sortir de la zone ni dézoomer au-delà du quartier.
import { Camera, GeoJSONSource, Layer, Map, NativeUserLocation } from '@maplibre/maplibre-react-native';
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

export default function CarteMapLibre({ centre, rayon, points = [] }) {
  const joueurs = joueursEnGeoJson(points);

  return (
    <View style={StyleSheet.absoluteFill}>
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
          <Layer id="zone-fond" type="fill" paint={PEINTURE_ZONE_FOND} />
          <Layer id="zone-bord" type="line" paint={PEINTURE_ZONE_BORD} />
        </GeoJSONSource>
        <GeoJSONSource id="joueurs" data={joueurs}>
          <Layer
            id="joueurs-points"
            type="circle"
            paint={PEINTURE_JOUEURS}
          />
          <Layer
            id="joueurs-noms"
            type="symbol"
            layout={DISPOSITION_NOMS}
            paint={PEINTURE_NOMS}
          />
        </GeoJSONSource>
        <NativeUserLocation />
      </Map>
      <AttributionCarte texte="OpenFreeMap © OpenMapTiles © contributeurs OpenStreetMap" />
    </View>
  );
}
