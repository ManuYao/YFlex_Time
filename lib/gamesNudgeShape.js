// Proposition « Essaie les jeux » : la logique PURE (sans React Native), testable en Node.
// Le stockage est dans lib/gamesNudge.js.
//
// Règle voulue par l'utilisateur (07/11/2026) :
//  - une NOUVELLE personne (passée par l'onboarding) reçoit la proposition à sa 5ᵉ ouverture
//    de l'app ;
//  - les bêta-testeurs déjà installés (aucune trace d'onboarding avec ce code) la reçoivent
//    à partir du 15 novembre 2026, car l'APK qui l'embarque sort les 13-14 novembre.
// Elle n'est montrée qu'une seule fois, et jamais à quelqu'un qui a déjà joué à un jeu.

export const GAMES_NUDGE_LAUNCHES = 5;

// 15 novembre 2026, minuit, heure du téléphone (mois 10 = novembre).
export const GAMES_NUDGE_LEGACY_FROM = new Date(2026, 10, 15, 0, 0, 0).getTime();

/** État mémorisé : { launches, newUser, seen }, toujours complet et sûr. */
export const sanitizeGamesNudge = (raw) => ({
  launches: Number.isFinite(raw?.launches) && raw.launches > 0 ? Math.floor(raw.launches) : 0,
  newUser: raw?.newUser === true,
  seen: raw?.seen === true,
});

/** Vrai si la proposition doit s'afficher maintenant (quand la file de démarrage est libre). */
export const shouldShowGamesNudge = ({ state, now = Date.now(), gamesPlayed = false }) => {
  const s = sanitizeGamesNudge(state);
  if (s.seen || gamesPlayed) return false;
  if (s.newUser) return s.launches >= GAMES_NUDGE_LAUNCHES;
  return now >= GAMES_NUDGE_LEGACY_FROM;
};
