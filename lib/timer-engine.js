import { resolveBlockRole } from './blockRoles';
import { getBlockType } from './mix-blocks';

// Nom affiché d'un bloc de MIX : son nom, sinon le nom FRANÇAIS de son type
// (« REPOS », pas l'id interne « rest » qui s'affichait « REST »).
const blockName = (b) => b.label || getBlockType(b.type)?.name || b.type;

const getStat = (timer, key) => {
  const stat = timer.stats.find((s) => s.key === key);
  return stat ? stat.value : null;
};

const blockToTimer = (block) => {
  const id = block.type;
  if (id === 'amrap') {
    return {
      id,
      stats: [
        { key: 'duration', value: Math.max(1, Math.round(block.duration / 60)) },
      ],
      _exactTotal: block.duration,
    };
  }
  if (id === 'tabata') {
    return {
      id,
      stats: [
        { key: 'work', value: block.duration },
        { key: 'rest', value: block.rest || 0 },
        { key: 'rounds', value: Math.max(1, block.rounds || 1) },
      ],
    };
  }
  if (id === 'basic') {
    return {
      id,
      stats: [
        { key: 'rest', value: block.duration },
        { key: 'rounds', value: Math.max(1, block.rounds || 1) },
      ],
    };
  }
  if (id === 'emom') {
    return {
      id,
      stats: [
        { key: 'interval', value: block.duration },
        { key: 'rounds', value: Math.max(1, block.rounds || 1) },
      ],
    };
  }
  return null;
};

const blockDuration = (block) => {
  const rounds = Math.max(1, block.rounds || 1);
  if (block.type === 'tabata') return (block.duration + (block.rest || 0)) * rounds;
  return block.duration * rounds;
};

// Découpes de la barre de progression globale (TopBar de app/running.js) :
// une marque par frontière de phase, exprimée en fraction de l'objectif
// total. 0 et 1 sont exclus — ce sont les bords de la barre, pas des
// découpes. Au-delà de MAX_MARKERS la barre deviendrait un damier illisible
// (EMOM 60 tours), on n'en garde qu'une sur n.
const MAX_MARKERS = 40;

const markers = (list) => {
  const clean = list.filter((v) => v > 0.002 && v < 0.998);
  if (clean.length <= MAX_MARKERS) return clean;
  const step = Math.ceil(clean.length / MAX_MARKERS);
  return clean.filter((_, i) => i % step === step - 1);
};

// Frontières régulières : rounds - 1 découpes réparties à intervalles égaux.
const roundMarkers = (rounds) => {
  const out = [];
  for (let r = 1; r < rounds; r++) out.push(r / rounds);
  return markers(out);
};

const amrap = (timer, elapsed) => {
  const totalSec = getStat(timer, 'duration') * 60;
  const left = Math.max(0, totalSec - elapsed);
  const isComplete = left <= 0;
  return {
    phase: 'amrap',
    phaseLabel: 'AMRAP',
    phaseSecondsTotal: totalSec,
    phaseSecondsLeft: left,
    currentRound: null,
    totalRounds: null,
    roundLabel: '∞',
    totalSecondsTarget: totalSec,
    totalProgress: Math.min(1, elapsed / totalSec),
    ringProgress: 1 - left / totalSec,
    isComplete,
    // Une seule phase : rien à découper.
    phaseMarkers: [],
    phasesList: [
      { label: 'AMRAP', status: isComplete ? 'done' : 'current' },
    ],
  };
};

const basicLegacy = (timer, elapsed) => {
  // Auto-cycled BASIC kept ONLY for legacy MIX blocks (type:'basic' inside a saved mix).
  // Standalone BASIC timer uses basicManual() below.
  const rest = getStat(timer, 'rest');
  const rounds = getStat(timer, 'rounds') ?? 1;
  const totalSec = rest * rounds;
  const isComplete = elapsed >= totalSec;

  const currentRound = Math.min(rounds, Math.floor(elapsed / rest) + 1);
  const intoPhase = elapsed - (currentRound - 1) * rest;
  const phaseLeft = isComplete ? 0 : Math.max(0, rest - intoPhase);

  const phasesList = [];
  for (let r = 1; r <= rounds; r++) {
    let status = 'todo';
    if (isComplete || r < currentRound) status = 'done';
    else if (r === currentRound) status = 'current';
    phasesList.push({ label: 'REPOS', status, type: 'rest' });
  }

  return {
    phase: 'repos',
    phaseLabel: isComplete ? 'TERMINÉ' : `REPOS ${currentRound}`,
    phaseSecondsTotal: rest,
    phaseSecondsLeft: phaseLeft,
    currentRound: isComplete ? rounds : currentRound,
    totalRounds: rounds,
    roundLabel: `${isComplete ? rounds : currentRound}/${rounds}`,
    totalSecondsTarget: totalSec,
    totalProgress: Math.min(1, elapsed / totalSec),
    ringProgress: isComplete ? 1 : 1 - phaseLeft / rest,
    isComplete,
    phaseMarkers: roundMarkers(rounds),
    phasesList,
  };
};

