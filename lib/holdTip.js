import AsyncStorage from '@react-native-async-storage/async-storage';

import { sanitizeHoldTip } from './holdTipShape';

/**
 * Astuce du maintien (règle dans lib/holdTipShape.js) : montrée une seule fois, puis plus jamais.
 * Même famille que lib/seasonNudge.js. Purgée par le reset complet des Paramètres.
 */
export const HOLD_TIP_KEY = 'flexTimer_holdTip';

export const loadHoldTip = async () => {
  try {
    const raw = await AsyncStorage.getItem(HOLD_TIP_KEY);
    return sanitizeHoldTip(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeHoldTip(null);
  }
};

/** Vue (ou déjà connue : la personne a ouvert elle-même la fiche d'un chrono) : ne revient plus. */
export const markHoldTipSeen = async () => {
  try {
    await AsyncStorage.setItem(HOLD_TIP_KEY, JSON.stringify({ seen: true, at: Date.now() }));
  } catch {}
};
