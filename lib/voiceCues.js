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
// Repère "moitié / dix dernières secondes" DE LA PHASE en cours (pas de
// toute la séance) : sous ce seuil, le décompte-bips des 3 dernières
// secondes suffit déjà — ça évite l'effet "on est à la moitié" répété à
// chaque round d'un TABATA 20/10s. Retour utilisateur du 24/09/2026 : un
// BASIC en repos de 60-90s se retrouvait totalement silencieux entre le
// "Repos." de début de phase et le "Go !" du round suivant — BASIC n'a pas
// de progression de SÉANCE connue (le travail est libre), mais son repos,
// lui, a une durée fixe. D'où ces repères "à la phase", en complément des
// repères "à la séance" ci-dessus, pas à leur place.
const PHASE_CUE_MIN_TOTAL = 40;

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
//
// Trois familles de repères, pour que la personne SANS l'écran sache
// toujours de quoi on parle (retour utilisateur du 24/09/2026 : en repos,
// la voix disait encore « encore un effort », et en EMOM elle poussait à
// fond pile au moment où l'on attend la vague suivante) :
//  - repères de SÉANCE (« Moitié de la séance ! ») : la séance traverse
//    efforts ET repos, donc textes neutres qui disent « de la séance ».
//    Seule exception, AMRAP : sa séance est un seul effort continu, on y
//    garde les textes d'effort (« Dix secondes, tout donner ! ») ;
//  - repères de PHASE, selon ce que fait réellement la personne :
//      effort  → pousser (« Dix secondes, tout donner ! »)
//      repos   → récupérer puis se préparer (« Dix secondes, prépare-toi ! »)
//      EMOM    → l'effort est au DÉBUT de l'intervalle ; la fin, c'est
//                l'attente de la vague suivante (« prépare le prochain
//                tour »), jamais « accélère » ;
//  - annonces de CHANGEMENT de phase (Go / Repos / dernier tour / tours
//    restants), avec un ton de repos pour les tours restants annoncés
//    pendant le repos (« Il reste quatre tours. », pas « accroche-toi »).
export const decideCues = (prev, cur, { mode } = {}) => {
  if (!prev || !cur || cur.isComplete) return [];
  const isMix = mode === 'mix';
  // Une seule phase qui EST toute la séance : repères de séance = repères
  // d'effort, et pas de repère de phase en doublon.
  const isContinuous = mode === 'amrap';
  const isInterval = cur.phase === 'emom' || cur.subPhase === 'emom';
  // BASIC : travail libre, donc fin de séance inconnue.
  const progressKnown = mode !== 'basic' && cur.totalTarget >= PROGRESS_MIN_TOTAL;

  // 1. Changement de phase : on annonce la nouvelle.
  if (prev.phaseKey !== cur.phaseKey) {
    if (cur.isRest) {
      const cues = ['rest'];
      // Tours restants APRÈS ce repos, dit sur un ton de repos.
      const left = (cur.totalRounds || 0) - (cur.currentRound || 0);
      if (!isMix && left >= REMAINING_MIN && left <= REMAINING_MAX && cur.phaseLeft >= LONG_CUE_MIN_LEFT) {
        cues.push(`remaining_rest_${left}`);
      }
      return cues;
    }

    const rounds = cur.totalRounds || 0;
    if (!isMix && rounds > 1 && cur.currentRound === rounds) return ['last_round'];
    // EMOM : pas de repos déclaré, c'est au début de l'intervalle (le moment
    // de l'effort) qu'on dit combien il en reste.
    if (mode === 'emom') {
      const left = rounds - (cur.currentRound || 0) + 1;
      if (left >= REMAINING_MIN && left <= 5) return [`remaining_${left}`];
    }
    return ['work'];
  }

  const cues = [];
  const has = (part) => cues.some((c) => c.includes(part));

  // 2. Repères de toute la séance.
  if (progressKnown) {
    const [half, almost, last10] = isContinuous
      ? ['half', 'almost', 'last_10s']
      : ['session_half', 'session_almost', 'session_last_10s'];
    if (crossed(prev.progress, cur.progress, 0.5)) cues.push(half);
    else if (crossed(prev.progress, cur.progress, 0.9) && cur.totalLeft > 20) cues.push(almost);
    if (prev.totalLeft > 10 && cur.totalLeft <= 10 && cur.totalLeft > 3) cues.push(last10);
  }

  // 3. Repères de la phase en cours — comparaison sûre : le changement de
  // phase est traité et renvoyé plus haut, donc prev et cur portent sur la
  // MÊME phase (même phaseTotal). Si un repère de séance vient de partir
  // au même instant (dernière phase de la séance), il a la priorité : « dix
  // secondes, prépare le prochain tour » n'a pas de sens s'il n'y en a plus.
  if (!isContinuous && cur.phaseTotal >= PHASE_CUE_MIN_TOTAL) {
    const kind = isInterval ? 'emom' : cur.isRest ? 'rest' : 'work';
    const prevPhaseProgress = 1 - prev.phaseLeft / prev.phaseTotal;
    const curPhaseProgress = 1 - cur.phaseLeft / cur.phaseTotal;
    // EMOM : la moitié d'un tour d'une minute, répétée dix fois, devient du
    // bruit — seulement sur les intervalles longs. Le « dix secondes,
    // prépare le prochain tour », lui, sert à chaque tour.
    // Dernière phase de la séance : son temps EST celui de la séance, déjà
    // annoncé par les repères de séance (« Fin dans 38 secondes » puis
    // « Encore 30 secondes » huit secondes après faisait doublon).
    const isFinalPhase = progressKnown && Math.abs(cur.totalLeft - cur.phaseLeft) < 1;
    const halfUseful =
      !isFinalPhase && (kind !== 'emom' || cur.phaseTotal >= EMOM_HALF_MIN_TOTAL);
    if (halfUseful && crossed(prevPhaseProgress, curPhaseProgress, 0.5) && !has('half')) {
      cues.push(PHASE_HALF[kind]);
    }
    if (prev.phaseLeft > 10 && cur.phaseLeft <= 10 && cur.phaseLeft > 3 && !has('last_10s')) {
      cues.push(PHASE_LAST_10S[kind]);
    }
  }

  // 4. Encouragement sur un long effort continu (AMRAP, ou bloc AMRAP d'un MIX).
  const isAmrap = cur.phase === 'amrap' || cur.subPhase === 'amrap';
  if (isAmrap && cur.phaseLeft > BOOST_QUIET_END) {
    const before = Math.floor((prev.phaseTotal - prev.phaseLeft) / BOOST_EVERY);
    const now = Math.floor((cur.phaseTotal - cur.phaseLeft) / BOOST_EVERY);
    if (now > before && now > 0 && !has('half')) cues.push('boost');
  }

  return cues;
};

// « La moitié » seule est ambiguë pendant un effort qui n'est pas toute la
// séance (moitié de quoi ?) : « work_half » dit « moitié de l'effort ».
const PHASE_HALF = { work: 'work_half', rest: 'rest_half', emom: 'emom_half' };
const EMOM_HALF_MIN_TOTAL = 90;
const PHASE_LAST_10S = { work: 'last_10s', rest: 'rest_last_10s', emom: 'emom_last_10s' };