// New manual BASIC: infinite WORK chrono, user taps "Fin du travail" to start REST,
// REST auto-returns to WORK, session ends only via long-press Retour.
// ctx = { restTriggers: number[] }  // elapsed seconds at each "Fin du travail" tap
const basic = (timer, elapsed, ctx) => {
  const rest = getStat(timer, 'rest');
  const rounds = Math.max(1, getStat(timer, 'rounds') ?? 1);
  const triggers = ((ctx && ctx.restTriggers) || [])
    .slice()
    .sort((a, b) => a - b);

  // Le trigger du DERNIER tour termine directement la séance, sans repos :
  // il n'y a plus rien à récupérer avant une fois le tour final tapé (même
  // logique que tabata() plus bas pour la même raison).
  if (triggers.length >= rounds) {
    return {
      phase: 'fini',
      phaseLabel: 'TERMINÉ',
      phaseSecondsTotal: 0,
      phaseSecondsLeft: 0,
      currentRound: rounds,
      totalRounds: rounds,
      roundLabel: `${rounds}/${rounds}`,
      totalSecondsTarget: elapsed,
      totalProgress: 1,
      ringProgress: 1,
      isComplete: true,
      countDirection: 'down',
      phaseMarkers: roundMarkers(rounds),
      phasesList: [
        { label: 'TRAVAIL', status: 'done', type: 'work' },
        { label: 'REPOS', status: 'done', type: 'rest' },
      ],
    };
  }

  let serieIndex = 0;
  let workStart = 0;
  let inRest = false;
  let restTriggerTime = null;

  for (let i = 0; i < triggers.length; i++) {
    const t = triggers[i];
    const restEnd = t + rest;
    if (elapsed < t) {
      break;
    }
    if (elapsed < restEnd) {
      inRest = true;
      restTriggerTime = t;
      serieIndex = i;
      break;
    }
    workStart = restEnd;
    serieIndex = i + 1;
  }

  if (inRest) {
    const phaseLeft = Math.max(0, restTriggerTime + rest - elapsed);
    const currentRound = serieIndex + 1;
    return {
      phase: 'repos',
      phaseLabel: `REPOS ${currentRound}`,
      phaseSecondsTotal: rest,
      phaseSecondsLeft: phaseLeft,
      currentRound,
      totalRounds: rounds,
      roundLabel: `${currentRound}/${rounds}`,
      totalSecondsTarget: 0,
      totalProgress: (serieIndex + (1 - phaseLeft / rest)) / rounds,
      ringProgress: 1 - phaseLeft / rest,
      isComplete: false,
      countDirection: 'down',
      // BASIC n'a pas de durée cible : la barre globale avance par tour, donc
      // ses découpes sont les tours, pas les phases travail/repos.
      phaseMarkers: roundMarkers(rounds),
      phasesList: [
        { label: 'TRAVAIL', status: 'done', type: 'work' },
        { label: 'REPOS', status: 'current', type: 'rest' },
      ],
    };
  }

  const workElapsed = Math.max(0, elapsed - workStart);
  const currentRound = serieIndex + 1;
  return {
    phase: 'travail',
    phaseLabel: `TRAVAIL ${currentRound}`,
    phaseSecondsTotal: 60,
    phaseSecondsLeft: workElapsed, // hijacked: count-up display value
    currentRound,
    totalRounds: rounds,
    roundLabel: `${currentRound}/${rounds}`,
    totalSecondsTarget: 0,
    totalProgress: serieIndex / rounds,
    ringProgress: (workElapsed % 60) / 60,
    isComplete: false,
    countDirection: 'up',
    phaseMarkers: roundMarkers(rounds),
    phasesList: [
      { label: 'TRAVAIL', status: 'current', type: 'work' },
      { label: 'REPOS', status: 'todo', type: 'rest' },
    ],
  };
};

