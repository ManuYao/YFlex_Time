const getStat = (timer, key) => {
  const stat = timer.stats.find((s) => s.key === key);
  return stat ? stat.value : null;
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
  const work = getStat(timer, 'work');
  const rest = getStat(timer, 'rest');
  const rounds = getStat(timer, 'rounds');
  // Pattern: W R W R W R ... W (rest between rounds, ends on last work)
  const totalSec = work * rounds + rest * Math.max(0, rounds - 1);
  const isComplete = elapsed >= totalSec;

  let cursor = 0;
  let currentRound = 1;
  let phaseLabel = 'TRAVAIL';
  let phaseTotal = work;
  let phaseLeft = work;

  for (let r = 1; r <= rounds; r++) {
    if (elapsed < cursor + work) {
      phaseLabel = 'TRAVAIL';
      phaseTotal = work;
      phaseLeft = cursor + work - elapsed;
      currentRound = r;
      break;
    }
    cursor += work;
    if (r < rounds && rest > 0) {
      if (elapsed < cursor + rest) {
        phaseLabel = 'PAUSE';
        phaseTotal = rest;
        phaseLeft = cursor + rest - elapsed;
        currentRound = r;
        break;
      }
      cursor += rest;
    }
  }

  if (isComplete) {
    phaseLabel = 'TRAVAIL';
    phaseTotal = work;
    phaseLeft = 0;
    currentRound = rounds;
  }

  return {
    phase: phaseLabel.toLowerCase(),
    phaseLabel,
    phaseSecondsTotal: phaseTotal,
    phaseSecondsLeft: Math.max(0, phaseLeft),
    currentRound,
    totalRounds: rounds,
    roundLabel: `${currentRound}/${rounds}`,
    totalSecondsTarget: totalSec,
    totalProgress: Math.min(1, elapsed / totalSec),
    ringProgress: 1 - Math.max(0, phaseLeft) / phaseTotal,
    isComplete,
    phasesList: buildBasicPhases(rounds, currentRound, phaseLabel, isComplete, rest > 0),
  };
};

const buildBasicPhases = (rounds, currentRound, phaseLabel, isComplete, hasRest) => {
  const list = [];
  for (let r = 1; r <= rounds; r++) {
    let workStatus = 'todo';
    if (isComplete || r < currentRound) workStatus = 'done';
    else if (r === currentRound) {
      workStatus = phaseLabel === 'TRAVAIL' ? 'current' : 'done';
    }
    list.push({ label: 'TRAVAIL', status: workStatus, type: 'work' });
    if (hasRest && r < rounds) {
      let restStatus = 'todo';
      if (isComplete || r < currentRound) restStatus = 'done';
      else if (r === currentRound && phaseLabel === 'PAUSE') restStatus = 'current';
      list.push({ label: 'PAUSE', status: restStatus, type: 'rest' });
    }
  }
  return list;
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
