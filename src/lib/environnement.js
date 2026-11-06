// Savoir où tourne l'appli : Expo Go, version web (PWA) ou version installable (APK, build EAS)
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export const dansExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const dansNavigateur = Platform.OS === 'web';
