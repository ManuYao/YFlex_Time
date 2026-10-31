// Jeu « Le chef d'orchestre » : une voix compte à voix haute (1, 2, 3…) et, de
// temps en temps, SE TAIT. Pendant le silence on s'arrête (pompes, tractions…),
// quand le compte reprend on reprend. Module PUR (aucun import React Native) :
// testable en Node, partagé par l'écran et le test.

export const MAX_COUNT = 120;

// Délai moyen entre deux chiffres, en millisecondes.
export const TEMPOS = {
  calm: { id: 'calm', label: 'Tranquille', ms: 1900 },
  normal: { id: 'normal', label: 'Normal', ms: 1450 },
  fast: { id: 'fast', label: 'Rapide', ms: 1100 },
};
export const DEFAULT_TEMPO = 'normal';

const FIRST_PAUSE = [5, 12]; // première pause après le chiffre 5 à 12
const GAP_BETWEEN_PAUSES = [4, 18]; // puis une pause tous les 4 à 18 chiffres
const PAUSE_MS = [2600, 7200]; // pause franche
const FAKE_PAUSE_CHANCE = 0.22; // une « fausse » pause plus courte, pour piéger
const FAKE_PAUSE_MS = [1700, 2600];
const JITTER = 0.1; // le rythme bouge de ±10 % pour qu'on ne le devine pas

const randInt = (rng, [min, max]) => min + Math.floor(rng() * (max - min + 1));
const randMs = (rng, [min, max]) => Math.round(min + rng() * (max - min));

export const newPlanner = (rng = Math.random) => ({
  nextPauseAt: randInt(rng, FIRST_PAUSE),
});

// Après avoir dit le chiffre `count`, combien de temps avant le suivant ?
// Renvoie { delayMs, pauseMs } : `pauseMs` > 0 quand c'est un silence voulu
// (déjà inclus dans `delayMs`). Modifie `planner`.
export const planAfter = (planner, count, tempoMs, rng = Math.random) => {
  const jitter = 1 + (rng() * 2 - 1) * JITTER;
  const base = Math.round(tempoMs * jitter);
  if (count < planner.nextPauseAt) return { delayMs: base, pauseMs: 0 };
  const fake = rng() < FAKE_PAUSE_CHANCE;
  const pauseMs = randMs(rng, fake ? FAKE_PAUSE_MS : PAUSE_MS);
  planner.nextPauseAt = count + randInt(rng, GAP_BETWEEN_PAUSES);
  return { delayMs: base + pauseMs, pauseMs };
};

// ─── Scores (liste locale, jamais envoyée) ───────────────────────────────

export const GAMES = {
  pushups: { id: 'pushups', label: 'Pompes', unit: 'pompes' },
};

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
