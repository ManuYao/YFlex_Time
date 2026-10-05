import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  emptyTutorialState,
  sanitizeTutorialState,
  withInviteShown,
  withOutcome,
} from './tutorialShape';

export {
  TUTORIAL_TIMER_ID,
  TUTORIAL_REST,
  TUTORIAL_ROUNDS,
  STEPS,
  buildTutorialTimer,
  coachStepFor,
  shouldInviteTutorial,
} from './tutorialShape';

// Clé purgée par le reset complet des Paramètres (la personne repart de zéro :
// le tutoriel redevient proposable).
export const TUTORIAL_KEY = 'flexTimer_tutorial';

export const loadTutorialState = async () => {
  try {
    const raw = await AsyncStorage.getItem(TUTORIAL_KEY);
    return raw ? sanitizeTutorialState(JSON.parse(raw)) : emptyTutorialState();
  } catch {
    return emptyTutorialState();
  }
};

const persist = async (state) => {
  try {
    await AsyncStorage.setItem(TUTORIAL_KEY, JSON.stringify(state));
  } catch {}
  return state;
};

// Chaque écriture relit l'état courant avant de fusionner (même règle que
// lib/coachNudge.js) : deux écritures rapprochées ne s'écrasent pas.
export const markTutorialInviteShown = async () =>
  persist(withInviteShown(await loadTutorialState()));

// 'declined' | 'done1' | 'done'
export const markTutorialOutcome = async (outcome) =>
  persist(withOutcome(await loadTutorialState(), outcome));
