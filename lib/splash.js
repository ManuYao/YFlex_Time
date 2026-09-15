import AsyncStorage from '@react-native-async-storage/async-storage';

export const SPLASH_KEY = 'flexTimer_splashLastShown';

// 24 h glissantes depuis le dernier affichage (pas de remise à zéro à minuit) :
// « une fois par 24 h » au sens strict, et rien à calculer en fuseau horaire.
const SPLASH_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const shouldShowSplash = async () => {
  try {
    const raw = await AsyncStorage.getItem(SPLASH_KEY);
    const last = raw ? Number(raw) : 0;
    return !last || Date.now() - last >= SPLASH_INTERVAL_MS;
  } catch {
    return false;
  }
};

export const markSplashShown = async () => {
  try {
    await AsyncStorage.setItem(SPLASH_KEY, String(Date.now()));
  } catch {}
};

// Déclencheur manuel (bouton temporaire des Paramètres) : le layout racine
// s'abonne, n'importe quel écran peut demander une relecture.
let listener = null;

export const onSplashRequest = (cb) => {
  listener = cb;
  return () => {
    if (listener === cb) listener = null;
  };
};

export const requestSplash = () => {
  listener?.();
};
