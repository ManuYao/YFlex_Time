// Les jeux dans l'Historique (demande de l'utilisateur, 06/11/2026) : un jeu reste
// un exercice sportif, son temps doit compter comme celui d'un chrono. Chaque
// partie qui va au moins un peu loin ajoute UNE séance « JEU » à l'historique
// (même liste, même synchronisation que les chronos).
//
// Module PUR (aucun import React Native) : testable en Node, comme lib/mixMeta.js.
// L'écriture dans le stockage est dans lib/gameHistory.js.

export const GAME_TIMER_ID = 'game';
export const GAME_HISTORY_NAME = 'JEU';
// Une seule couleur pour la catégorie (puce de filtre, barre de répartition, ligne) :
// le bleu-vert du menu Jeux. Le nom du jeu est porté par `intensity`.
export const GAME_HISTORY_COLOR = '#4DD8E8';

export const GAME_HISTORY_LABELS = {
  count: 'Chef d’orchestre',
  pyramid: 'Pyramide',
  combo: 'Combo Bi-Exo',
};

// Où rouvrir chaque jeu (bouton « Rejouer » du détail d'une séance).
export const GAME_ROUTES = {
  count: '/game-count',
  pyramid: '/game-pyramid',
  combo: '/game-combo',
};

// En dessous, ce n'est pas une partie (lancée puis quittée dans la foulée) :
// même seuil que la récupération d'une séance (MIN_RECOVER_SECONDS).
export const MIN_GAME_SECONDS = 6;

export const isGameSession = (s) => s?.timerId === GAME_TIMER_ID;

/**
 * L'entrée d'historique d'une partie, ou null si elle ne compte pas.
 * @param {object} p
 * @param {'count'|'pyramid'|'combo'} p.game
 * @param {number} p.startedAt  ms, début réel du jeu (après le décompte)
 * @param {number} p.endedAt    ms, fin du jeu (avant la roue de confirmation)
 * @param {number} p.reps       répétitions comptées (score de la partie)
 * @param {number} [p.restMs]   part de repos de la partie (pyramide), en ms
 */
export const buildGameEntry = ({ game, startedAt, endedAt, reps, restMs = 0 }) => {
  if (!GAME_HISTORY_LABELS[game]) return null;
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || !Number.isFinite(reps)) return null;
  const durationSeconds = Math.round((endedAt - startedAt) / 1000);
  if (durationSeconds < MIN_GAME_SECONDS || !(reps > 0)) return null;
  const rest = Math.min(durationSeconds, Math.max(0, Math.round((Number(restMs) || 0) / 1000)));
  return {
    id: String(endedAt),
    timerId: GAME_TIMER_ID,
    name: GAME_HISTORY_NAME,
    color: GAME_HISTORY_COLOR,
    intensity: GAME_HISTORY_LABELS[game],
    durationSeconds,
    completedRounds: 0,
    totalRounds: 0,
    workTotal: durationSeconds - rest,
    restTotal: rest,
    game,
    reps: Math.round(reps),
    date: new Date(endedAt).toISOString(),
  };
};
