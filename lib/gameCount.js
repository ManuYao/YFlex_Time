// Jeu « Le chef d'orchestre » : une voix compte à voix haute (1, 2, 3…) et, de
// temps en temps, SE TAIT. Pendant le silence on s'arrête (pompes, tractions…),
// quand le compte reprend on reprend. Module PUR (aucun import React Native) :
// testable en Node, partagé par l'écran et le test.

export const MAX_COUNT = 120;

// Rythme : multiplicateur appliqué au temps d'UNE répétition de l'exercice
// (chaque exercice a son propre temps, voir EXERCISES).
export const TEMPOS = {
  calm: { id: 'calm', label: 'Tranquille', factor: 1.3 },
  normal: { id: 'normal', label: 'Normal', factor: 1 },
  fast: { id: 'fast', label: 'Rapide', factor: 0.76 },
};
export const DEFAULT_TEMPO = 'normal';

// ─── Groupes musculaires et exercices (tous au poids du corps) ───────────
// `repMs` = durée d'une répétition au rythme « Normal », pensée pour que la voix
// colle au vrai mouvement : une pompe se fait vite, une traction un peu moins, une fente
// plus lentement (pas bâclée). Réglé le 05/11/2026 : la traction à 3,0 s était « beaucoup
// trop lente » (retour de l'utilisateur) ; recherche web (sources faibles, rien de mesuré
// pour une rép de circuit) : traction ~2,0 s, australienne ~1,8 s, squat ~2,0 s, fente ~2,5 s.
// `firstPause` / `gap` = quand tombent les silences : plus tôt et plus
// rapprochés sur un exercice dur (tractions), plus tard sur un exercice facile.
// L'identifiant `pushups` est gardé tel quel : les anciens scores restent valides.
export const MUSCLE_GROUPS = {
  chest: { id: 'chest', label: 'Pectoraux', exercises: ['pushups'] },
  back: { id: 'back', label: 'Dos', exercises: ['pullups', 'rows'] },
  legs: { id: 'legs', label: 'Jambes', exercises: ['squats', 'lunges'] },
};
export const DEFAULT_GROUP = 'chest';

export const EXERCISES = {
  pushups: { id: 'pushups', group: 'chest', label: 'Pompes', unit: 'pompes', repMs: 1450, firstPause: [5, 12], gap: [4, 18] },
  pullups: { id: 'pullups', group: 'back', label: 'Tractions', unit: 'tractions', repMs: 2000, firstPause: [2, 5], gap: [2, 6] },
  rows: { id: 'rows', group: 'back', label: 'Tractions australiennes', unit: 'tractions', repMs: 1800, firstPause: [4, 9], gap: [3, 12] },
  squats: { id: 'squats', group: 'legs', label: 'Squats', unit: 'squats', repMs: 2000, firstPause: [6, 14], gap: [5, 20] },
  lunges: { id: 'lunges', group: 'legs', label: 'Fentes', unit: 'fentes', repMs: 2500, firstPause: [4, 10], gap: [3, 12] },
};
export const DEFAULT_EXERCISE = 'pushups';

export const getExercise = (id) => EXERCISES[id] || EXERCISES[DEFAULT_EXERCISE];
export const exercisesOf = (groupId) =>
  (MUSCLE_GROUPS[groupId]?.exercises || []).map((id) => EXERCISES[id]);

// Délai moyen entre deux chiffres pour cet exercice et ce rythme.
export const tempoMs = (exerciseId, tempoId) =>
  Math.round(getExercise(exerciseId).repMs * (TEMPOS[tempoId] || TEMPOS[DEFAULT_TEMPO]).factor);

const PAUSE_MS = [2600, 7200]; // pause franche
const FAKE_PAUSE_CHANCE = 0.22; // une « fausse » pause plus courte, pour piéger
const FAKE_PAUSE_MS = [1700, 2600];
const JITTER = 0.1; // le rythme bouge de ±10 % pour qu'on ne le devine pas

const randInt = (rng, [min, max]) => min + Math.floor(rng() * (max - min + 1));
const randMs = (rng, [min, max]) => Math.round(min + rng() * (max - min));

export const newPlanner = (rng = Math.random, exerciseId = DEFAULT_EXERCISE) => {
  const ex = getExercise(exerciseId);
  return { nextPauseAt: randInt(rng, ex.firstPause), gap: ex.gap };
};

// Après avoir dit le chiffre `count`, combien de temps avant le suivant ?
// Renvoie { delayMs, pauseMs } : `pauseMs` > 0 quand c'est un silence voulu
// (déjà inclus dans `delayMs`). Modifie `planner`.
export const planAfter = (planner, count, tempoMsValue, rng = Math.random) => {
  const jitter = 1 + (rng() * 2 - 1) * JITTER;
  const base = Math.round(tempoMsValue * jitter);
  if (count < planner.nextPauseAt) return { delayMs: base, pauseMs: 0 };
  const fake = rng() < FAKE_PAUSE_CHANCE;
  const pauseMs = randMs(rng, fake ? FAKE_PAUSE_MS : PAUSE_MS);
  planner.nextPauseAt = count + randInt(rng, planner.gap);
  return { delayMs: base + pauseMs, pauseMs };
};

// ─── Scores (liste locale, jamais envoyée) ───────────────────────────────

const isEntry = (e) =>
  e &&
  typeof e.id === 'string' &&
  typeof e.game === 'string' &&
  Number.isInteger(e.count) &&
  e.count >= 0 &&
  e.count <= MAX_COUNT &&
  Number.isFinite(e.at);

export const sanitizeScores = (raw) => (Array.isArray(raw) ? raw.filter(isEntry) : []);

export const addScore = (list, { game, count, tempo }, now = Date.now()) => {
  const n = Math.max(0, Math.min(MAX_COUNT, Math.floor(Number(count) || 0)));
  const entry = { id: `${now}_${Math.floor(Math.random() * 1e6)}`, game, count: n, tempo, at: now };
  return [entry, ...list].slice(0, 200);
};

export const removeScore = (list, id) => list.filter((e) => e.id !== id);

export const bestScore = (list, game) =>
  list.filter((e) => e.game === game).reduce((m, e) => Math.max(m, e.count), 0);
