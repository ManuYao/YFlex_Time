import AsyncStorage from '@react-native-async-storage/async-storage';

import { addWeight, removeWeight, sanitizeEntries } from './bodyWeightShape';

// Suivi du poids de corps (Profil › Poids). Données LOCALES uniquement : rien
// n'est envoyé nulle part, rien n'est lié au compte. Purgées par la
// réinitialisation complète (Paramètres).
export const BODY_WEIGHT_KEY = 'flexTimer_bodyWeight';

export const loadBodyWeights = async () => {
  try {
    const raw = await AsyncStorage.getItem(BODY_WEIGHT_KEY);
    return raw ? sanitizeEntries(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

const save = async (list) => {
  try {
    await AsyncStorage.setItem(BODY_WEIGHT_KEY, JSON.stringify(list));
  } catch {}
  return list;
};

// Chaque écriture relit la liste : deux appuis rapprochés ne s'écrasent pas.
export const addBodyWeight = async (kg, now = Date.now()) =>
  save(addWeight(await loadBodyWeights(), kg, now));

export const removeBodyWeight = async (id) => save(removeWeight(await loadBodyWeights(), id));
