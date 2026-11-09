import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_STATS, nextStats, resetStats, pickUsedBytes } from './memoryProbeShape';

// Suivi en direct de la mémoire du code (voir lib/memoryProbeShape.js). Un seul
// minuteur partagé, actif SEULEMENT tant qu'un écran ou le compteur flottant
// écoute : désactivé, ça ne coûte rien.

const SAMPLE_MS = 1500;
const BADGE_KEY = 'flexTimer_memBadge';

let stats = EMPTY_STATS;
let timer = null;
const listeners = new Set();

function readUsedBytes() {
  try {
    return pickUsedBytes(globalThis.performance?.memory);
  } catch {
    return null;
  }
}

const notify = () => listeners.forEach((l) => l(stats));

function tick() {
  const used = readUsedBytes();
  if (used == null) return;
  stats = nextStats(stats, used);
  notify();
}

/** true si le téléphone/moteur donne une lecture de mémoire. */
export const isMemoryReadable = () => readUsedBytes() != null;

/** Écoute les statistiques ; renvoie la fonction qui arrête l'écoute. */
export function subscribeMemory(listener) {
  listeners.add(listener);
  if (!timer) {
    tick();
    timer = setInterval(tick, SAMPLE_MS);
  }
  listener(stats);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function resetMemoryBaseline() {
  tick();
  stats = resetStats(stats);
  notify();
}

// --- Compteur flottant (réglage mémorisé) -----------------------------------
let badgeOn = false;
let badgeLoaded = false;
const badgeListeners = new Set();

export async function loadMemoryBadge() {
  if (!badgeLoaded) {
    badgeLoaded = true;
    try {
      badgeOn = (await AsyncStorage.getItem(BADGE_KEY)) === '1';
    } catch {}
    badgeListeners.forEach((l) => l(badgeOn));
  }
  return badgeOn;
}

export function setMemoryBadge(on) {
  badgeOn = !!on;
  badgeLoaded = true;
  badgeListeners.forEach((l) => l(badgeOn));
  AsyncStorage.setItem(BADGE_KEY, badgeOn ? '1' : '0').catch(() => {});
}

export function subscribeMemoryBadge(listener) {
  badgeListeners.add(listener);
  listener(badgeOn);
  return () => badgeListeners.delete(listener);
}
