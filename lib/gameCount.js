// Jeu « Le chef d'orchestre » : une voix compte à voix haute (1, 2, 3…) et, de
// temps en temps, SE TAIT. Pendant le silence on s'arrête (pompes, tractions…),
// quand le compte reprend on reprend. Module PUR (aucun import React Native) :
// testable en Node, partagé par l'écran et le test.

export const MAX_COUNT = 120;

// Rythme : multiplicateur appliqué au temps d'UNE répétition (COUNT_REP_MS). C'est le
// seul réglage de vitesse du jeu : « Tranquille » pour un exercice plus lent (traction,
// squat, fente ≈ 2 s), « Rapide » pour un exercice vif.
export const TEMPOS = {
  calm: { id: 'calm', label: 'Tranquille', factor: 1.3 },
  normal: { id: 'normal', label: 'Normal', factor: 1 },
  fast: { id: 'fast', label: 'Rapide', factor: 0.76 },
};
export const DEFAULT_TEMPO = 'normal';

// ─── Plus de choix de muscle ni d'exercice (décision du 06/11/2026, comme la pyramide) ───
// Un seul rythme de base pour tous les exercices : celui des pompes (1 450 ms), que
// l'utilisateur a testé en salle, même sur une machine sans rapport avec les pectoraux.
// Avant, chaque exercice avait son temps (traction 2,0 s, australienne 1,8 s, squat 2,0 s,
// fente 2,5 s ; recherche web du 05/11, sources faibles) et ses silences : plus tôt et plus
// rapprochés sur un exercice dur. Les silences sont maintenant un juste milieu pour tous.
// À ajuster d'après ses retours de terrain, ici et nulle part ailleurs.
export const COUNT_REP_MS = 1450;
const FIRST_PAUSE = [4, 10]; // 1er silence après 4 à 10 répétitions
const PAUSE_GAP = [3, 14]; // puis un silence toutes les 3 à 14 répétitions

// Délai moyen entre deux chiffres pour ce rythme.
export const tempoMs = (tempoId) =>
  Math.round(COUNT_REP_MS * (TEMPOS[tempoId] || TEMPOS[DEFAULT_TEMPO]).factor);

const PAUSE_MS = [2600, 7200]; // pause franche
const FAKE_PAUSE_CHANCE = 0.22; // une « fausse » pause plus courte, pour piéger
const FAKE_PAUSE_MS = [1700, 2600];
const JITTER = 0.1; // le rythme bouge de ±10 % pour qu'on ne le devine pas

const randInt = (rng, [min, max]) => min + Math.floor(rng() * (max - min + 1));
const randMs = (rng, [min, max]) => Math.round(min + rng() * (max - min));

export const newPlanner = (rng = Math.random) => ({
  nextPauseAt: randInt(rng, FIRST_PAUSE),
  gap: PAUSE_GAP,
});

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

// Les anciens scores portent un champ `game` (l'exercice de l'époque), ignoré aujourd'hui.
const isEntry = (e) =>
  e &&
  typeof e.id === 'string' &&
  Number.isInteger(e.count) &&
  e.count >= 0 &&
  e.count <= MAX_COUNT &&
  Number.isFinite(e.at);

export const sanitizeScores = (raw) => (Array.isArray(raw) ? raw.filter(isEntry) : []);

export const addScore = (list, { count, tempo }, now = Date.now()) => {
  const n = Math.max(0, Math.min(MAX_COUNT, Math.floor(Number(count) || 0)));
  const entry = { id: `${now}_${Math.floor(Math.random() * 1e6)}`, count: n, tempo, at: now };
  return [entry, ...list].slice(0, 200);
};

export const removeScore = (list, id) => list.filter((e) => e.id !== id);

// Le record est unique (plus d'exercice) : le plus grand score, tous anciens scores compris.
export const bestScore = (list) => list.reduce((m, e) => Math.max(m, e.count), 0);