const emom = (timer, elapsed) => {
  const interval = getStat(timer, 'interval');
  const rounds = getStat(timer, 'rounds');
  const totalSec = interval * rounds;
  const isComplete = elapsed >= totalSec;

  const currentRound = Math.min(rounds, Math.floor(elapsed / interval) + 1);
  const intoPhase = elapsed - (currentRound - 1) * interval;
  const phaseLeft = isComplete ? 0 : Math.max(0, interval - intoPhase);

  const phasesList = [];
  for (let r = 1; r <= rounds; r++) {
    let status = 'todo';
    if (isComplete || r < currentRound) status = 'done';
    else if (r === currentRound) status = 'current';
    phasesList.push({ label: `T${r}`, status });
  }

  return {
    phase: 'emom',
    phaseLabel: `TOUR ${isComplete ? rounds : currentRound}`,
    phaseSecondsTotal: interval,
    phaseSecondsLeft: phaseLeft,
    currentRound: isComplete ? rounds : currentRound,
    totalRounds: rounds,
    roundLabel: `${isComplete ? rounds : currentRound}/${rounds}`,
    totalSecondsTarget: totalSec,
    totalProgress: Math.min(1, elapsed / totalSec),
    ringProgress: isComplete ? 1 : intoPhase / interval,
    isComplete,
    phaseMarkers: roundMarkers(rounds),
    phasesList,
  };
};

const tabata = (timer, elapsed) => {
  const work = getStat(timer, 'work');
  const rest = getStat(timer, 'rest');
  const rounds = getStat(timer, 'rounds');
  const cycle = work + rest;
  // Pas de repos après le DERNIER tour — rien à récupérer une fois le
  // dernier travail terminé, la séance se termine directement dessus au
  // lieu de traîner un repos superflu (qui laissait le bouton Skip affiché
  // à la fin au lieu de terminer automatiquement).
  const totalSec = cycle * (rounds - 1) + work;
  const isComplete = elapsed >= totalSec;

  const currentRound = Math.min(rounds, Math.floor(elapsed / cycle) + 1);
  const intoCycle = elapsed - (currentRound - 1) * cycle;
  const inWork = intoCycle < work;
  const phaseTotal = inWork ? work : rest;
  const phaseLeft = isComplete
    ? 0
    : inWork
    ? work - intoCycle
    : cycle - intoCycle;

  // Une découpe à chaque bascule travail→repos et repos→travail. Le dernier
  // travail tombe pile sur la fin de la barre : markers() l'écarte.
  const cuts = [];
  for (let r = 1; r <= rounds; r++) {
    cuts.push(((r - 1) * cycle + work) / totalSec);
    if (r < rounds) cuts.push((r * cycle) / totalSec);
  }

  const phasesList = [];
  for (let r = 1; r <= rounds; r++) {
    let workStatus = 'todo';
    let restStatus = 'todo';
    if (isComplete || r < currentRound) {
      workStatus = 'done';
      restStatus = 'done';
    } else if (r === currentRound) {
      workStatus = inWork ? 'current' : 'done';
      restStatus = inWork ? 'todo' : 'current';
    }
    phasesList.push({ label: 'T', status: workStatus, type: 'work' });
    if (r < rounds) phasesList.push({ label: 'R', status: restStatus, type: 'rest' });
  }

  return {
    phase: inWork ? 'travail' : 'repos',
    phaseLabel: inWork ? 'TRAVAIL' : 'REPOS',
    phaseSecondsTotal: phaseTotal,
    phaseSecondsLeft: Math.max(0, phaseLeft),
    currentRound: isComplete ? rounds : currentRound,
    totalRounds: rounds,
    roundLabel: `${isComplete ? rounds : currentRound}/${rounds}`,
    totalSecondsTarget: totalSec,
    totalProgress: Math.min(1, elapsed / totalSec),
    ringProgress: isComplete ? 1 : 1 - Math.max(0, phaseLeft) / phaseTotal,
    isComplete,
    phaseMarkers: markers(cuts),
    phasesList,
  };
};

