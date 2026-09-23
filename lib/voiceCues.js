// Logique pure du coach vocal : QUOI dire et QUAND, à partir de deux photos
// successives de l'état du moteur (lib/timer-engine.js). Aucune dépendance
// React Native ici (testable en Node) — la synthèse vocale vit dans
// lib/voiceCoach.js, les textes dans lib/voiceTexts.js.
//
// Le décompte de lancement (3-2-1-Go) et le décompte des 3 dernières
// secondes d'une phase restent des BIPS (app/countdown.js, app/running.js) :
// décision utilisateur, un compte à rebours numérique reste un signal, pas
// une phrase. Le coach ne parle qu'en phrases : changement de phase,
// progression, encouragement.
//
// MIX ne reçoit aucune annonce de rôle de bloc : les exercices y sont trop
// spécifiques pour qu'un mot générique ("Bloc force !") ait du sens. Un bloc
// MIX ne dit donc que "Go"/"Repos" comme les autres modes, selon sa
// sous-phase (state.isRest, déjà calculé par computeState pour un MIX).

const REMAINING_MIN = 2;
const REMAINING_MAX = 10;
// En dessous, une séance est trop courte pour « à la moitié » & co.
const PROGRESS_MIN_TOTAL = 120;
// Encouragement pendant un long effort continu (AMRAP) : toutes les 3 min,
// jamais dans les 30 dernières secondes de la phase.
const BOOST_EVERY = 180;
const BOOST_QUIET_END = 30;
// Une phrase sur les tours restants ne part pas si le repos n'a plus le
// temps de la dire.
const LONG_CUE_MIN_LEFT = 6;

// Photo de l'état du moteur utile au coach.
export const voiceSnapshot = (state, elapsed) => ({
  phaseKey: `${state.currentRound}:${state.phaseLabel}`,
  isRest: !!state.isRest,
  isComplete: !!state.isComplete,
  phase: state.phase,
  subPhase: state.subPhase || '',
  currentRound: state.currentRound,
  totalRounds: state.totalRounds,
  countUp: state.countDirection === 'up',
  phaseLeft: state.phaseSecondsLeft ?? 0,
  phaseTotal: state.phaseSecondsTotal ?? 0,
  totalTarget: state.totalSecondsTarget ?? 0,
  totalLeft: Math.max(0, (state.totalSecondsTarget ?? 0) - elapsed),
  progress: state.totalProgress ?? 0,
});

const crossed = (prev, cur, threshold) => prev < threshold && cur >= threshold;

// Situations à dire entre deux photos, dans l'ordre (jointes en une seule
// phrase par l'appelant). `mode` = id du timer (amrap/basic/emom/tabata/mix).
export const decideCues = (prev, cur, { mode } = {}) => {
  if (!prev || !cur || cur.isComplete) return [];
  const isMix = mode === 'mix';
  // BASIC en travail libre : pas de fin connue, donc ni moitié ni fin proche.
  const progressKnown = mode !== 'basic' && cur.totalTarget >= PROGRESS_MIN_TOTAL;

  // 1. Changement de phase : on annonce la nouvelle.
  if (prev.phaseKey !== cur.phaseKey) {
    if (cur.isRest) {
      const cues = ['rest'];
      // Tours restants APRÈS ce repos : « Repos… encore trois tours ».
      const left = (cur.totalRounds || 0) - (cur.currentRound || 0);
      if (!isMix && left >= REMAINING_MIN && left <= REMAINING_MAX && cur.phaseLeft >= LONG_CUE_MIN_LEFT) {
        cues.push(`remaining_${left}`);
      }
      return cues;
    }

    const rounds = cur.totalRounds || 0;
    if (!isMix && rounds > 1 && cur.currentRound === rounds) return ['last_round'];
    // EMOM enchaîne les minutes sans repos : c'est au début de la minute
    // qu'on dit combien il en reste.
    if (mode === 'emom') {
      const left = rounds - (cur.currentRound || 0) + 1;
      if (left >= REMAINING_MIN && left <= 5) return [`remaining_${left}`];
    }
    return ['work'];
  }

  const cues = [];

  // 2. Repères de progression sur toute la séance.
  if (progressKnown) {
    if (crossed(prev.progress, cur.progress, 0.5)) cues.push('half');
    else if (crossed(prev.progress, cur.progress, 0.9) && cur.totalLeft > 20) cues.push('almost');
    if (prev.totalLeft > 10 && cur.totalLeft <= 10 && cur.totalLeft > 3) cues.push('last_10s');
  }

  // 3. Encouragement sur un long effort continu (AMRAP, ou bloc AMRAP d'un MIX).
  const isAmrap = cur.phase === 'amrap' || cur.subPhase === 'amrap';
  if (isAmrap && cur.phaseLeft > BOOST_QUIET_END) {
    const before = Math.floor((prev.phaseTotal - prev.phaseLeft) / BOOST_EVERY);
    const now = Math.floor((cur.phaseTotal - cur.phaseLeft) / BOOST_EVERY);
    if (now > before && now > 0 && !cues.includes('half')) cues.push('boost');
  }

  return cues;
};
