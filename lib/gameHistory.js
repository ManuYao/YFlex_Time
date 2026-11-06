// Écrit une partie de jeu dans l'Historique (voir lib/gameHistoryShape.js).
// Ne lève jamais : une écriture ratée ne doit pas gêner l'écran de résultat.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HISTORY_KEY, notifyHistoryChanged } from './history';
import { buildGameEntry } from './gameHistoryShape';
import { normalizeExercises } from './gameExercises';

// Note (ou retire) l'exercice d'une partie déjà dans l'Historique.
export const setGameSessionExercises = async (historyId, exercises) => {
  try {
    if (typeof historyId !== 'string') return false;
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.some((s) => s?.id === historyId)) return false;
    const clean = normalizeExercises(exercises);
    const next = list.map((s) => {
      if (s?.id !== historyId) return s;
      const { exercises: _old, ...rest } = s;
      return clean.length ? { ...rest, exercises: clean } : rest;
    });
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    notifyHistoryChanged();
    return true;
  } catch {
    return false;
  }
};

export const recordGameSession = async (input) => {
  try {
    const entry = buildGameEntry(input);
    if (!entry) return null;
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(entry);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    notifyHistoryChanged();
    return entry;
  } catch {
    return null;
  }
};
