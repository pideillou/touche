/* eslint-env browser */
// Notifications web : une capture ou une photo réveille le téléphone, même si Touché n'est pas à l'écran.
// Sur iPhone, il faut iOS 16.4 ou plus, et Touché ajouté à l'écran d'accueil.
import { traduireErreur } from './erreurs';
import { supabase } from './supabase';

const CLE_PUBLIQUE = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
const SERVICE_WORKER = '/touche/app/sw.js';

function enOctets(base64) {
  const complet = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const brut = atob(complet);
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

const installee = () => window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
const iphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

export function notificationsPossibles() {
  return Boolean(CLE_PUBLIQUE) && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function enregistrerServiceWorker() {
  if (!('serviceWorker' in navigator) || window.location.hostname === 'localhost') return;
  navigator.serviceWorker.register(SERVICE_WORKER, { scope: '/touche/app/' }).catch(() => {});
}

// 'actives', 'refusees', 'a-activer', 'installer-dabord' (iPhone dans Safari) ou 'indisponible'
export async function etatNotifications() {
  if (iphone() && !installee()) return 'installer-dabord';
  if (!notificationsPossibles()) return 'indisponible';
  if (Notification.permission === 'denied') return 'refusees';
  if (Notification.permission !== 'granted') return 'a-activer';
  const enregistrement = await navigator.serviceWorker.getRegistration(SERVICE_WORKER);
  const abonnement = await enregistrement?.pushManager.getSubscription();
  return abonnement ? 'actives' : 'a-activer';
}

// À appeler depuis un bouton : l'iPhone n'accepte la demande qu'après un geste de l'utilisateur
export async function activerNotifications() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications refusées. Tu peux les autoriser dans les réglages du téléphone.');
  const enregistrement = await navigator.serviceWorker.register(SERVICE_WORKER, { scope: '/touche/app/' });
  await navigator.serviceWorker.ready;
  const abonnement =
    (await enregistrement.pushManager.getSubscription()) ??
    (await enregistrement.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: enOctets(CLE_PUBLIQUE) }));
  const json = abonnement.toJSON();
  const { error } = await supabase.rpc('enregistrer_abonnement', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
  });
  if (error) throw new Error(traduireErreur(error.message));
}
