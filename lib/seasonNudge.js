import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Alerte de lancement « ambiance de saison » : UNE seule fois, elle prévient que
 * les décors animés demandent un peu de puissance et propose de les désactiver
 * si le téléphone est ancien et l'app moins fluide. Même famille que
 * lib/coachNudge.js (état « déjà montrée » mémorisé, fonction de décision pure).
 * Rien n'est montré si l'ambiance est déjà sur « Aucune ».
 */
export const SEASON_NUDGE_KEY = 'flexTimer_seasonNudge';

export const loadSeasonNudgeSeen = async () => {
  try {
    const raw = await AsyncStorage.getItem(SEASON_NUDGE_KEY);
    return raw ? JSON.parse(raw)?.seen === true : false;
  } catch {
    return false;
  }
};

export const markSeasonNudgeSeen = async () => {
  try {
    await AsyncStorage.setItem(SEASON_NUDGE_KEY, JSON.stringify({ seen: true, at: Date.now() }));
  } catch {}
};

/** Pure — true si l'alerte doit être montrée maintenant. */
export const shouldShowSeasonNudge = ({ seen, ambianceMode }) => {
  if (seen) return false;
  return ambianceMode !== 'none';
};
