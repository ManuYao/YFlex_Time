export const BLOCK_TYPES = [
  {
    id: 'amrap',
    name: 'AMRAP',
    color: '#FF5454',
    // `icon` = nom d'icône maison (components/common/AppIcon.js) : le
    // cadran du mode, le même que dans la fiche du mode.
    icon: 'amrap',
    hint: 'Durée libre',
    defaults: { duration: 180, rounds: 1 },
  },
  {
    id: 'emom',
    name: 'EMOM',
    color: '#1FC777',
    icon: 'emom',
    hint: 'Chaque minute',
    defaults: { duration: 60, rounds: 5 },
  },
  {
    id: 'tabata',
    name: 'TABATA',
    color: '#FFC933',
    icon: 'tabata',
    hint: 'HIIT court',
    defaults: { duration: 20, rest: 10, rounds: 8 },
  },
  {
    id: 'rest',
    name: 'REPOS',
    color: '#4A90FF',
    icon: 'rest',
    hint: 'Transition',
    defaults: { duration: 60, rounds: 1 },
  },
  {
    id: 'basic',
    name: 'BASIC',
    color: '#9A9A9A',
    icon: 'basic',
    hint: 'Rythme libre',
    // `duration` = ESTIMATION du travail par tour, purement informative (le
    // vrai travail est manuel : "Fin du travail" pendant la séance, voir
    // lib/timer-engine.js). `rest` = pause réelle entre les tours.
    defaults: { duration: 30, rest: 60, rounds: 3 },
  },
];

export const getBlockType = (id) => BLOCK_TYPES.find((t) => t.id === id);

// Pour BASIC, `duration` n'est qu'une ESTIMATION du travail par tour (le
// vrai travail est libre, contrôlé pendant la séance) : le total qui en sort
// est une projection, pas une garantie — même principe que TABATA, qui a la
// même incohérence assumée (repos final compté) documentée dans CLAUDE.md.
export const getBlockDuration = (block) => {
  const rounds = Math.max(1, block.rounds || 1);
  if (block.type === 'tabata' || block.type === 'basic') {
    return (block.duration + (block.rest || 0)) * rounds;
  }
  return block.duration * rounds;
};

export const getMixTotalDuration = (blocks) =>
  blocks.reduce((acc, b) => acc + getBlockDuration(b), 0);

const formatSeconds = (s) => {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec === 0 ? `${m}min` : `${m}:${String(sec).padStart(2, '0')}`;
};

export const formatBlockSubtitle = (block) => {
  if (block.type === 'tabata') {
    return `${formatSeconds(block.duration)} / ${formatSeconds(block.rest || 0)} × ${block.rounds}`;
  }
  if (block.type === 'basic') {
    // "~" sur le travail : c'est une estimation, pas une durée imposée.
    return `~${formatSeconds(block.duration)} / ${formatSeconds(block.rest || 0)} × ${block.rounds}`;
  }
  if (block.type === 'rest') {
    return formatSeconds(block.duration);
  }
  const rounds = block.rounds > 1 ? ` × ${block.rounds}` : '';
  return `${formatSeconds(block.duration)}${rounds}`;
};

export const makeBlock = (typeId) => {
  const type = getBlockType(typeId);
  if (!type) return null;
  return {
    id: `b${Date.now()}${Math.floor(Math.random() * 1000)}`,
    type: typeId,
    label: type.id === 'rest' ? 'Repos' : `Bloc ${type.name}`,
    ...type.defaults,
    rest: type.defaults.rest ?? 0,
    rounds: type.defaults.rounds ?? 1,
  };
};