const restBlock = (block, elapsedInBlock) => {
  const total = block.duration;
  const left = Math.max(0, total - elapsedInBlock);
  const isComplete = left <= 0;
  return {
    phase: 'repos',
    phaseLabel: 'REPOS',
    phaseSecondsTotal: total,
    phaseSecondsLeft: left,
    currentRound: 1,
    totalRounds: 1,
    roundLabel: '1/1',
    totalSecondsTarget: total,
    totalProgress: Math.min(1, elapsedInBlock / total),
    ringProgress: 1 - left / total,
    isComplete,
    phaseMarkers: [],
    phasesList: [{ label: 'REPOS', status: isComplete ? 'done' : 'current', type: 'rest' }],
  };
};

const subStateForBlock = (block, elapsedInBlock) => {
  if (block.type === 'rest') return restBlock(block, elapsedInBlock);
  const inner = blockToTimer(block);
  if (!inner) return null;
  if (block.type === 'amrap') {
    const total = inner._exactTotal;
    const left = Math.max(0, total - elapsedInBlock);
    const isComplete = left <= 0;
    return {
      phase: 'amrap',
      phaseLabel: 'AMRAP',
      phaseSecondsTotal: total,
      phaseSecondsLeft: left,
      currentRound: null,
      totalRounds: null,
      roundLabel: '∞',
      totalSecondsTarget: total,
      totalProgress: Math.min(1, elapsedInBlock / total),
      ringProgress: 1 - left / total,
      isComplete,
      phaseMarkers: [],
      phasesList: [{ label: 'AMRAP', status: isComplete ? 'done' : 'current' }],
    };
  }
  if (block.type === 'basic') {
    // Legacy auto-cycled BASIC for MIX blocks (manual BASIC isn't usable inside a mix).
    return basicLegacy(inner, elapsedInBlock);
  }
  return computeState(inner, elapsedInBlock);
};

const mix = (timer, elapsed) => {
  const blocks = timer._mix?.blocks || [];
  if (blocks.length === 0) {
    return {
      phase: '',
      phaseLabel: 'MIX VIDE',
      phaseSecondsTotal: 0,
      phaseSecondsLeft: 0,
      currentRound: 0,
      totalRounds: 0,
      roundLabel: '—',
      totalSecondsTarget: 0,
      totalProgress: 0,
      ringProgress: 0,
      isComplete: true,
      phaseMarkers: [],
      phasesList: [],
    };
  }

  const totalSec = blocks.reduce((acc, b) => acc + blockDuration(b), 0);
  const isComplete = elapsed >= totalSec;

  let cursor = 0;
  let currentIndex = blocks.length - 1;
  let currentBlock = blocks[currentIndex];
  let elapsedInBlock = blockDuration(currentBlock);

  for (let i = 0; i < blocks.length; i++) {
    const dur = blockDuration(blocks[i]);
    if (elapsed < cursor + dur) {
      currentIndex = i;
      currentBlock = blocks[i];
      elapsedInBlock = elapsed - cursor;
      break;
    }
    cursor += dur;
  }

  const sub = subStateForBlock(currentBlock, elapsedInBlock) || {};

  const phasesList = blocks.map((b, i) => ({
    label: blockName(b).slice(0, 6).toUpperCase(),
    type: b.type,
    status: isComplete || i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo',
  }));

  // Un MIX découpe sa barre par bloc, pas par phase interne : c'est
  // l'enchaînement des blocs que l'utilisateur suit du regard.
  const blockCuts = [];
  let cut = 0;
  for (const b of blocks) {
    cut += blockDuration(b);
    blockCuts.push(cut / totalSec);
  }

  // Fin d'un bloc TABATA : blockDuration() compte un repos après le dernier
  // tour (une transition vers le bloc suivant), que le moteur TABATA seul ne
  // connaît pas — pour lui la série est « terminée ». Sans ce rattrapage, ce
  // repos affichait 00 pendant toute sa durée, les bips 3-2-1 avant le bloc
  // suivant ne sonnaient pas, et « Passer » sautait 0 seconde.
  const blockTotal = blockDuration(currentBlock);
  const blockLeft = Math.max(0, blockTotal - elapsedInBlock);
  const trailing = !isComplete && !!sub.isComplete && blockLeft > 0;
  const nextBlock = blocks[currentIndex + 1] || null;

  const blockSubLabel = sub.phaseLabel || '—';
  // Un bloc repos sans nom afficherait « REPOS · REPOS » : son sous-libellé suffit.
  const composedLabel =
    currentBlock.type === 'rest' && !currentBlock.label
      ? blockSubLabel
      : `${blockName(currentBlock).toUpperCase()} · ${blockSubLabel}`;

  return {
    phase: 'mix',
    // Le bloc courant a sa propre phase interne (un TABATA dans un MIX
    // alterne travail et repos). Sans la remonter, le seul moyen de savoir
    // qu'on est en inter-série serait de parser `composedLabel`.
    subPhase: sub.phase || '',
    blockRole: resolveBlockRole(currentBlock),
    phaseLabel: composedLabel,
    phaseSecondsTotal: sub.phaseSecondsTotal ?? 0,
    phaseSecondsLeft: isComplete ? 0 : trailing ? blockLeft : sub.phaseSecondsLeft ?? 0,
    currentRound: currentIndex + 1,
    totalRounds: blocks.length,
    // Détail du bloc pour le coach vocal (lib/voiceCues.js) : nom de
    // l'exercice, tours À L'INTÉRIEUR du bloc, temps restant du bloc, et
    // bloc suivant — pour annoncer « Ensuite : Burpees » sans l'écran.
    blockLabel: currentBlock.label || '',
    blockType: currentBlock.type,
    blockSecondsTotal: blockTotal,
    blockSecondsLeft: isComplete ? 0 : blockLeft,
    subRound: sub.currentRound ?? null,
    subTotalRounds: sub.totalRounds ?? null,
    nextBlock: nextBlock ? { label: nextBlock.label || '', type: nextBlock.type } : null,
    roundLabel: `B ${currentIndex + 1}/${blocks.length}`,
    totalSecondsTarget: totalSec,
    totalProgress: Math.min(1, elapsed / totalSec),
    ringProgress: isComplete
      ? 1
      : trailing
      ? 1 - blockLeft / (sub.phaseSecondsTotal || blockLeft)
      : sub.ringProgress ?? 0,
    isComplete,
    phaseMarkers: markers(blockCuts),
    phasesList,
  };
};

