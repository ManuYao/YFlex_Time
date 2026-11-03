// Jeu « Combo Bi-Exo » : deux mots, deux exercices. Pendant 3 min 30 la voix crie
// l'un des deux mots au hasard ; dès qu'on l'entend, on fait UNE fois l'exercice
// qui va avec (ex. « Haut » = squat sauté, « Bas » = pompe). Les mots sont écrits
// par le joueur, mais il faut toujours DEUX mots différents. Module PUR (aucun
// import React Native) : testable en Node, partagé par l'écran et le test.

import { clipChars } from './text.js';
import { DEFAULT_TEMPO, TEMPOS } from './gameCount.js';

export const GAME_SECONDS = 210; // 3 min 30, durée fixe

export const WORD_MAX = 12; // lisible dans l'anneau de jeu, même en gros
export const EXO_MAX = 26;

// ─── Temps par exercice ──────────────────────────────────────────────────
// Le temps entre deux mots n'est pas fixe : il dépend de l'exercice qu'on vient de
// faire ET de celui qui arrive. Se relever après des pompes prend plus de temps
// qu'enchaîner deux pompes.
//
// `repS` = secondes pour faire UNE répétition. Repères trouvés : une pompe dure ~3 s
// (2 s de descente + 1 s de remontée, de 2 à 4 s selon les sources), une traction
// ~3 s (tempo 2-0-1-0), un burpee ~3 s pour un sportif rapide mais 6 à 12 s pour un
// débutant. Squats sautés, fentes, montées de genoux : aucune source chiffrée, ce sont
// des estimations. Les valeurs visent une personne plutôt lente : mieux vaut un peu
// long que trop court (le rythme « Rapide » raccourcit tout).
// `pose` = position du corps pendant l'exercice : au sol, debout, ou à la barre
// (un burpee commence et finit debout : il compte comme debout).
export const EXO_TIMINGS = {
  Pompes: { repS: 3.2, pose: 'floor' },
  'Squats sautés': { repS: 2.4, pose: 'stand' },
  Burpees: { repS: 5, pose: 'stand' },
  Squats: { repS: 2.8, pose: 'stand' },
  Fentes: { repS: 3, pose: 'stand' },
  Tractions: { repS: 3.5, pose: 'bar' },
  'Montées de genoux': { repS: 2.5, pose: 'stand' },
  Gainage: { repS: 5, pose: 'floor' }, // « une répétition » = un court maintien
};

// Idées d'exercices proposées sous chaque mot.
export const EXO_SUGGESTIONS = Object.keys(EXO_TIMINGS);

// Exercice inconnu ou pas choisi : on suppose un exercice debout de durée moyenne.
const DEFAULT_TIMING = { repS: 3, pose: 'stand' };

// Texte nettoyé : espaces en trop retirés, coupé sans casser un emoji.
export const cleanText = (text, max) =>
  clipChars(String(text ?? '').replace(/\s+/g, ' ').trim(), max);

export const exoTiming = (name) => EXO_TIMINGS[cleanText(name, EXO_MAX)] || DEFAULT_TIMING;

// Secondes pour changer de position entre deux exercices (en plus de la répétition).
const TRANSITION_S = {
  'floor>stand': 3, // se relever
  'stand>floor': 2, // descendre en position de pompe
  'stand>bar': 2.5, // aller se suspendre
  'bar>stand': 2.5, // lâcher la barre
  'floor>bar': 3.5, // se relever puis se suspendre
  'bar>floor': 3, // lâcher la barre puis descendre
};
const DEFAULT_TRANSITION_S = 2.5;

export const transitionS = (from, to) =>
  from === to ? 0 : TRANSITION_S[`${from}>${to}`] ?? DEFAULT_TRANSITION_S;

const REACTION_S = 1.2; // entendre le mot, comprendre, se mettre en place
const MIN_GAP_S = 1.8; // jamais moins, même au rythme « Rapide »

// Même exercice qui revient d'affilée : on est DÉJÀ en position, il ne faut pas
// attendre. Pas de changement de position et pas besoin de comprendre quel mot
// (c'est le même) : le mot suivant arrive juste après la fin de la répétition. On ne
// raccourcit jamais la répétition elle-même (une personne lente serait prise de
// court), et ça ne s'accélère pas au fil de la série : même écart à chaque fois.
const REPEAT_REACTION_S = 0.5;

// Secondes entre le mot qui annonce `fromExo` et le mot suivant, qui annonce `toExo` :
// faire la répétition, changer de position, puis le temps de réagir. `factor` = le
// rythme choisi (Tranquille 1,3 · Normal 1 · Rapide 0,76). `sameWord` = c'est le même
// mot qui est crié deux fois de suite ; le même exercice sous deux mots différents
// compte aussi comme une répétition.
export const gapSeconds = (fromExo, toExo, factor = 1, sameWord = false) => {
  const a = exoTiming(fromExo);
  const b = exoTiming(toExo);
  const fromName = cleanText(fromExo, EXO_MAX);
  const repeated = sameWord || (fromName !== '' && fromName === cleanText(toExo, EXO_MAX));
  const secs = repeated
    ? a.repS + REPEAT_REACTION_S
    : a.repS + transitionS(a.pose, b.pose) + REACTION_S;
  return Math.max(MIN_GAP_S, secs * factor);
};

export const DEFAULT_SETUP = {
  a: { word: 'Haut', exo: 'Squats sautés' },
  b: { word: 'Bas', exo: 'Pompes' },
};

// Forme de comparaison d'un mot : sans accent ni majuscule (« Bas » = « bas »).
export const wordKey = (word) =>
  cleanText(word, WORD_MAX)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// null si le réglage est jouable, sinon la raison.
