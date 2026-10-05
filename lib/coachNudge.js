import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Popup de découverte : propose d'activer la voix du coach (settings.voiceCoach)
 * à un utilisateur qui ne l'a jamais activée, au démarrage de l'app. Même
 * famille que lib/progression.js — cooldown + dismiss permanent, testable en
 * Node (shouldShowCoachNudge est pure).
 */

export const COACH_NUDGE_KEY = 'flexTimer_coachNudge';

const DAY_MS = 86400000;
export const COACH_NUDGE_COOLDOWN_DAYS = 1;
// Pas avant d'avoir lancé au moins 3 séances (tous modes confondus) : au tout
// premier démarrage, l'écran d'accueil peut déjà montrer "Quoi de neuf", un
// trophée ou la surcharge progressive — une 4ᵉ popup de découverte le jour
// même serait trop. Demande explicite de l'utilisateur (28/09/2026).
export const COACH_NUDGE_MIN_RUNS = 1;

const emptyState = () => ({ at: null, dismissedForever: false });

export const loadCoachNudgeState = async () => {
  try {
    const raw = await AsyncStorage.getItem(COACH_NUDGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      at: typeof parsed?.at === 'number' ? parsed.at : null,
      dismissedForever: parsed?.dismissedForever === true,
    };
  } catch {
    return emptyState();
  }
};

const persist = async (state) => {
  try {
    await AsyncStorage.setItem(COACH_NUDGE_KEY, JSON.stringify(state));
  } catch {}
  return state;
};

// Chaque écriture relit l'état courant avant de fusionner : jamais de "state"
// passé en paramètre qui pourrait être périmé si deux écritures se suivent de
// près (ex. "Ne plus afficher" tapé juste avant que la fermeture de la
// feuille ne déclenche aussi la remise à zéro du délai de 7 jours).
export const markCoachNudgeShown = async () => {
  const current = await loadCoachNudgeState();
  return persist({ ...current, at: Date.now() });
};

export const dismissCoachNudgeForever = async () => {
  const current = await loadCoachNudgeState();
  return persist({ ...current, dismissedForever: true });
};

/**
 * Pure — true si la popup doit être proposée maintenant.
 * @param {{ seen: {at: number|null, dismissedForever: boolean}, voiceCoachEnabled: boolean, totalRuns?: number, now?: number }} args
 */
export const shouldShowCoachNudge = ({ seen, voiceCoachEnabled, totalRuns = 0, now = Date.now() }) => {
  if (voiceCoachEnabled) return false;
  if (seen?.dismissedForever) return false;
  if (totalRuns < COACH_NUDGE_MIN_RUNS) return false;
  if (!seen?.at) return true;
  return now - seen.at >= COACH_NUDGE_COOLDOWN_DAYS * DAY_MS;
};
