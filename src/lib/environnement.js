// Savoir si l'appli tourne dans Expo Go ou dans une version installable (APK, build EAS)
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const dansExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
