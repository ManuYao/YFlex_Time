// Stockage local du « noter mon exercice » des jeux (voir lib/gameExercises.js).
// Données LOCALES, purgées par la réinitialisation complète (Paramètres).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { addToLibrary, removeFromLibrary } from './gameExercises';

// La liste des exercices que la personne a ajoutés elle-même (le plus récent en
// premier) : commune à TOUS les jeux, elle ne se retape jamais. Supprimer un exercice ici
// le retire de la liste pour de bon (les parties déjà notées gardent leur texte).
export const GAME_EXERCISES_KEY = 'flexTimer_gameExercises';
// Bulle d'explication montrée UNE fois, à la première partie finie.
export const GAME_TAG_TIP_KEY = 'flexTimer_gameTagTip';

export const loadGameExercises = async () => {
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

// Chaque écriture relit la liste : deux écritures rapprochées ne s'écrasent pas.
// Renvoient la liste à jour.
export const addGameExercise = async (label) => save(addToLibrary(await loadGameExercises(), label));

export const removeGameExercise = async (label) =>
  save(removeFromLibrary(await loadGameExercises(), label));

export const hasSeenGameTagTip = async () => {
  try {
    return (await AsyncStorage.getItem(GAME_TAG_TIP_KEY)) === '1';
  } catch {
    // En cas de doute on ne montre rien : jamais de bulle en boucle.
    return true;
  }
};

export const markGameTagTipSeen = async () => {
  try {
    await AsyncStorage.setItem(GAME_TAG_TIP_KEY, '1');
  } catch {}
};
