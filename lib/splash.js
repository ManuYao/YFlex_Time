import AsyncStorage from '@react-native-async-storage/async-storage';

// Deux declencheurs combines, le premier qui tombe gagne :
//   - 8 lancements depuis la derniere cinematique (compteur relatif, remis a
//     zero a chaque passage — pas un modulo sur un compteur cumulatif) ;
//   - plus de 24 h sans avoir ouvert l'app.
// Le premier lancement (aucune date memorisee) la joue aussi.
export const LAUNCH_COUNT_KEY = 'flexTimer_launchCount';
export const LAST_OPEN_KEY = 'flexTimer_lastOpen';
const SPLASH_EVERY_N_LAUNCHES = 8;
const IDLE_MS = 24 * 60 * 60 * 1000;

export const FORCE_SPLASH_KEY = 'flexTimer_forceSplashNextLaunch';

export const forceSplashNextLaunch = async () => {
  try {
    await AsyncStorage.setItem(FORCE_SPLASH_KEY, '1');
  } catch {}
};

export const shouldShowSplash = async () => {
  try {
    const forced = await AsyncStorage.getItem(FORCE_SPLASH_KEY);
    if (forced) await AsyncStorage.removeItem(FORCE_SPLASH_KEY);

    const [rawCount, rawLastOpen] = await Promise.all([
      AsyncStorage.getItem(LAUNCH_COUNT_KEY),
      AsyncStorage.getItem(LAST_OPEN_KEY),
    ]);

    const now = Date.now();
    const lastOpen = rawLastOpen ? Number(rawLastOpen) : null;
    const sinceSplash = (rawCount ? Number(rawCount) : 0) + 1;

    // lastOpen absent = toute premiere ouverture (ou reset complet).
    const firstEver = !lastOpen || !Number.isFinite(lastOpen);
    const idle = !firstEver && now - lastOpen >= IDLE_MS;
    const show = !!forced || firstEver || idle || sinceSplash >= SPLASH_EVERY_N_LAUNCHES;

    await Promise.all([
      AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(show ? 0 : sinceSplash)),
      AsyncStorage.setItem(LAST_OPEN_KEY, String(now)),
    ]);

    return show;
  } catch {
    return false;
  }
};

// Conservé pour compat d'appel (app/_layout.js) : la persistance se fait
// déjà entièrement dans shouldShowSplash ci-dessus.
export const markSplashShown = async () => {};

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

// Fin (ou absence) de la cinématique, signalée par le layout racine. Un écran
// qui veut ouvrir une feuille au démarrage (accueil : conseil de surcharge
// progressive) doit attendre ce signal, sinon elle se monte et joue son
// animation d'entrée cachée derrière le splash (zIndex 1000) — même piège
// que MaintenanceBanner/MaintenanceScreen, voir `splashCleared` dans
// app/_layout.js. Ne repasse jamais à false, pour la même raison que là-bas.
let cleared = false;
const clearedListeners = new Set();

export const markSplashCleared = () => {
  if (cleared) return;
  cleared = true;
  clearedListeners.forEach((cb) => cb());
  clearedListeners.clear();
};

export const onSplashCleared = (cb) => {
  if (cleared) {
    cb();
    return () => {};
  }
  clearedListeners.add(cb);
  return () => {
    clearedListeners.delete(cb);
  };
};
