// Signal module-level « l'app est prête » : le premier écran visible (accueil, ou tutoriel/onboarding
// pour un tout nouvel utilisateur) prévient quand son contenu réel est monté et a fini de charger.
//
// Sert à l'intro de démarrage (components/common/LaunchSplash.js) : elle ne se referme pas tant que
// l'écran qui l'attend derrière n'est pas prêt, pour que la personne arrive sur un accueil déjà
// posé — pas sur un squelette de chargement qui clignote juste après l'intro. Même pub/sub que
// lib/splash.js (onSplashCleared) et lib/updateGateSignal.js.
//
// Ne repasse jamais à false : une fois l'app prête, elle l'est pour la durée du processus.
let ready = false;
let readyAt = null;
const listeners = new Set();

export const markAppReady = () => {
  if (ready) return;
  ready = true;
  readyAt = Date.now();
  listeners.forEach((cb) => cb());
  listeners.clear();
};

export const isAppReady = () => ready;

/** Instant (Date.now()) où l'app s'est déclarée prête, ou null. */
export const appReadyAt = () => readyAt;

export const onAppReady = (cb) => {
  if (ready) {
    cb();
    return () => {};
  }
  listeners.add(cb);
  return () => listeners.delete(cb);
};
