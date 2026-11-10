import { requireOptionalNativeModule } from 'expo';

import {
  EMPTY_NATIVE_TRACK,
  normalizeNativeStats,
  normalizeThreads,
  nextNativeTrack,
  resetNativeTrack,
} from './nativeMemoryShape';

// Sonde NATIVE (modules/perf-probe, Android) : vraie mémoire de l'app, fils, temps
// processeur, chauffe, batterie, mémoire du téléphone. Complète lib/memoryProbe.js
// (qui ne voit que le tas JavaScript).
//
// Sans le module (ancien APK, Expo Go, iOS) `requireOptionalNativeModule` renvoie
// null : tout devient inoffensif (résultats null), jamais d'erreur. Une mise à jour
// OTA livrée AVANT le nouvel APK ne peut donc pas planter.
// La logique de calcul (suivi, % de processeur, constats) est dans
// lib/nativeMemoryShape.js (pure, testée avec Node).

const Native = requireOptionalNativeModule('PerfProbe');

/** true si ce téléphone a le module (APK récent). */
export const isNativeMemoryAvailable = () => !!Native;

/** Un relevé complet (voir normalizeNativeStats), ou null. */
export async function getNativeStats() {
  try {
    if (!Native) return null;
    return normalizeNativeStats(await Native.getStats());
  } catch {
    return null;
  }
}

/** Les 10 fils les plus gourmands (voir normalizeThreads), ou []. */
export async function getNativeThreadCpu() {
  try {
    if (!Native) return [];
    return normalizeThreads(await Native.getThreadCpu());
  } catch {
    return [];
  }
}

// ─── Suivi en direct ────────────────────────────────────────────────────────
// Un seul minuteur partagé, actif SEULEMENT tant que quelqu'un écoute : un écran
// fermé ne coûte rien. Un relevé = 2 appels natifs courts, jamais empilés (si le
// précédent n'est pas fini, on saute ce tour).

const SAMPLE_MS = 2000;

let track = EMPTY_NATIVE_TRACK;
let timer = null;
let pending = false;
const listeners = new Set();

const notify = () => listeners.forEach((l) => l(track));

async function tick() {
  if (pending || !Native) return;
  pending = true;
  try {
    const [stats, threads] = await Promise.all([getNativeStats(), getNativeThreadCpu()]);
    if (stats && listeners.size) {
      track = nextNativeTrack(track, stats, threads);
      notify();
    }
  } finally {
    pending = false;
  }
}

/**
 * Écoute le suivi (voir EMPTY_NATIVE_TRACK : `now`, `base`, `cpuPct`, `threads`…) ;
 * renvoie la fonction qui arrête l'écoute. Sans module natif : le suivi reste vide
 * et aucun minuteur ne démarre.
 */
export function subscribeNativeMemory(listener) {
  listeners.add(listener);
  if (Native && !timer) {
    tick();
    timer = setInterval(tick, SAMPLE_MS);
  }
  listener(track);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Dernier suivi connu (sans écouter). */
export const getNativeTrack = () => track;

/** « Repartir de zéro » : le dernier relevé devient le départ. */
export function resetNativeBaseline() {
  track = resetNativeTrack(track);
  notify();
}
