import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Proposition « les fêtes, chacun à sa façon » : stockage. La règle (une fois par an, pendant
 * Halloween, Noël ou la Saint-Valentin, réglage « Auto » seulement) est dans
 * lib/feastNudgeShape.js. Même famille que lib/seasonNudge.js. Purgée par le reset complet.
 */
export const FEAST_NUDGE_KEY = 'flexTimer_feastNudge';

export { shouldShowFeastNudge, feastPhrase, FEAST_NUDGE_GAP_DAYS } from './feastNudgeShape';

export const loadFeastNudgeState = async () => {
  try {
    const raw = await AsyncStorage.getItem(FEAST_NUDGE_KEY);
    const at = raw ? JSON.parse(raw)?.at : null;
    return { lastAt: typeof at === 'number' && Number.isFinite(at) ? at : null };
  } catch {
    return { lastAt: null };
  }
};

export const markFeastNudgeShown = async (feastId) => {
  try {
    await AsyncStorage.setItem(FEAST_NUDGE_KEY, JSON.stringify({ at: Date.now(), feast: feastId || null }));
  } catch {}
};
