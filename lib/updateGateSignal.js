// Signal module-level : UpdateGate.js (monté dans app/_layout.js) prévient
// quand il a fini d'évaluer/afficher/fermer sa feuille "Nouvelle version" —
// que ce soit parce qu'il n'y avait rien à montrer, ou parce que l'utilisateur
// vient de la fermer. Même pub/sub que lib/splash.js (onSplashCleared).
//
// Sert à app/home.js pour ordonner l'affichage au démarrage : "Quoi de neuf"
// doit TOUJOURS passer avant un trophée débloqué, jamais l'inverse, jamais
// les deux en même temps — deux feuilles avec chacune son propre BackHandler
// qui se chevauchent est un bug d'ergonomie, pas une coïncidence.
let settled = false;
const listeners = new Set();

export const markUpdateGateSettled = () => {
  if (settled) return;
  settled = true;
  listeners.forEach((cb) => cb());
  listeners.clear();
};

export const onUpdateGateSettled = (cb) => {
  if (settled) {
    cb();
    return () => {};
  }
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const waitForUpdateGateSettled = () =>
  new Promise((resolve) => onUpdateGateSettled(resolve));
