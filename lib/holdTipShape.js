// Astuce du maintien : la logique PURE (sans React Native), testable en Node. Le stockage est dans
// lib/holdTip.js.
//
// Sur l'accueil, maintenir le cercle du milieu d'un chrono (1,5 s) ouvre ses trophées et ses infos.
// Personne ne le devine : une petite visite en bulles le montre (mêmes bulles que le tutoriel de
// démarrage, components/screens/SpotlightTips.js).
//
// Règle voulue par l'utilisateur (07/11/2026) : une fois la personne arrivée à 3 séances terminées,
// à la première ouverture de l'app où la file de démarrage est libre (elle passe donc après les
// autres propositions, jeux compris). Les testeurs déjà installés l'ont à partir du 15 novembre.
import { GAMES_NUDGE_LEGACY_FROM } from './gamesNudgeShape';

export const HOLD_TIP_MIN_SESSIONS = 3;

// Deux bulles. `id` = la zone mesurée dans app/home.js ('ring' = le cercle de la carte active, avec
// les modes qui défilent pendant la bulle ; 'profile' = le bouton Profil).
export const HOLD_TOUR_STEPS = [
  {
    id: 'ring',
    icon: 'medal',
    title: 'Maintiens le cercle',
    text: 'Sur n’importe quel mode, maintiens le cercle du milieu pendant 1,5 seconde : tu vois tes trophées et des infos sur ce chrono.',
    radius: 'full',
  },
  {
    id: 'profile',
    icon: 'user',
    title: 'Tes trophées',
    text: 'Tu les retrouves tous dans ton Profil. Pour ceux d’un chrono précis, maintiens son cercle.',
    radius: 'full',
  },
];

/** État mémorisé : { seen }, toujours complet et sûr. */
export const sanitizeHoldTip = (raw) => ({ seen: raw?.seen === true });

/**
 * Vrai si l'astuce doit s'afficher maintenant (quand la file de démarrage est libre).
 * `sessions` = séances de chrono terminées (jeux exclus), `newUser` = passé par l'onboarding.
 */
export const shouldShowHoldTip = ({ state, sessions = 0, newUser = false, now = Date.now() }) => {
  if (sanitizeHoldTip(state).seen) return false;
  if (!(sessions >= HOLD_TIP_MIN_SESSIONS)) return false;
  if (!newUser && now < GAMES_NUDGE_LEGACY_FROM) return false;
  return true;
};
