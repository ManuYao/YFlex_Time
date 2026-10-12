import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

// Trois declencheurs combines, le premier qui tombe gagne :
//   - 8 lancements depuis la derniere cinematique (compteur relatif, remis a
//     zero a chaque passage — pas un modulo sur un compteur cumulatif) ;
//   - plus de 24 h sans avoir ouvert l'app ;
//   - l'app vient d'etre MISE A JOUR (OTA ou nouvel APK) : voir plus bas.
// Le premier lancement (aucune date memorisee) la joue aussi.
export const LAUNCH_COUNT_KEY = 'flexTimer_launchCount';
export const LAST_OPEN_KEY = 'flexTimer_lastOpen';
export const LAST_BUILD_KEY = 'flexTimer_lastBuildId';

// Identite de ce qui tourne en ce moment : l'id de la mise a jour OTA en cours
// (ou celui du bundle embarque dans l'APK, different a chaque build) + la
// version. Un APK neuf OU une OTA appliquee changent cette valeur, quelle que
// soit la facon dont la nouvelle version est arrivee (redemarrage propose par
// la feuille, ou application silencieuse au lancement). En dev les mises a
// jour sont desactivees : seule la version compte.
const currentBuildId = () => {
  let runtime = 'dev';
  try {
    if (Updates.isEnabled) runtime = Updates.updateId ?? 'embedded';
  } catch {}
  const version = Constants.expoConfig?.version ?? '';
  return `${runtime}|${version}`;
};

// Vrai si le splash qu'on s'apprete a jouer fait suite a une mise a jour :
// il joue alors intro puis intro_new (LaunchSplash). Pose par
// shouldShowSplash, lu UNE fois par le splash (consumeUpdateSplash) pour ne
// pas rejouer le double son si le splash est redemande plus tard.
let updateSplashPending = false;

export const consumeUpdateSplash = () => {
  const v = updateSplashPending;
  updateSplashPending = false;
  return v;
};

// Pour rejouer l'intro « après une mise à jour » sans mise à jour (bouton de test des
// Paramètres) : le prochain splash joue la version longue, avec les deux sons.
export const forceUpdateSplash = () => {
  updateSplashPending = true;
};
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

    const [rawCount, rawLastOpen, lastBuild] = await Promise.all([
      AsyncStorage.getItem(LAUNCH_COUNT_KEY),
      AsyncStorage.getItem(LAST_OPEN_KEY),
      AsyncStorage.getItem(LAST_BUILD_KEY),
    ]);

    const now = Date.now();
    const lastOpen = rawLastOpen ? Number(rawLastOpen) : null;
    const sinceSplash = (rawCount ? Number(rawCount) : 0) + 1;

    // lastOpen absent = toute premiere ouverture (ou reset complet).
    const firstEver = !lastOpen || !Number.isFinite(lastOpen);
    const idle = !firstEver && now - lastOpen >= IDLE_MS;

    // Mise a jour = l'identite de la version a change depuis le dernier
    // lancement. Toute premiere ouverture (ou reset complet) : pas une mise a
    // jour. Aucune version memorisee MAIS l'app a deja ete ouverte : ce code
    // vient d'arriver par une mise a jour (les installations d'avant ne
    // memorisaient rien), donc c'en est bien une.
    const buildId = currentBuildId();
    const updated = !firstEver && lastBuild !== buildId;

    const show =
      !!forced || firstEver || idle || updated || sinceSplash >= SPLASH_EVERY_N_LAUNCHES;
    updateSplashPending = show && updated;

    await Promise.all([
      AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(show ? 0 : sinceSplash)),
      AsyncStorage.setItem(LAST_OPEN_KEY, String(now)),
      AsyncStorage.setItem(LAST_BUILD_KEY, buildId),
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

// « Belle coupure » entre l'intro et le message « Quoi de neuf » : une fois l'intro refermée,
// l'accueil reste seul à l'écran un petit moment (le temps de le voir posé, fluide) avant que
// la feuille de mise à jour ne remonte. Le layout note l'instant où l'intro s'est terminée ;
// `waitSplashBeat` attend la fin de l'intro puis le reste de la pause. Sans intro (la plupart
// des lancements), elle rend la main tout de suite : rien n'est retardé.
export const SPLASH_BEAT_MS = 900;
let splashEndedAt = null;

export const noteSplashEnded = () => {
  splashEndedAt = Date.now();
};

export const waitSplashBeat = (beatMs = SPLASH_BEAT_MS) =>
  new Promise((resolve) => {
    onSplashCleared(() => {
      const left = splashEndedAt == null ? 0 : Math.max(0, splashEndedAt + beatMs - Date.now());
      if (left > 0) setTimeout(resolve, left);
      else resolve();
    });
  });

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
