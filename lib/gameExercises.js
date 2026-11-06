// L'exercice d'une partie de jeu (demande de l'utilisateur, 06/11/2026). Les jeux n'ont
// plus de choix d'exercice AVANT la partie (écran calme) : après, la personne peut noter
// ce qu'elle a fait en maintenant son score, dans une petite fenêtre de fiches
// (« Tractions », « Pompes »…), et en ajouter à elle. Rien ne s'ouvre tout seul.
//
// Module PUR (aucun import React Native) : testable en Node.
// L'exercice n'est qu'une ÉTIQUETTE : les records restent par format et sommet.

// Deux exercices au plus (ex. tractions + pompes dans la même partie).
export const MAX_GAME_EXERCISES = 2;
// Longueur d'un exercice écrit à la main (en caractères, pas en octets).
export const GAME_EXERCISE_MAX = 24;
// Nombre de fiches montrées d'un coup : peu de choses à l'écran, jamais une liste.
export const MAX_GAME_OPTIONS = 8;
// Le halo d'invitation ne reste pas allumé indéfiniment sur un vieux score.
export const HALO_MAX_AGE_MS = 6 * 60 * 60 * 1000;

// Poids du corps, comme les jeux (noms identiques à ceux du planning, lib/exercises.js).
export const GAME_EXERCISE_SUGGESTIONS = [
  'Pompes',
  'Tractions',
  'Squat',
  'Fentes',
  'Dips',
  'Tractions australiennes',
  'Pompes diamant',
  'Squat sauté',
];

const sameLabel = (a, b) => a.toLowerCase() === b.toLowerCase();

/** Un exercice écrit à la main, propre : espaces nettoyés, 24 caractères, 1ʳᵉ lettre en capitale. */
export const cleanExerciseLabel = (value) => {
  const text = Array.from(String(value ?? '').replace(/\s+/g, ' ').trim())
    .slice(0, GAME_EXERCISE_MAX)
    .join('')
    .trim();
  if (!text) return '';
  const [first, ...rest] = Array.from(text);
  return first.toUpperCase() + rest.join('');
};

/** Liste d'exercices propre : nettoyée, sans doublon (casse ignorée), 2 au plus. */
export const normalizeExercises = (list) => {
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const label = cleanExerciseLabel(raw);
    if (label && !out.some((x) => sameLabel(x, label))) out.push(label);
    if (out.length >= MAX_GAME_EXERCISES) break;
  }
  return out;
};

/**
 * Touche une fiche : la retire si elle est choisie, sinon l'ajoute. Si on en a déjà
 * deux, la plus ancienne laisse sa place (jamais de fiche qui refuse de se choisir).
 */
export const toggleExercise = (selected, label) => {
  const clean = cleanExerciseLabel(label);
  const current = normalizeExercises(selected);
  if (!clean) return current;
  if (current.some((x) => sameLabel(x, clean))) return current.filter((x) => !sameLabel(x, clean));
  return [...current, clean].slice(-MAX_GAME_EXERCISES);
};

/**
 * Les fiches montrées : celles déjà choisies d'abord, puis les dernières utilisées
 * (`recent`, la plus récente en premier), les exercices de la personne (`custom`) et
 * les suggestions pour compléter — 8 au plus, sans doublon.
 */
export const exerciseOptions = ({ selected = [], recent = [], custom = [] } = {}) => {
  const out = [];
  const add = (label) => {
    const clean = cleanExerciseLabel(label);
    if (clean && !out.some((x) => sameLabel(x, clean))) out.push(clean);
  };
  normalizeExercises(selected).forEach(add);
  recent.slice(0, 4).forEach(add);
  custom.slice(0, 4).forEach(add);
  GAME_EXERCISE_SUGGESTIONS.forEach(add);
  return out.slice(0, Math.max(MAX_GAME_OPTIONS, normalizeExercises(selected).length));
};

/** « Tractions + Pompes », ou '' sans exercice. */
export const exercisesLabel = (list) => normalizeExercises(list).join(' + ');

/** Exercices utilisés dans une liste de parties, du plus récent au plus ancien, sans doublon. */
export const recentExercises = (scores) => {
  const out = [];
  for (const s of Array.isArray(scores) ? scores : []) {
    for (const label of normalizeExercises(s?.exercises)) {
      if (!out.some((x) => sameLabel(x, label))) out.push(label);
    }
  }
  return out;
};

/**
 * Le halo d'invitation brille sur le DERNIER score s'il n'a pas d'exercice et qu'il
 * est récent. `newest` = le score le plus récent de la liste.
 */
export const shouldHalo = (score, newest, now = Date.now()) =>
  !!score &&
  !!newest &&
  score.id === newest.id &&
  normalizeExercises(score.exercises).length === 0 &&
  Number.isFinite(score.at) &&
  now - score.at >= 0 &&
  now - score.at <= HALO_MAX_AGE_MS;

/** Pose (ou retire, si la liste est vide) les exercices d'un score ; le reste est intact. */
export const setScoreExercises = (list, id, exercises) =>
  list.map((e) => {
    if (e.id !== id) return e;
    const clean = normalizeExercises(exercises);
    const { exercises: _old, ...rest } = e;
    return clean.length ? { ...rest, exercises: clean } : rest;
  });
