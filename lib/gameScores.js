import AsyncStorage from '@react-native-async-storage/async-storage';

import { addScore, removeScore, sanitizeScores } from './gameCount';

// Scores des jeux (Menu › Jeux). Données LOCALES uniquement : rien n'est envoyé,
// rien n'est lié au compte. Honor system : chacun peut supprimer un score.
// Purgées par la réinitialisation complète (Paramètres).
export const GAME_SCORES_KEY = 'flexTimer_gameScores';

export const loadScores = async () => {
  try {
    const raw = await AsyncStorage.getItem(GAME_SCORES_KEY);
    return raw ? sanitizeScores(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

const save = async (list) => {
  try {
    await AsyncStorage.setItem(GAME_SCORES_KEY, JSON.stringify(list));
  } catch {}
  return list;
};

// Chaque écriture relit la liste : deux écritures rapprochées ne s'écrasent pas.
export const saveScore = async (entry) => save(addScore(await loadScores(), entry));

export const deleteScore = async (id) => save(removeScore(await loadScores(), id));
