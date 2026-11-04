// react-native-maps ne sert que dans Expo Go, qui l'embarque déjà.
// On l'exclut des versions installables : elles utilisent MapLibre, sans Google Maps ni clé.
module.exports = {
  dependencies: {
    'react-native-maps': { platforms: { android: null, ios: null } },
  },
};