export const setupProblem = (setup) => {
  const a = wordKey(setup?.a?.word);
  const b = wordKey(setup?.b?.word);
  if (!a || !b) return 'missing';
  if (a === b) return 'same';
  return null;
};

export const PROBLEM_TEXT = {
  missing: 'Il faut deux mots pour jouer.',
  same: 'Les deux mots doivent être différents.',
};

// Réglage relu depuis le stockage : jamais de confiance, tout est nettoyé.
export const sanitizeSetup = (raw) => {
  const side = (s, fallback) => ({
    word: typeof s?.word === 'string' ? cleanText(s.word, WORD_MAX) : fallback.word,
    exo: typeof s?.exo === 'string' ? cleanText(s.exo, EXO_MAX) : fallback.exo,
  });
  return { a: side(raw?.a, DEFAULT_SETUP.a), b: side(raw?.b, DEFAULT_SETUP.b) };
};

// ─── Déroulé d'une partie ────────────────────────────────────────────────
const MAX_RUN = 3; // jamais plus de 3 fois le même mot d'affilée
const LAST_MARGIN_MS = 3000; // plus d'appel dans les dernières secondes
const JITTER = 0.1; // les temps bougent de ±10 % pour qu'on ne devine pas le mot suivant

export const MAX_CALLS = 150;

// Mot suivant : au hasard, sauf si le même vient trois fois de suite.
const nextSide = (calls, rng) => {
  const n = calls.length;
  if (n >= MAX_RUN) {
    const last = calls[n - 1].side;
    if (calls.slice(n - MAX_RUN).every((c) => c.side === last)) return last === 'a' ? 'b' : 'a';
  }
  return rng() < 0.5 ? 'a' : 'b';
};

// Toute la partie d'avance : [{ atMs, side: 'a' | 'b' }], le premier appel à 0.
// L'écart avec l'appel précédent dépend de la paire d'exercices (voir gapSeconds)
// et du rythme choisi (`tempoId`, comme dans « Le chef d'orchestre »).
export const planCalls = (setup, tempoId = DEFAULT_TEMPO, rng = Math.random, durationSec = GAME_SECONDS) => {
  const factor = (TEMPOS[tempoId] || TEMPOS[DEFAULT_TEMPO]).factor;
  const endMs = durationSec * 1000 - LAST_MARGIN_MS;
  const calls = [];
  let at = 0;
  while (calls.length < MAX_CALLS) {
    const side = nextSide(calls, rng);
    if (calls.length) {
      const prev = calls[calls.length - 1].side;
      const jitter = 1 + (rng() * 2 - 1) * JITTER;
      const gap = gapSeconds(setup?.[prev]?.exo, setup?.[side]?.exo, factor, prev === side);
      at += Math.round(gap * 1000 * jitter);
    }
    if (at > endMs) break;
    calls.push({ atMs: at, side });
  }
  return calls;
};

// ─── Scores (liste locale, jamais envoyée) ───────────────────────────────
// Un record se compare à armes égales : même rythme (la durée est toujours la même).

const tempoOf = (id) => (TEMPOS[id] ? id : DEFAULT_TEMPO);

const isEntry = (e) =>
  e &&
  typeof e.id === 'string' &&
  Number.isInteger(e.total) &&
  e.total >= 0 &&
  e.total <= MAX_CALLS &&
  typeof e.words === 'string' &&
  Number.isFinite(e.at);

// `detail` (« 12 Pompes · 14 Squats sautés ») n'existe que sur les parties
// enregistrées après son ajout, `tempo` aussi (avant : un choix de durée, devenu
// « Normal ») : une entrée plus ancienne s'affiche sans.
export const sanitizeComboScores = (raw) =>
  Array.isArray(raw)
    ? raw.filter(isEntry).map((e) => ({
        id: e.id,
        tempo: tempoOf(e.tempo),
        total: e.total,
        complete: !!e.complete,
        words: e.words,
        detail: typeof e.detail === 'string' ? e.detail : '',
        at: e.at,
      }))
    : [];

// Nom affiché d'un côté : l'exercice choisi, sinon le mot lui-même.
export const sideLabel = (side) => cleanText(side?.exo, EXO_MAX) || cleanText(side?.word, WORD_MAX);

const clampCount = (n) => Math.max(0, Math.min(MAX_CALLS, Math.floor(Number(n) || 0)));

// « 12 Pompes · 14 Squats sautés » : ce qui a été fait pour chaque mot.
export const scoreDetail = (setup, counts) =>
  `${clampCount(counts?.a)} ${sideLabel(setup?.a)} · ${clampCount(counts?.b)} ${sideLabel(setup?.b)}`;

// `counts` = { a, b } : mots criés pour chaque mot ; le score est leur somme.
export const addComboScore = (list, { tempo, counts, complete, setup }, now = Date.now()) => {
  const words = `${cleanText(setup?.a?.word, WORD_MAX)} / ${cleanText(setup?.b?.word, WORD_MAX)}`;
  const entry = {
    id: `${now}_${Math.floor(Math.random() * 1e6)}`,
    tempo: tempoOf(tempo),
    total: Math.min(MAX_CALLS, clampCount(counts?.a) + clampCount(counts?.b)),
    complete: !!complete,
    words,
    detail: scoreDetail(setup, counts),
    at: now,
  };
  return [entry, ...list].slice(0, 200);
};

export const removeComboScore = (list, id) => list.filter((e) => e.id !== id);

export const bestComboScore = (list, tempoId) =>
  list.filter((e) => e.tempo === tempoOf(tempoId)).reduce((m, e) => Math.max(m, e.total), 0);

export const formatClock = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
