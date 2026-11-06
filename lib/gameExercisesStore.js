// Stockage local du « noter mon exercice » des jeux (voir lib/gameExercises.js).
// Données LOCALES, purgées par la réinitialisation complète (Paramètres).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GAME_EXERCISE_SUGGESTIONS, cleanExerciseLabel, normalizeExercises } from './gameExercises';

// Les exercices que la personne a ajoutés elle-même (le plus récent en premier).
export const GAME_EXERCISES_KEY = 'flexTimer_gameExercises';
// Bulle d'explication montrée UNE fois, à la première partie finie.
export const GAME_TAG_TIP_KEY = 'flexTimer_gameTagTip';

const MAX_CUSTOM = 30;

export const loadGameExercises = async () => {
  try {
    const raw = await AsyncStorage.getItem(GAME_EXERCISES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

// Mémorise les exercices écrits à la main (pas ceux déjà proposés d'office).
export const rememberGameExercises = async (labels) => {
  try {
    const known = new Set(GAME_EXERCISE_SUGGESTIONS.map((x) => x.toLowerCase()));
    const fresh = normalizeExercises(labels).filter((x) => !known.has(x.toLowerCase()));
    if (!fresh.length) return;
    const list = await loadGameExercises();
    const next = [
      ...fresh,
      ...list.filter((x) => !fresh.some((f) => f.toLowerCase() === cleanExerciseLabel(x).toLowerCase())),
    ].slice(0, MAX_CUSTOM);
    await AsyncStorage.setItem(GAME_EXERCISES_KEY, JSON.stringify(next));
  } catch {}
};

export const hasSeenGameTagTip = async () => {
  try {
    return (await AsyncStorage.getItem(GAME_TAG_TIP_KEY)) === '1';
  } catch {
    // En cas de doute on ne montre rien : une bulle de trop vaut mieux qu'aucune, mais
    // jamais en boucle.
    return true;
  }
};

export const markGameTagTipSeen = async () => {
  try {
    await AsyncStorage.setItem(GAME_TAG_TIP_KEY, '1');
  } catch {}
};
