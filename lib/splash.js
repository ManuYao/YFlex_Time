import AsyncStorage from '@react-native-async-storage/async-storage';

// Compteur de lancements plutôt qu'une fenêtre de 24h : plus simple à tester
// (pas besoin d'attendre une journée), et un rythme prévisible pour
// l'utilisateur. Affiché au tout premier lancement (count === 1), puis tous
// les 10 lancements (11, 21, 31...).
export const LAUNCH_COUNT_KEY = 'flexTimer_launchCount';
const SPLASH_EVERY_N_LAUNCHES = 10;

// Drapeau posé juste avant Updates.reloadAsync() (voir hooks/useOtaUpdate.js) :
// le redémarrage qui suit un "Redémarrer maintenant" (UpdateSheet) doit
// systématiquement montrer la cinématique, comme moment "nouvelle version",
// sans attendre son tour dans le cycle de 10 — et sans le perturber : le
// compteur de lancements continue d'avancer normalement à côté.
export const FORCE_SPLASH_KEY = 'flexTimer_forceSplashNextLaunch';

export const forceSplashNextLaunch = async () => {
  try {
    await AsyncStorage.setItem(FORCE_SPLASH_KEY, '1');
  } catch {}
};

export const shouldShowSplash = async () => {
  try {
    const forced = await AsyncStorage.getItem(FORCE_SPLASH_KEY);
    if (forced) {
      await AsyncStorage.removeItem(FORCE_SPLASH_KEY);
    }

    const raw = await AsyncStorage.getItem(LAUNCH_COUNT_KEY);
    const count = (raw ? Number(raw) : 0) + 1;
    await AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(count));

    return !!forced || count % SPLASH_EVERY_N_LAUNCHES === 1;
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
