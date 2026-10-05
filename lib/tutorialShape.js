// Logique PURE du tutoriel de démarrage (aucun import React Native / stockage :
// testable au `node`, même convention que lib/publicMixShape.js).
//
// Deux niveaux :
//   - niveau 1 : le menu, puis un BASIC de test (2 tours, 5 s de repos) lancé
//     dans le VRAI décompte et le VRAI chrono ;
//   - niveau 2 (facultatif, proposé à la fin du 1) : Historique, Planning, Profil.
//
// Règle d'or : le tutoriel n'est JAMAIS imposé. On le PROPOSE (pop-up avec
// vibration et son), on peut le refuser, le quitter à tout moment, et le
// rouvrir plus tard depuis les Paramètres.

// Réglages du BASIC de test : assez court pour tenir dans les 2 minutes, assez
// long pour voir un repos entier (les 3 bips des dernières secondes inclus).
export const TUTORIAL_TIMER_ID = 'basic';
export const TUTORIAL_REST = 10;
export const TUTORIAL_ROUNDS = 2;

// Le pop-up d'invitation est proposé au plus 2 fois : à l'arrivée sur l'accueil,
// puis une seule relance si la personne a répondu « Plus tard ». Au-delà, on
// arrête (le tutoriel reste dans les Paramètres).
export const INVITE_MAX = 2;
export const INVITE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Étapes de l'écran /tutorial.
export const STEPS = {
  menu: 'menu', // niveau 1 : « voici ton menu » + lancer le test
  bilan: 'bilan', // retour du chrono de test : continuer ou terminer
  tour: 'tour', // niveau 2 : Historique, Planning, Profil
};

export const emptyTutorialState = () => ({
  invites: 0, // nombre de fois que le pop-up a été montré
  invitedAt: null, // dernière fois (ms)
  // 'pending'  : jamais terminé ni refusé, le pop-up peut encore venir
  // 'declined' : refusé pour de bon (« Ne plus me le proposer » ou tuto quitté)
  // 'done1'    : niveau 1 terminé
  // 'done'     : niveau 2 terminé aussi
  status: 'pending',
});

export const sanitizeTutorialState = (raw) => {
  const base = emptyTutorialState();
  if (!raw || typeof raw !== 'object') return base;
  const status = ['pending', 'declined', 'done1', 'done'].includes(raw.status)
    ? raw.status
    : base.status;
  const invites = Number.isFinite(raw.invites) && raw.invites > 0 ? Math.floor(raw.invites) : 0;
  const invitedAt = Number.isFinite(raw.invitedAt) ? raw.invitedAt : null;
  return { invites, invitedAt, status };
};

/**
 * Le pop-up d'invitation doit-il apparaître maintenant ?
 *
 * Il ne concerne que les NOUVEAUX utilisateurs : quelqu'un qui a déjà lancé au
 * moins une séance sait se servir de l'app (les bêta-testeurs d'avant le
 * tutoriel n'ont pas à le recevoir — ils le retrouvent dans les Paramètres).
 */
export const shouldInviteTutorial = ({ state, totalRuns = 0, now = Date.now() }) => {
  const s = sanitizeTutorialState(state);
  if (s.status !== 'pending') return false;
  if (totalRuns > 0) return false;
  if (s.invites >= INVITE_MAX) return false;
  if (s.invites === 0 || s.invitedAt == null) return true;
  return now - s.invitedAt >= INVITE_COOLDOWN_MS;
};

/** Le pop-up vient d'être montré. */
export const withInviteShown = (state, now = Date.now()) => {
  const s = sanitizeTutorialState(state);
  return { ...s, invites: s.invites + 1, invitedAt: now };
};

/** Statut après une issue : 'declined' | 'done1' | 'done'. Ne régresse jamais. */
const RANK = { pending: 0, declined: 1, done1: 2, done: 3 };
export const withOutcome = (state, outcome) => {
  const s = sanitizeTutorialState(state);
  if (!(outcome in RANK)) return s;
  // Un tuto terminé ne redevient pas « refusé » parce qu'on l'a quitté en route
  // lors d'un second passage depuis les Paramètres.
  if (RANK[outcome] <= RANK[s.status]) return s;
  return { ...s, status: outcome };
};

/**
 * Le BASIC de test : le BASIC réel de l'utilisateur (couleurs, nom, tout le
 * reste), avec seulement ses deux réglages remplacés. On ne touche jamais aux
 * réglages enregistrés de la personne : l'objet est reconstruit à la volée.
 */
export const buildTutorialTimer = (timer) => {
  if (!timer || !Array.isArray(timer.stats)) return timer;
  return {
    ...timer,
    stats: timer.stats.map((s) => {
      if (s.key === 'rest') return { ...s, value: TUTORIAL_REST };
      if (s.key === 'rounds') return { ...s, value: TUTORIAL_ROUNDS };
      return s;
    }),
  };
};

/**
 * Ce que le coach du chrono de test doit dire, d'après l'état du moteur.
 * Renvoie un identifiant d'étape ('work' | 'rest' | 'last') ou null.
 *  - work : premier tour de travail, on attend l'appui sur REPOS ;
 *  - rest : repos en cours ;
 *  - last : dernier tour de travail, on attend l'appui sur FINI.
 */
export const coachStepFor = (state) => {
  if (!state || state.isComplete) return null;
  if (state.isRest) return 'rest';
  if (state.countDirection === 'up') {
    return state.currentRound === state.totalRounds ? 'last' : 'work';
  }
  return null;
};
