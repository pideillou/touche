// Carte de jeu de la version installable : MapLibre avec les cartes gratuites d'OpenFreeMap.
// Pas de clé ni de compte de facturation. Le style est dessiné ici, aux couleurs de Touché :
// rues, parcs, eau et bâtiments, sans aucun commerce ni point d'intérêt.
// La caméra ne peut ni sortir de la zone de départ ni dézoomer au-delà du quartier ;
// le cercle de jeu, lui, peut rétrécir en fin de partie.
import { Camera, GeoJSONSource, Layer, Map, NativeUserLocation } from '@maplibre/maplibre-react-native';
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

export default function CarteMapLibre({ cadre, centre, rayon, prochain = null, points = [], balises = [], pieges = [] }) {
  const zoneDepart = cadre ?? { latitude: centre.latitude, longitude: centre.longitude, rayon };

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
          initialViewState={{ bounds: rectangle(zoneDepart, zoneDepart.rayon * 1.2) }}
          maxBounds={rectangle(zoneDepart, zoneDepart.rayon * 1.5)}
          minZoom={14}
          maxZoom={19}
        />
        <GeoJSONSource id="zone" data={cercle(centre, rayon)}>
          <Layer id="zone-fond" type="fill" paint={PEINTURE_ZONE_FOND} />
          <Layer id="zone-bord" type="line" paint={PEINTURE_ZONE_BORD} />
        </GeoJSONSource>
        <GeoJSONSource id="prochain" data={prochainEnGeoJson(prochain)}>
          <Layer id="prochain-bord" type="line" paint={PEINTURE_PROCHAIN} />
        </GeoJSONSource>
        <GeoJSONSource id="pieges" data={piegesEnGeoJson(pieges)}>
          <Layer id="pieges" type="circle" paint={PEINTURE_PIEGES} />
        </GeoJSONSource>
        <GeoJSONSource id="balises" data={balisesEnGeoJson(balises)}>
          <Layer id="balises-halo" type="circle" paint={PEINTURE_BALISES_HALO} />
          <Layer id="balises-points" type="circle" paint={PEINTURE_BALISES} />
          <Layer id="balises-noms" type="symbol" layout={DISPOSITION_NOMS} paint={PEINTURE_NOMS} />
        </GeoJSONSource>
        <GeoJSONSource id="joueurs" data={joueursEnGeoJson(points)}>
          <Layer id="joueurs-halos" type="circle" filter={FILTRE_HALOS} paint={PEINTURE_HALOS} />
          <Layer id="joueurs-points" type="circle" paint={PEINTURE_JOUEURS} />
          <Layer id="joueurs-noms" type="symbol" layout={DISPOSITION_NOMS} paint={PEINTURE_NOMS} />
        </GeoJSONSource>
        <NativeUserLocation />
      </Map>
      <AttributionCarte texte="OpenFreeMap © OpenMapTiles © contributeurs OpenStreetMap" />
    </View>
  );
}
