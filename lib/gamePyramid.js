// Jeu « La pyramide » : des séries qui MONTENT (1, 2, 3…), DESCENDENT (…3, 2, 1)
// ou font les deux, avec un repos entre chaque. Une voix compte les répétitions
// de chaque série. Module PUR (aucun import React Native) : testable en Node,
// partagé par l'écran et le test. L'exercice, le groupe et le rythme viennent
// de lib/gameCount.js (mêmes exercices au poids du corps).

export const MAX_PEAK = 15; // clips de chiffres : jusqu'à 120, mais 15 suffit largement
export const MAX_TOTAL = MAX_PEAK * MAX_PEAK; // pyramide complète 1→N→1 = N²

export const FORMATS = {
  up: { id: 'up', label: 'Évolutif', hint: 'Tu montes : 1, 2, 3…' },
  down: { id: 'down', label: 'Dégressif', hint: 'Tu descends : …3, 2, 1' },
  pyramid: { id: 'pyramid', label: 'Pyramide', hint: 'Tu montes puis tu redescends' },
};
export const DEFAULT_FORMAT = 'pyramid';

export const PEAKS = [5, 8, 10, 12, 15];
export const DEFAULT_PEAK = 8;

export const getFormat = (id) => FORMATS[id] || FORMATS[DEFAULT_FORMAT];
export const clampPeak = (peak) =>
  Math.max(2, Math.min(MAX_PEAK, Math.floor(Number(peak) || DEFAULT_PEAK)));

// Nombre de répétitions de chaque série, dans l'ordre.
//   up      : [1, 2, …, N]
//   down    : [N, …, 2, 1]
//   pyramid : [1, …, N, …, 2, 1]  (le sommet n'est fait qu'une fois)
export const buildSets = (formatId, peak) => {
  const n = clampPeak(peak);
  const up = Array.from({ length: n }, (_, i) => i + 1);
  const down = [...up].reverse();
  if (formatId === 'up') return up;
  if (formatId === 'down') return down;
  return [...up, ...down.slice(1)];
};

export const totalReps = (sets) => sets.reduce((sum, r) => sum + r, 0);

// Repos (en secondes) entre la série i et la série i+1 : il suit la plus grosse
// des deux. En montée on se repose avant une série plus dure, en descente on
// récupère de celle qu'on vient de finir ; au sommet les deux sont égales.
// Court exprès (le but est de se fatiguer et de battre son record) : 5 s jusqu'à
// 5 répétitions, puis 1 s de plus par répétition (8 → 8 s, 15 → 15 s). Le plancher
// de 5 s est celui du décompte 3-2-1-GO, qui tient dans les 3,85 dernières secondes.
// (Avant le 03/11/2026 : 8 s + 2,5 s par répétition, soit 13 s dès la série de 2.)
export const REST_MIN_S = 5;
const REST_FREE_REPS = 5;
const REST_PER_REP_S = 1;
export const restSeconds = (before, after) =>
  Math.round(REST_MIN_S + REST_PER_REP_S * Math.max(0, Math.max(before, after) - REST_FREE_REPS));

// Total fait quand on s'arrête dans la série `setIndex` après `partial` reps
// (setIndex = nombre de séries ENTIÈRES déjà terminées).
export const repsDone = (sets, setIndex, partial = 0) =>
  totalReps(sets.slice(0, Math.max(0, setIndex))) + Math.max(0, partial);

// Durée totale prévue (secondes) : répétitions au rythme donné + repos.
export const plannedSeconds = (sets, repMs) => {
  let ms = 0;
  sets.forEach((r, i) => {
    ms += r * repMs;
    if (i < sets.length - 1) ms += restSeconds(r, sets[i + 1]) * 1000;
  });
  return Math.round(ms / 1000);
};

// ─── Scores (liste locale, jamais envoyée) ───────────────────────────────
// Un record se compare à armes égales : même exercice, même format, même sommet.

export const pyramidKey = (exerciseId, formatId, peak) => `${exerciseId}|${formatId}|${peak}`;

const isEntry = (e) =>
  e &&
  typeof e.id === 'string' &&
  typeof e.exercise === 'string' &&
  typeof e.format === 'string' &&
  Number.isInteger(e.peak) &&
  e.peak >= 2 &&
  e.peak <= MAX_PEAK &&
  Number.isInteger(e.total) &&
  e.total >= 0 &&
  e.total <= MAX_TOTAL &&
  Number.isFinite(e.at);

export const sanitizePyramidScores = (raw) => (Array.isArray(raw) ? raw.filter(isEntry) : []);

export const addPyramidScore = (
  list,
  { exercise, format, peak, total, complete, tempo },
  now = Date.now()
) => {
  const entry = {
    id: `${now}_${Math.floor(Math.random() * 1e6)}`,
    exercise,
    format,
    peak: clampPeak(peak),
    total: Math.max(0, Math.min(MAX_TOTAL, Math.floor(Number(total) || 0))),
    complete: !!complete,
    tempo,
    at: now,
  };
  return [entry, ...list].slice(0, 200);
};

export const removePyramidScore = (list, id) => list.filter((e) => e.id !== id);

export const bestPyramidScore = (list, exerciseId, formatId, peak) =>
  list
    .filter((e) => e.exercise === exerciseId && e.format === formatId && e.peak === peak)
    .reduce((m, e) => Math.max(m, e.total), 0);
