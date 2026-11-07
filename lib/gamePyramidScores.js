import AsyncStorage from '@react-native-async-storage/async-storage';

import { addPyramidScore, removePyramidScore, sanitizePyramidScores } from './gamePyramid';

// Scores du jeu « La pyramide » (Menu › Jeux). Données LOCALES uniquement :
// rien n'est envoyé, rien n'est lié au compte. Honor system : chacun peut
// supprimer un score. Purgées par la réinitialisation complète (Paramètres).
export const PYRAMID_SCORES_KEY = 'flexTimer_gamePyramidScores';

export const loadPyramidScores = async () => {
  try {
    const raw = await AsyncStorage.getItem(PYRAMID_SCORES_KEY);
    return raw ? sanitizePyramidScores(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

const save = async (list) => {
  try {
    await AsyncStorage.setItem(PYRAMID_SCORES_KEY, JSON.stringify(list));
  } catch {}
  return list;
};

// Chaque écriture relit la liste : deux écritures rapprochées ne s'écrasent pas.
export const savePyramidScore = async (entry) =>
  save(addPyramidScore(await loadPyramidScores(), entry));

export const deletePyramidScore = async (id) =>
  save(removePyramidScore(await loadPyramidScores(), id));
