import { useSyncExternalStore } from 'react';

import {
  INITIAL_HEAT,
  LEVEL_NORMAL,
  LEVEL_SLOW,
  LEVEL_OFF,
  nextHeat,
  hasHeatReading,
  combineLevel,
  slowFactor,
} from './lightModeShape';
import { applyEcoPending, getEcoApplied } from './batteryEco';

// « Mode allégé » (décision de l'utilisateur, 11/11/2026) : trois niveaux pour les décors
// animés (ambiance de saison, braises, pulsations de l'écran de séance…).
//   0 = normal ; 1 = effets RALENTIS (téléphone qui commence à chauffer) ;
//   2 = effets COUPÉS (téléphone chaud, ou batterie à 20 % ou moins).
// Les flammes de série ne sont JAMAIS touchées. Jamais de réglage pour le forcer.
//
// L'état VOULU suit la chauffe (alimenté par lib/deviceWatch.js) ; le niveau APPLIQUÉ
// (celui que les écrans lisent par `useLightLevel`) ne change que par `applyLightPending`,
// appelé à un CHANGEMENT D'ÉCRAN, à un changement de phase de la séance ou au démarrage :
// jamais pendant qu'on regarde. Règles pures : lib/lightModeShape.js.
//
// Pour un décor : `const level = useLightLevel();` puis
//   level >= 2  → ne rien dessiner / ne plus animer ;
//   level === 1 → même chose en plus lent (`slowFactor(level)` = 2 sur les durées).

let heat = INITIAL_HEAT; // état voulu RÉEL
let simLevel = null; // simulation de test (Paramètres › Mémoire), jamais gardée
let applied = LEVEL_NORMAL; // niveau que les écrans montrent
let lastReading = null;

const listeners = new Set();
const noticeListeners = new Set();
const debugListeners = new Set();

const heatTarget = () => (simLevel != null ? simLevel : heat.level);

const buildDebug = () => ({
  applied,
  target: combineLevel(getEcoApplied(), heatTarget()),
  heatTarget: heatTarget(),
  simulating: simLevel != null,
  thermalStatus: lastReading ? lastReading.thermalStatus : null,
  batteryTempC: lastReading ? lastReading.batteryTempC : null,
});
let debugSnap = buildDebug();
const refreshDebug = () => {
  debugSnap = buildDebug();
  debugListeners.forEach((l) => l());
};

/** Niveau appliqué : 0 normal, 1 ralenti, 2 coupé. */
export const getLightLevel = () => applied;

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** À lire dans tout composant qui dessine un décor animé (voir l'en-tête du fichier). */
export function useLightLevel() {
  return useSyncExternalStore(subscribe, getLightLevel, () => LEVEL_NORMAL);
}

export { slowFactor, LEVEL_NORMAL, LEVEL_SLOW, LEVEL_OFF };

/** Message « effets ralentis / coupés » : callback(kind) avec 'heat-slow' ou 'heat-off'. */
export function subscribeLightNotice(l) {
  noticeListeners.add(l);
  return () => noticeListeners.delete(l);
}

/** Pour Paramètres › Mémoire : { applied, target, heatTarget, simulating, thermalStatus, batteryTempC }. */
export const getLightDebug = () => debugSnap;
export function subscribeLightDebug(l) {
  debugListeners.add(l);
  return () => debugListeners.delete(l);
}

/** Une lecture de chauffe (statut thermique, température) venue du relevé natif. */
export function feedHeat(reading, now = Date.now()) {
  if (!hasHeatReading(reading)) return;
  lastReading = { thermalStatus: reading.thermalStatus, batteryTempC: reading.batteryTempC };
  heat = nextHeat(heat, reading, now);
  refreshDebug();
}

/**
 * Fait rattraper aux écrans l'état voulu (économie de batterie comprise). À appeler à un
 * changement d'écran, à un changement de phase de la séance, et au démarrage de l'app.
 * Jamais pendant qu'on regarde l'écran.
 */
export function applyLightPending() {
  applyEcoPending(); // économie de batterie (et son propre message)
  const eco = getEcoApplied();
  const next = combineLevel(eco, heatTarget());
  if (next === applied) {
    refreshDebug();
    return;
  }
  const before = applied;
  applied = next;
  listeners.forEach((l) => l());
  // Message de chauffe seulement quand ça MONTE et que ce n'est pas la batterie qui coupe
  // (elle a déjà son message).
  if (next > before && !eco) {
    noticeListeners.forEach((l) => l(next >= LEVEL_OFF ? 'heat-off' : 'heat-slow'));
  }
  refreshDebug();
}

/**
 * OUTIL DE TEST (Paramètres › Mémoire) : simule une chauffe (0, 1 ou 2) sans toucher à l'état
 * réel ; `null` met fin à la simulation. S'applique au prochain changement d'écran.
 */
export function setHeatSimulation(level) {
  simLevel = level == null ? null : Math.max(0, Math.min(2, Math.round(level)));
  refreshDebug();
}
