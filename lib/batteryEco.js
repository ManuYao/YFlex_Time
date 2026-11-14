import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  INITIAL_ECO,
  nextBatteryEco,
  normalizePct,
  parseStoredEco,
  minutesUntilRelease,
  nextCrit,
  effectivePct,
} from './batteryEcoShape';
import { isNativeMemoryAvailable } from './nativeMemory';

// « Économie de batterie » (demande de l'utilisateur, 11/11/2026) : à 20 % de batterie
// ou moins, les décors animés (ambiance de saison, braises) sont coupés, de force. Les
// flammes de série restent. Retour après 25 % ou plus pendant 20 minutes d'affilée.
// Règles pures : lib/batteryEcoShape.js. C'est le niveau 2 du « mode allégé »
// (lib/lightMode.js), qui l'applique en même temps que la chauffe.
//
// DEUX états, volontairement séparés :
//  - l'état VOULU (`state`) suit la batterie : alimenté par lib/deviceWatch.js (événements
//    poussés par le système : niveau de batterie ET mode économie d'énergie du téléphone ;
//    relevé à la minute seulement en secours sur un ancien APK) ;
//  - l'état APPLIQUÉ (`applied`) est ce que l'interface montre. Il ne change JAMAIS
//    devant les yeux de la personne : il rattrape l'état voulu au prochain changement
//    d'écran (applyEcoPending, appelé par lib/lightMode.js) ou au démarrage de l'app.

const KEY = 'flexTimer_batteryEco';

let state = INITIAL_ECO; // état voulu RÉEL (enregistré)
let simState = null; // simulation de test (Paramètres › Mémoire), jamais enregistrée
let simPct = null;
let applied = false; // ce que l'interface montre
let lastPct = null;

// Niveau critique (≤ 10 %) : même la lueur de saison gardée à 20 % est coupée. Même principe
// voulu / appliqué que l'économie (jamais de changement devant les yeux).
const CRIT_KEY = 'flexTimer_batteryCrit';
let critState = false; // voulu RÉEL (enregistré)
let simCrit = null; // simulation de test
let critApplied = false; // ce que l'interface montre
const critListeners = new Set();
const critTarget = () => (simCrit != null ? simCrit : critState);

const appliedListeners = new Set();
const debugListeners = new Set();
const noticeListeners = new Set();

const target = () => (simState || state);

const buildDebug = () => {
  const t = target();
  return {
    available: isNativeMemoryAvailable(),
    pct: simPct != null ? simPct : lastPct,
    simulating: simPct != null,
    target: t.eco,
    applied,
    minutesLeft: minutesUntilRelease(t, Date.now()),
  };
};
let debugSnap = buildDebug();
const refreshDebug = () => {
  debugSnap = buildDebug();
  debugListeners.forEach((l) => l());
};

const persist = () => {
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
};

/** Les décors animés sont-ils coupés par l'économie de batterie (état appliqué) ? */
export const getEcoApplied = () => applied;

const subscribeApplied = (l) => {
  appliedListeners.add(l);
  return () => appliedListeners.delete(l);
};

/** Réservé à l'économie de batterie seule ; les écrans lisent plutôt `useLightLevel()`. */
export function useEcoApplied() {
  return useSyncExternalStore(subscribeApplied, getEcoApplied, () => false);
}

/** Niveau critique (≤ 10 %) appliqué : plus aucune lueur de saison. */
export const getEcoCritApplied = () => critApplied;
const subscribeCrit = (l) => {
  critListeners.add(l);
  return () => critListeners.delete(l);
};
export function useEcoCritApplied() {
  return useSyncExternalStore(subscribeCrit, getEcoCritApplied, () => false);
}

/** Pour le message « décors coupés » (BatteryEcoGate). */
export function subscribeEcoNotice(l) {
  noticeListeners.add(l);
  return () => noticeListeners.delete(l);
}

/** Pour l'écran Paramètres › Mémoire : { available, pct, simulating, target, applied, minutesLeft }. */
export const getEcoDebug = () => debugSnap;
export function subscribeEcoDebug(l) {
  debugListeners.add(l);
  return () => debugListeners.delete(l);
}

const markNoticed = () => {
  if (simState) {
    simState = { ...simState, noticed: true };
  } else {
    state = { ...state, noticed: true };
    persist();
  }
};

/**
 * Fait rattraper à l'interface l'état voulu. À appeler SEULEMENT à un changement d'écran
 * (jamais pendant qu'on regarde) et au démarrage — voir applyLightPending (lightMode.js).
 */
export function applyEcoPending() {
  const t = target();
  if (critApplied !== critTarget()) {
    critApplied = critTarget();
    critListeners.forEach((l) => l());
  }
  if (applied === t.eco) return;
  applied = t.eco;
  appliedListeners.forEach((l) => l());
  if (applied && !t.noticed) {
    markNoticed();
    noticeListeners.forEach((l) => l());
  }
  refreshDebug();
}

/** Relit l'état enregistré (au démarrage de l'app). */
export async function restoreBatteryEco() {
  try {
    state = parseStoredEco(await AsyncStorage.getItem(KEY));
  } catch {}
  try {
    critState = (await AsyncStorage.getItem(CRIT_KEY)) === '1';
  } catch {}
}

/** Une lecture de batterie (0 à 100) venue du relevé natif ; `null`/illisible = ignorée. */
export function feedBattery(rawPct, now = Date.now(), powerSave = false) {
  // Mode économie d'énergie du téléphone = comme si la batterie était à 20 % au plus.
  const pct = effectivePct(rawPct, powerSave);
  if (pct == null) return;
  lastPct = pct;
  const crit = nextCrit(critState, pct);
  if (crit !== critState) {
    critState = crit;
    AsyncStorage.setItem(CRIT_KEY, crit ? '1' : '0').catch(() => {});
  }
  const next = nextBatteryEco(state, pct, now);
  if (next !== state) {
    state = next;
    persist();
  }
  refreshDebug();
}

/**
 * OUTIL DE TEST (Paramètres › Mémoire) : simule un niveau de batterie sans toucher à l'état
 * enregistré ; `null` met fin à la simulation. Le changement s'applique, comme en vrai, au
 * prochain changement d'écran.
 */
export function setEcoSimulation(pct) {
  simPct = pct == null ? null : normalizePct(pct);
  simState = simPct == null ? null : nextBatteryEco(INITIAL_ECO, simPct, Date.now());
  simCrit = simPct == null ? null : nextCrit(false, simPct);
  refreshDebug();
}
