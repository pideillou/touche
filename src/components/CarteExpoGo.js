// Carte de jeu dans Expo Go (react-native-maps : Google Maps sur Android, Plans sur iPhone).
// Style sombre sans points d'intérêt, impossible de s'éloigner de la zone ou de dézoomer sur toute la Terre.
// Dans l'APK, c'est CarteMapLibre.js qui prend le relais, sans clé Google.
import { useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { distanceMetres } from '@/lib/geo';
import AttributionCarte from './AttributionCarte';
import { couleurs } from '@/theme';

// Style Google Maps (Android) aux couleurs de la maquette, points d'intérêt masqués
const STYLE_SOMBRE = [
  { elementType: 'geometry', stylers: [{ color: '#444441' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#B4B2A9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#2C2C2A' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#085041' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#5F5E5A' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#888780' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0C447C' }] },
];

const MARGE = 1.5; // on peut regarder jusqu'à 1,5 fois le rayon autour du centre

export default function CarteExpoGo({ centre, rayon, points = [] }) {
  const carte = useRef(null);
  const ecart = (rayon * 2.6) / 111000; // largeur visible de départ, en degrés
  const ecartMax = ecart * 1.6; // dézoom maximum autorisé

  // Android : la carte refuse d'elle-même de sortir de ce rectangle
  function surPrete() {
    if (Platform.OS !== 'android') return;
    const dLat = (rayon * MARGE) / 111000;
    const dLon = dLat / Math.cos((centre.latitude * Math.PI) / 180);
    carte.current?.setMapBoundaries(
      { latitude: centre.latitude + dLat, longitude: centre.longitude + dLon },
      { latitude: centre.latitude - dLat, longitude: centre.longitude - dLon },
    );
  }

  // iOS et Android : si le joueur glisse trop loin ou dézoome trop, la carte revient sur la zone
  function surDeplacement(region) {
    const tropLoin = distanceMetres(region, centre) > rayon * MARGE;
    const tropLarge = region.latitudeDelta > ecartMax;
    if (tropLoin || tropLarge) {
      carte.current?.animateToRegion(
        {
          latitude: tropLoin ? centre.latitude : region.latitude,
          longitude: tropLoin ? centre.longitude : region.longitude,
          latitudeDelta: Math.min(region.latitudeDelta, ecartMax),
          longitudeDelta: Math.min(region.longitudeDelta, ecartMax),
        },
        400,
      );
    }
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={carte}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...centre, latitudeDelta: ecart, longitudeDelta: ecart }}
        onMapReady={surPrete}
        onRegionChangeComplete={surDeplacement}
        // Points d'intérêt : masqués par le style sur Android, désactivés sur iOS (Plans d'Apple)
        customMapStyle={STYLE_SOMBRE}
        showsPointsOfInterests={false}
        userInterfaceStyle="dark"
        // Zoom borné : pas de vue de toute la ville ni de la Terre
        minZoomLevel={14}
        maxZoomLevel={19}
        cameraZoomRange={{ minCenterCoordinateDistance: 150, maxCenterCoordinateDistance: rayon * 8, animated: true }}
        rotateEnabled={false}
        pitchEnabled={false}
        showsBuildings={false}
        showsIndoors={false}
        showsTraffic={false}
        showsCompass={false}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        <Circle center={centre} radius={rayon} strokeColor={couleurs.corail} strokeWidth={3} fillColor="rgba(216,90,48,0.08)" />
        {points.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.latitude, longitude: p.longitude }} title={p.nom} pinColor={couleurs.vertVif} />
        ))}
      </MapView>
      <AttributionCarte texte="Zones © contributeurs OpenStreetMap" />
    </View>
  );
}
