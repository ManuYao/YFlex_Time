// Stockage local du « noter mon exercice » des jeux (voir lib/gameExercises.js).
// Données LOCALES, purgées par la réinitialisation complète (Paramètres).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { addToLibrary, removeFromLibrary } from './gameExercises';
import {
  GAME_TAG_TIP_ALWAYS,
  INITIAL_TIP_STATE,
  normalizeTipState,
  onGameFinished,
  onTipOutcome,
} from './gameTagTip';

// La liste des exercices que la personne a ajoutés elle-même (le plus récent en
// premier) : commune à TOUS les jeux, elle ne se retape jamais. Supprimer un exercice ici
// le retire de la liste pour de bon (les parties déjà notées gardent leur texte).
export const GAME_EXERCISES_KEY = 'flexTimer_gameExercises';
// État de la bulle d'explication ({ done, skips, since }, voir lib/gameTagTip.js). « 2 » : la
// première version (flexTimer_gameTagTip) pouvait être comptée comme vue sans s'être
// affichée, donc tout le monde repart de zéro.
export const GAME_TAG_TIP_KEY = 'flexTimer_gameTagTip2';

// Toutes les opérations sur la liste passent les unes derrière les autres : deux ajouts
// rapprochés ne s'écrasent pas, et une lecture voit toujours les écritures déjà demandées.
let chain = Promise.resolve();
const enqueue = (op) => {
  const run = chain.then(op, op);
  chain = run.catch(() => {});
  return run;
};

const read = async () => {
  try {
    const raw = await AsyncStorage.getItem(GAME_EXERCISES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const save = async (list) => {
  try {
    await AsyncStorage.setItem(GAME_EXERCISES_KEY, JSON.stringify(list));
  } catch {}
  return list;
};

export const loadGameExercises = () => enqueue(read);

// Renvoient la liste à jour.
export const addGameExercise = (label) =>
  enqueue(async () => save(addToLibrary(await read(), label)));

export const removeGameExercise = (label) =>
  enqueue(async () => save(removeFromLibrary(await read(), label)));

// --- La bulle d'explication : quand la montrer (règle dans lib/gameTagTip.js) ---

const readTip = async () => {
  try {
    const raw = await AsyncStorage.getItem(GAME_TAG_TIP_KEY);
    return normalizeTipState(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...INITIAL_TIP_STATE };
  }
};

const writeTip = async (state) => {
  try {
    await AsyncStorage.setItem(GAME_TAG_TIP_KEY, JSON.stringify(state));
  } catch {}
};

let tipChain = Promise.resolve();
const enqueueTip = (op) => {
  const run = tipChain.then(op, op);
  tipChain = run.catch(() => {});
  return run;
};

/**
 * Une partie vient de se finir : faut-il montrer la bulle ? Compte la partie. En mode test
 * (GAME_TAG_TIP_ALWAYS) : oui à chaque fois, sans rien enregistrer.
 */
export const decideGameTagTip = () =>
  enqueueTip(async () => {
    if (GAME_TAG_TIP_ALWAYS) return true;
    const { show, state } = onGameFinished(await readTip());
    await writeTip(state);
    return show;
  });

/** La bulle s'est affichée : 'done' (Compris) ou 'skip' (Passer / retour). */
export const recordGameTagTipOutcome = (outcome) =>
  enqueueTip(async () => {
    if (GAME_TAG_TIP_ALWAYS) return;
    await writeTip(onTipOutcome(await readTip(), outcome));
  });
