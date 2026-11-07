import AsyncStorage from '@react-native-async-storage/async-storage';

import { sanitizeGamesNudge } from './gamesNudgeShape';

/**
 * Proposition « Essaie les jeux » (règle dans lib/gamesNudgeShape.js). Même famille que
 * lib/seasonNudge.js : un état mémorisé, une feuille montrée une seule fois, purgé au reset.
 *
 * `launches` compte les OUVERTURES de l'app (une par démarrage à froid, pas par retour au premier
 * plan). Une personne passée par l'onboarding est « nouvelle » (`newUser`) ; sans trace, c'est un
 * testeur déjà installé : il attend la date du 15 novembre.
 */
export const GAMES_NUDGE_KEY = 'flexTimer_gamesNudge';

const read = async () => {
  try {
    const raw = await AsyncStorage.getItem(GAMES_NUDGE_KEY);
    return raw ? sanitizeGamesNudge(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const write = async (state) => {
  try {
    await AsyncStorage.setItem(GAMES_NUDGE_KEY, JSON.stringify(state));
  } catch {}
  return state;
};

// Une seule fois par démarrage de l'app, même si l'accueil est monté plusieurs fois.
let launchPromise = null;

/** Appelé à la fin de l'onboarding : cette personne est nouvelle, son compteur repart de zéro. */
export const markGamesNudgeNewUser = async () => {
  // Après un reset complet l'app ne redémarre pas : l'ouverture en cours doit compter.
  launchPromise = null;
  return write({ launches: 0, newUser: true, seen: false });
};

/** Compte l'ouverture en cours (une fois par démarrage) et renvoie l'état à jour. */
export const noteGamesNudgeLaunch = () => {
  if (!launchPromise) {
    launchPromise = (async () => {
      const current = await read();
      if (!current) return write({ launches: 1, newUser: false, seen: false });
      return write({ ...current, launches: current.launches + 1 });
    })();
  }
  return launchPromise;
};

/** La feuille a été montrée (quel que soit le bouton) : elle ne revient plus. */
export const markGamesNudgeSeen = async () => {
  const current = (await read()) || { launches: 0, newUser: false, seen: false };
  return write({ ...current, seen: true });
};
