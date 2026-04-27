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
    phasesList: [
      { label: 'AMRAP', status: isComplete ? 'done' : 'current' },
    ],
  };
};

const basic = (timer, elapsed) => {
  const rest = getStat(timer, 'rest');
  const rounds = getStat(timer, 'rounds');
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
    phasesList,
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
    phaseLabel: `T${isComplete ? rounds : currentRound}`,
    phaseSecondsTotal: interval,
    phaseSecondsLeft: phaseLeft,
    currentRound: isComplete ? rounds : currentRound,
    totalRounds: rounds,
    roundLabel: `${isComplete ? rounds : currentRound}/${rounds}`,
    totalSecondsTarget: totalSec,
    totalProgress: Math.min(1, elapsed / totalSec),
    ringProgress: isComplete ? 1 : intoPhase / interval,
    isComplete,
    phasesList,
  };
};

const tabata = (timer, elapsed) => {
  const work = getStat(timer, 'work');
  const rest = getStat(timer, 'rest');
  const rounds = getStat(timer, 'rounds');
  // TABATA convention: each round = work + rest (rest included after last work)
  const cycle = work + rest;
  const totalSec = cycle * rounds;
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
    phasesList.push({ label: 'R', status: restStatus, type: 'rest' });
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
      phasesList: [{ label: 'AMRAP', status: isComplete ? 'done' : 'current' }],
    };
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
    label: (b.label || b.type).slice(0, 6).toUpperCase(),
    type: b.type,
    status: isComplete || i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo',
  }));

  const blockSubLabel = sub.phaseLabel || '—';
  const composedLabel = `${(currentBlock.label || currentBlock.type).toUpperCase()} · ${blockSubLabel}`;

  return {
    phase: 'mix',
    phaseLabel: composedLabel,
    phaseSecondsTotal: sub.phaseSecondsTotal ?? 0,
    phaseSecondsLeft: isComplete ? 0 : sub.phaseSecondsLeft ?? 0,
    currentRound: currentIndex + 1,
    totalRounds: blocks.length,
    roundLabel: `B ${currentIndex + 1}/${blocks.length}`,
    totalSecondsTarget: totalSec,
    totalProgress: Math.min(1, elapsed / totalSec),
    ringProgress: isComplete ? 1 : sub.ringProgress ?? 0,
    isComplete,
    phasesList,
  };
};

export const computeState = (timer, secondsElapsed) => {
  switch (timer.id) {
    case 'amrap':
      return amrap(timer, secondsElapsed);
    case 'basic':
      return basic(timer, secondsElapsed);
    case 'emom':
      return emom(timer, secondsElapsed);
    case 'tabata':
      return tabata(timer, secondsElapsed);
    case 'mix':
      return mix(timer, secondsElapsed);
    default:
      return null;
  }
};

export const skipToNextPhaseElapsed = (timer, currentElapsed) => {
  const state = computeState(timer, currentElapsed);
  if (!state || state.isComplete) return currentElapsed;
  return currentElapsed + state.phaseSecondsLeft;
};

export const computeTotalDuration = (timer) => {
  const state = computeState(timer, 0);
  return state ? state.totalSecondsTarget : 0;
};

export const computeSessionStats = (timer, elapsedSeconds) => {
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
    const cycle = work + rest;
    const completed = Math.min(rounds, Math.floor(elapsedSeconds / cycle));
    return {
      completedRounds: completed,
      totalRounds: rounds,
      roundsLabel: `${completed}/${rounds}`,
      workTotal: completed * work,
      restTotal: completed * rest,
    };
  }

  if (timer.id === 'basic') {
    const completed = Math.min(rounds, Math.floor(elapsedSeconds / rest));
    return {
      completedRounds: completed,
      totalRounds: rounds,
      roundsLabel: `${completed}/${rounds}`,
      workTotal: 0,
      restTotal: completed * rest,
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
