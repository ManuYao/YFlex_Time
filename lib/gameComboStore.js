import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_SETUP,
  addComboScore,
  removeComboScore,
  sanitizeComboScores,
  sanitizeSetup,
} from './gameCombo';

// Jeu « Combo Bi-Exo » (Menu › Jeux). Données LOCALES uniquement : rien n'est
// envoyé, rien n'est lié au compte. Honor system : chacun peut supprimer un
// score. Les deux clés sont purgées par la réinitialisation complète (Paramètres).
export const COMBO_SCORES_KEY = 'flexTimer_gameComboScores';
export const COMBO_SETUP_KEY = 'flexTimer_gameComboSetup';

export const loadComboScores = async () => {
  try {
    const raw = await AsyncStorage.getItem(COMBO_SCORES_KEY);
    return raw ? sanitizeComboScores(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

const save = async (list) => {
  try {
    await AsyncStorage.setItem(COMBO_SCORES_KEY, JSON.stringify(list));
  } catch {}
  return list;
};

// Chaque écriture relit la liste : deux écritures rapprochées ne s'écrasent pas.
export const saveComboScore = async (entry) =>
  save(addComboScore(await loadComboScores(), entry));

export const deleteComboScore = async (id) =>
  save(removeComboScore(await loadComboScores(), id));

// Derniers mots et exercices choisis : on ne les retape pas à chaque partie.
export const loadComboSetup = async () => {
  try {
    const raw = await AsyncStorage.getItem(COMBO_SETUP_KEY);
    return raw ? sanitizeSetup(JSON.parse(raw)) : DEFAULT_SETUP;
  } catch {
    return DEFAULT_SETUP;
  }
};

export const saveComboSetup = async (setup) => {
  try {
    await AsyncStorage.setItem(COMBO_SETUP_KEY, JSON.stringify(sanitizeSetup(setup)));
  } catch {}
};
