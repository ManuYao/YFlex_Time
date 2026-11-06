// Écrit une partie de jeu dans l'Historique (voir lib/gameHistoryShape.js).
// Ne lève jamais : une écriture ratée ne doit pas gêner l'écran de résultat.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HISTORY_KEY, notifyHistoryChanged } from './history';
import { buildGameEntry } from './gameHistoryShape';

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