// Le repos (l'inter-série) est marqué d'un seul endroit plutôt que dans
// chaque `return` des moteurs : un mode qui oublierait le drapeau passerait
// silencieusement pour "toujours en travail". AMRAP et EMOM n'ont aucune
// phase de repos par construction, ils restent donc à false.
const restingPhase = (state) => {
  if (!state || state.isComplete) return false;
  if (state.phase === 'mix') return state.subPhase === 'repos';
  return state.phase === 'repos';
};

export const computeState = (timer, secondsElapsed, ctx) => {
  const state = (() => {
    switch (timer.id) {
      case 'amrap':
        return amrap(timer, secondsElapsed);
      case 'basic':
        return basic(timer, secondsElapsed, ctx);
      case 'emom':
        return emom(timer, secondsElapsed);
      case 'tabata':
        return tabata(timer, secondsElapsed);
      case 'mix':
        return mix(timer, secondsElapsed);
      default:
        return null;
    }
  })();

  if (!state) return null;
  return { ...state, isRest: restingPhase(state) };
};

export const skipToNextPhaseElapsed = (timer, currentElapsed, ctx) => {
  const state = computeState(timer, currentElapsed, ctx);
  if (!state || state.isComplete) return currentElapsed;
  // BASIC work is infinite count-up: skip is a no-op (use "Fin du travail" instead).
  if (timer.id === 'basic' && state.countDirection === 'up') return currentElapsed;
  return currentElapsed + state.phaseSecondsLeft;
};

export const computeTotalDuration = (timer) => {
  const state = computeState(timer, 0);
  return state ? state.totalSecondsTarget : 0;
};

