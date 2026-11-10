import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  INITIAL_ECO,
  nextBatteryEco,
  normalizePct,
  parseStoredEco,
  minutesUntilRelease,
} from './batteryEcoShape';
import { getNativeStats, isNativeMemoryAvailable } from './nativeMemory';

// « Économie de batterie » (demande de l'utilisateur, 11/11/2026) : à 20 % de batterie
// ou moins, les décors animés (ambiance de saison, braises) sont coupés, de force. Les
// flammes de série restent. Retour après 25 % ou plus pendant 20 minutes d'affilée.
// Règles pures : lib/batteryEcoShape.js.
//
// DEUX états, volontairement séparés :
//  - l'état VOULU (`state`) suit la batterie : relevé toutes les 60 s au premier plan et
//    au retour dans l'app ;
//  - l'état APPLIQUÉ (`applied`) est ce que l'interface montre. Il ne change JAMAIS
//    devant les yeux de la personne : il rattrape l'état voulu au prochain changement
//    d'écran (applyEcoPending, appelé par BatteryEcoGate) ou au démarrage de l'app.
//
// La batterie est lue par le module natif PerfProbe (APK 18.6.0 et suivants). Sans lui
// (ancien APK, iOS), rien n'est lu et rien ne change : les décors restent comme avant.

const KEY = 'flexTimer_batteryEco';
const POLL_MS = 60 * 1000;

let state = INITIAL_ECO; // état voulu RÉEL (enregistré)
let simState = null; // simulation de test (Paramètres › Mémoire), jamais enregistrée
let simPct = null;
let applied = false; // ce que l'interface montre
let lastPct = null;
let started = false;
let pollTimer = null;
let sampling = false;

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

/** Les décors animés doivent-ils être coupés MAINTENANT (état appliqué) ? */
export const getEcoApplied = () => applied;

const subscribeApplied = (l) => {
  appliedListeners.add(l);
  return () => appliedListeners.delete(l);
};

/** À lire dans tout composant qui dessine un décor animé : vrai = ne rien dessiner. */
export function useEcoApplied() {
  return useSyncExternalStore(subscribeApplied, getEcoApplied, () => false);
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
 * (jamais pendant qu'on regarde) et au démarrage.
 */
export function applyEcoPending() {
  const t = target();
  if (applied === t.eco) return;
  applied = t.eco;
  appliedListeners.forEach((l) => l());
  if (applied && !t.noticed) {
    markNoticed();
    noticeListeners.forEach((l) => l());
  }
  refreshDebug();
}

async function sample() {
  if (sampling) return;
  sampling = true;
  try {
    const stats = await getNativeStats();
    const pct = normalizePct(stats && stats.batteryPct);
    if (pct != null) {
      lastPct = pct;
      const next = nextBatteryEco(state, pct, Date.now());
      if (next !== state) {
        state = next;
        persist();
      }
      refreshDebug();
    }
  } finally {
    sampling = false;
  }
}

/** Démarre le suivi (une seule fois, au lancement de l'app). Sans module natif : rien. */
export async function startBatteryEco() {
  if (started) return;
  started = true;
  if (!isNativeMemoryAvailable()) return;
  try {
    state = parseStoredEco(await AsyncStorage.getItem(KEY));
  } catch {}
  await sample();
  // Au démarrage l'écran n'a encore rien montré : on applique tout de suite.
  applyEcoPending();
  pollTimer = setInterval(sample, POLL_MS);
  AppState.addEventListener('change', (s) => {
    if (s === 'active') sample();
  });
}

/**
 * OUTIL DE TEST (Paramètres › Mémoire) : simule un niveau de batterie sans toucher à l'état
 * enregistré ; `null` met fin à la simulation. Le changement s'applique, comme en vrai, au
 * prochain changement d'écran.
 */
export function setEcoSimulation(pct) {
  simPct = pct == null ? null : normalizePct(pct);
  simState = simPct == null ? null : nextBatteryEco(INITIAL_ECO, simPct, Date.now());
  refreshDebug();
}
