// Jeu « Combo Bi-Exo » : deux mots, deux exercices. Pendant un temps donné
// (2:00, 3:30 ou 5:00) la voix crie l'un des deux mots au hasard ; dès qu'on
// l'entend, on fait UNE fois l'exercice qui va avec (ex. « Haut » = squat sauté,
// « Bas » = pompe). Les mots et les exercices sont écrits par le joueur, mais
// il faut toujours DEUX mots différents. Module PUR (aucun import React Native) :
// testable en Node, partagé par l'écran et le test.

import { clipChars } from './text.js';

export const DURATIONS = [
  { id: 120, label: '2:00' },
  { id: 210, label: '3:30' },
  { id: 300, label: '5:00' },
];
export const DEFAULT_DURATION = 210;

export const WORD_MAX = 12; // lisible dans l'anneau de jeu, même en gros
export const EXO_MAX = 26;

export const DEFAULT_SETUP = {
  a: { word: 'Haut', exo: 'Squats sautés' },
  b: { word: 'Bas', exo: 'Pompes' },
};

// Idées d'exercices à une répétition rapide, proposées sous le champ.
export const EXO_SUGGESTIONS = [
  'Pompes',
  'Squats sautés',
  'Burpees',
  'Squats',
  'Fentes',
  'Tractions',
  'Montées de genoux',
  'Gainage',
];

// Texte nettoyé : espaces en trop retirés, coupé sans casser un emoji.
export const cleanText = (text, max) =>
  clipChars(String(text ?? '').replace(/\s+/g, ' ').trim(), max);

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
const GAP_MS = [2400, 4400]; // temps entre deux mots : de quoi faire une répétition
const MAX_RUN = 3; // jamais plus de 3 fois le même mot d'affilée
const LAST_MARGIN_MS = 2500; // plus d'appel dans les dernières secondes

export const MAX_CALLS = 150;

const randMs = (rng, [min, max]) => Math.round(min + rng() * (max - min));

// Toute la partie d'avance : [{ atMs, side: 'a' | 'b' }], le premier appel à 0.
export const planCalls = (durationSec, rng = Math.random) => {
  const endMs = durationSec * 1000 - LAST_MARGIN_MS;
  const calls = [];
  let at = 0;
  while (at <= endMs && calls.length < MAX_CALLS) {
    const last = calls[calls.length - 1];
    const prev = calls[calls.length - MAX_RUN];
    let side = rng() < 0.5 ? 'a' : 'b';
    // Trois fois le même de suite : on force l'autre.
    if (calls.length >= MAX_RUN && last.side === prev.side && calls[calls.length - 2].side === last.side) {
      side = last.side === 'a' ? 'b' : 'a';
    }
    calls.push({ atMs: at, side });
    at += randMs(rng, GAP_MS);
  }
  return calls;
};

// ─── Scores (liste locale, jamais envoyée) ───────────────────────────────
// Un record se compare à armes égales : même durée.

const isDuration = (d) => DURATIONS.some((x) => x.id === d);

const isEntry = (e) =>
  e &&
  typeof e.id === 'string' &&
  isDuration(e.duration) &&
  Number.isInteger(e.total) &&
  e.total >= 0 &&
  e.total <= MAX_CALLS &&
  typeof e.words === 'string' &&
  Number.isFinite(e.at);

export const sanitizeComboScores = (raw) => (Array.isArray(raw) ? raw.filter(isEntry) : []);

export const addComboScore = (list, { duration, total, complete, setup }, now = Date.now()) => {
  const words = `${cleanText(setup?.a?.word, WORD_MAX)} / ${cleanText(setup?.b?.word, WORD_MAX)}`;
  const entry = {
    id: `${now}_${Math.floor(Math.random() * 1e6)}`,
    duration: isDuration(duration) ? duration : DEFAULT_DURATION,
    total: Math.max(0, Math.min(MAX_CALLS, Math.floor(Number(total) || 0))),
    complete: !!complete,
    words,
    at: now,
  };
  return [entry, ...list].slice(0, 200);
};

export const removeComboScore = (list, id) => list.filter((e) => e.id !== id);

export const bestComboScore = (list, duration) =>
  list.filter((e) => e.duration === duration).reduce((m, e) => Math.max(m, e.total), 0);

export const formatClock = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