export const computeSessionStats = (timer, elapsedSeconds, ctx) => {
  const work = getStat(timer, 'work');
  const rest = getStat(timer, 'rest');
  const rounds = getStat(timer, 'rounds');
  const interval = getStat(timer, 'interval');
  const duration = getStat(timer, 'duration');

  if (timer.id === 'amrap') {
    const total = duration * 60;
    return {
      completedRounds: null,
      totalRounds: null,
      roundsLabel: '∞',
      workTotal: Math.min(elapsedSeconds, total),
      restTotal: 0,
    };
  }

  if (timer.id === 'emom') {
    const completed = Math.min(rounds, Math.floor(elapsedSeconds / interval));
    return {
      completedRounds: completed,
      totalRounds: rounds,
      roundsLabel: `${completed}/${rounds}`,
      workTotal: completed * interval,
      restTotal: 0,
    };
  }

  if (timer.id === 'tabata') {
    // Le dernier tour n'a pas de repos (voir tabata() plus haut) : un tour
    // compte comme "complété" dès que son travail est fini, pas besoin
    // d'attendre un repos qui n'existe pas forcément.
    const cycle = work + rest;
    let completed = 0;
    let restTotal = 0;
    for (let r = 1; r <= rounds; r++) {
      const workEnd = (r - 1) * cycle + work;
      if (elapsedSeconds < workEnd) break;
      completed = r;
      if (r < rounds) {
        restTotal += Math.min(rest, Math.max(0, elapsedSeconds - workEnd));
      }
    }
    return {
      completedRounds: completed,
      totalRounds: rounds,
      roundsLabel: `${completed}/${rounds}`,
      workTotal: completed * work,
      restTotal,
    };
  }

  if (timer.id === 'basic') {
    const totalRounds = Math.max(1, getStat(timer, 'rounds') ?? 1);
    const triggers = ((ctx && ctx.restTriggers) || [])
      .slice()
      .sort((a, b) => a - b);
    let workTotal = 0;
    let restTotal = 0;
    let completed = 0;
    let cursor = 0;
    for (let i = 0; i < triggers.length; i++) {
      const t = triggers[i];
      const isFinalRound = i === totalRounds - 1;
      if (!isFinalRound && elapsedSeconds <= t) {
        workTotal += Math.max(0, elapsedSeconds - cursor);
        cursor = elapsedSeconds;
        break;
      }
      workTotal += Math.max(0, t - cursor);
      // Le dernier tour n'a pas de repos (voir basic() plus haut) : il
      // compte comme terminé dès son trigger, sans repos à attendre derrière
      // — sinon ce tour final n'était jamais compté comme fait.
      if (isFinalRound) {
        completed += 1;
        cursor = t;
        break;
      }
      const restEnd = t + rest;
      if (elapsedSeconds >= restEnd) {
        restTotal += rest;
        completed += 1;
        cursor = restEnd;
      } else {
        restTotal += elapsedSeconds - t;
        cursor = elapsedSeconds;
        break;
      }
    }
    if (cursor < elapsedSeconds) {
      workTotal += elapsedSeconds - cursor;
    }
    return {
      completedRounds: completed,
      totalRounds,
      roundsLabel: `${completed}/${totalRounds}`,
      workTotal,
      restTotal,
    };
  }

  if (timer.id === 'mix') {
    const blocks = timer._mix?.blocks || [];
    let workTotal = 0;
    let restTotal = 0;
    let completedBlocks = 0;
    let cursor = 0;
    for (const b of blocks) {
      const dur = blockDuration(b);
      const blockEnd = cursor + dur;
      const inThisBlock = Math.max(0, Math.min(elapsedSeconds, blockEnd) - cursor);
      if (inThisBlock <= 0) break;
      if (b.type === 'rest') {
        restTotal += inThisBlock;
      } else if (b.type === 'tabata') {
        const cycle = b.duration + (b.rest || 0);
        const completedCycles = Math.min(b.rounds, Math.floor(inThisBlock / cycle));
        workTotal += completedCycles * b.duration;
        restTotal += completedCycles * (b.rest || 0);
      } else if (b.type === 'basic') {
        const completed = Math.min(b.rounds, Math.floor(inThisBlock / b.duration));
        restTotal += completed * b.duration;
      } else {
        workTotal += inThisBlock;
      }
      if (elapsedSeconds >= blockEnd) completedBlocks += 1;
      cursor = blockEnd;
    }
    return {
      completedRounds: completedBlocks,
      totalRounds: blocks.length,
      roundsLabel: `${completedBlocks}/${blocks.length} blocs`,
      workTotal,
      restTotal,
    };
  }

  return {
    completedRounds: null,
    totalRounds: null,
    roundsLabel: '—',
    workTotal: 0,
    restTotal: 0,
  };
};
