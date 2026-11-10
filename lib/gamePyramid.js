// Jeu « La pyramide » : des séries qui MONTENT (1, 2, 3…), DESCENDENT (…3, 2, 1)
// ou font les deux, avec un repos entre chaque. Une voix compte les répétitions
// de chaque série. Module PUR (aucun import React Native) : testable en Node,
// partagé par l'écran et le test. Aucun choix d'exercice : un seul rythme pour tout
// (voir PYRAMID_REP_MS), la personne fait l'exercice qu'elle veut.

// Durée de base d'UNE répétition (ms), la même pour tous les exercices (décision du
// 06/11/2026 : « le temps des pompes me convient, même pour un exercice qui n'a rien à
// voir », testé en salle sur les pompes et sur une machine). C'est le rythme des pompes
// de l'ancien réglage (1 450 ms) ; la fatigue (FATIGUE_SLOWDOWN) l'allonge ensuite
// jusqu'à ~1,8 s vers la fin, ce qui convient aux exercices plus lents (tractions,
// squats, fentes ≈ 2 s). À ajuster d'après ses retours de terrain, ici et nulle part ailleurs.
export const PYRAMID_REP_MS = 1450;

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

// Fatigue : plus on avance dans la pyramide, plus la voix prend son temps, pour qu'on
// puisse suivre même fatigué et voir sa progression (demande du 05/11/2026 : une
// traction à 2 s au début, ~2,5 s vers la fin). La voix ralentit PROGRESSIVEMENT,
// d'après la part des répétitions déjà faites sur le total prévu (0 → 1), jamais
// d'après l'horloge : un long repos ne « fatigue » pas. Un seul réglage à ajuster :
// 0,25 = jusqu'à 25 % plus lent à la toute dernière répétition (le repos ne change pas).
export const FATIGUE_SLOWDOWN = 0.25;

// Durée (ms) de la répétition numéro `doneReps` (comptée depuis le début de la
// pyramide, la 1re = 1) pour une répétition de base `baseMs`.
export const repStepMs = (baseMs, doneReps, total) => {
  const progress = total > 0 ? Math.min(1, Math.max(0, doneReps / total)) : 0;
  return Math.round(baseMs * (1 + FATIGUE_SLOWDOWN * progress));
};

// Durée totale prévue (secondes) : répétitions au rythme donné (qui ralentit
// avec la fatigue) + repos.
export const plannedSeconds = (sets, repMs) => {
  const total = totalReps(sets);
  let ms = 0;
  let done = 0;
  sets.forEach((r, i) => {
    for (let k = 0; k < r; k += 1) {
      done += 1;
      ms += repStepMs(repMs, done, total);
    }
    if (i < sets.length - 1) ms += restSeconds(r, sets[i + 1]) * 1000;
  });
  return Math.round(ms / 1000);
};

// ─── Scores (liste locale, jamais envoyée) ───────────────────────────────
// Un record se compare à armes égales : même format, même sommet (plus d'exercice
// depuis le 06/11/2026 ; les anciens scores gardent leur champ `exercise`, ignoré).

export const pyramidKey = (formatId, peak) => `${formatId}|${peak}`;

const isEntry = (e) =>
  e &&
  typeof e.id === 'string' &&
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
  { format, peak, total, complete, historyId },
  now = Date.now()
) => {
  const entry = {
    id: `${now}_${Math.floor(Math.random() * 1e6)}`,
    format,
    peak: clampPeak(peak),
    total: Math.max(0, Math.min(MAX_TOTAL, Math.floor(Number(total) || 0))),
    complete: !!complete,
    at: now,
    // La séance JEU de l'Historique qui correspond à cette partie (pour y noter l'exercice aussi).
    ...(typeof historyId === 'string' ? { historyId } : {}),
  };
  return [entry, ...list].slice(0, 200);
};

export const removePyramidScore = (list, id) => list.filter((e) => e.id !== id);

export const bestPyramidScore = (list, formatId, peak) =>
  list
    .filter((e) => e.format === formatId && e.peak === peak)
    .reduce((m, e) => Math.max(m, e.total), 0);
