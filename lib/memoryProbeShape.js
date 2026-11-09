// Logique PURE du compteur de mémoire (aucun import React Native : testable avec Node).
//
// On ne mesure ici que la mémoire du CODE de l'app (le « tas » JavaScript de
// Hermes, via `performance.memory`). Elle monte quand l'app garde des données
// ou des objets dont elle n'a plus besoin. Elle monte et descend en dents de scie
// (le ramasse-miettes la vide de temps en temps) : ce qui compte est le PLANCHER
// (le plus bas atteint), car un plancher qui monte écran après écran = quelque
// chose s'accumule.
// La mémoire TOTALE de l'app (images, vues natives, sons) n'est pas lisible depuis
// le JavaScript : elle demandera un petit module natif (prochain APK).

export const MB = 1024 * 1024;

export const EMPTY_STATS = Object.freeze({
  now: null, // dernière lecture
  base: null, // première lecture après « Repartir de zéro »
  min: null, // plancher depuis le départ
  max: null, // pic depuis le départ
  samples: 0,
});

/** Met à jour les statistiques avec une nouvelle lecture (octets). */
export function nextStats(prev, used) {
  const p = prev || EMPTY_STATS;
  if (!Number.isFinite(used) || used <= 0) return p;
  return {
    now: used,
    base: p.base == null ? used : p.base,
    min: p.min == null ? used : Math.min(p.min, used),
    max: p.max == null ? used : Math.max(p.max, used),
    samples: p.samples + 1,
  };
}

/** Repart de zéro à partir de la dernière lecture connue. */
export function resetStats(prev) {
  const used = prev && prev.now;
  if (!Number.isFinite(used)) return EMPTY_STATS;
  return { now: used, base: used, min: used, max: used, samples: 1 };
}

/** « 23,4 Mo » (une décimale sous 100 Mo) ; « — » si inconnu. */
export function formatMb(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  const mb = bytes / MB;
  return `${(mb >= 100 ? mb.toFixed(0) : mb.toFixed(1)).replace('.', ',')} Mo`;
}

/** Écart signé « +4,2 Mo » / « −1,0 Mo » / « stable » (moins de 0,3 Mo). */
export function formatDelta(now, base) {
  if (!Number.isFinite(now) || !Number.isFinite(base)) return '';
  const d = (now - base) / MB;
  if (Math.abs(d) < 0.3) return 'stable';
  const txt = Math.abs(d) >= 100 ? Math.abs(d).toFixed(0) : Math.abs(d).toFixed(1);
  return `${d > 0 ? '+' : '−'}${txt.replace('.', ',')} Mo`;
}

/** Lecture brute de `performance.memory` → octets utilisés, ou null si absente. */
export function pickUsedBytes(memory) {
  if (!memory) return null;
  const used = Number(memory.usedJSHeapSize);
  return Number.isFinite(used) && used > 0 ? used : null;
}
