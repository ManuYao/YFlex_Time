export const TIMERS = [
  {
    id: 'amrap',
    name: 'AMRAP',
    full: 'Un maximum de tours dans le temps donné',
    tag: 'ENDURANCE',
    color: '#FF5454',
    bgColors: ['#FF5454', '#B81818', '#4A0606'],
    textMode: 'light',
    stats: [
      { key: 'duration', label: 'DURÉE', value: 20, unit: 'min', type: 'minutes', range: [1, 60], editable: true },
      { key: 'rounds', label: 'TOURS', value: '∞', unit: '', type: 'infinite', editable: false },
      { key: 'rest', label: 'REPOS', value: '—', unit: '', type: 'none', editable: false },
    ],
    phases: ['ÉCHAUFFEMENT', 'AMRAP', "RÉCUP'"],
  },
  {
    id: 'basic',
    name: 'BASIC',
    full: 'Alterne travail et pause librement',
    tag: 'STANDARD',
    color: '#9A9A9A',
    bgColors: ['#3A3A3A', '#1A1A1A', '#050505'],
    textMode: 'light',
    stats: [
      { key: 'work', label: 'TRAVAIL', value: 60, unit: 's', type: 'seconds', range: [10, 600], editable: true },
      { key: 'rest', label: 'PAUSE', value: 30, unit: 's', type: 'seconds', range: [0, 300], editable: true },
      { key: 'rounds', label: 'TOURS', value: 3, unit: '', type: 'rounds', range: [1, 50], editable: true },
    ],
    phases: ['TRAVAIL', 'PAUSE'],
  },
  {
    id: 'emom',
    name: 'EMOM',
    full: 'Un effort à chaque début de minute',
    tag: 'RYTHME',
    color: '#1FC777',
    bgColors: ['#1FC777', '#047442', '#022A18'],
    textMode: 'light',
    stats: [
      { key: 'interval', label: 'INTERV.', value: 60, unit: 's', type: 'seconds', range: [10, 300], editable: true },
      { key: 'rounds', label: 'TOURS', value: 10, unit: '', type: 'rounds', range: [1, 50], editable: true },
      { key: 'total', label: 'TOTAL', value: '10:00', unit: '', type: 'computed', editable: false },
    ],
    phases: ['T1', 'T2', 'T3', '...'],
  },
  {
    id: 'tabata',
    name: 'TABATA',
    full: '20s travail / 10s repos',
    tag: 'HIIT',
    color: '#FFC933',
    bgColors: ['#FFC933', '#E08500', '#5C2E00'],
    textMode: 'dark',
    stats: [
      { key: 'work', label: 'TRAVAIL', value: 20, unit: 's', type: 'seconds', range: [5, 120], editable: true },
      { key: 'rest', label: 'REPOS', value: 10, unit: 's', type: 'seconds', range: [5, 60], editable: true },
      { key: 'rounds', label: 'TOURS', value: 8, unit: '', type: 'rounds', range: [1, 30], editable: true },
    ],
    phases: ['T', 'R', 'T', 'R'],
  },
  {
    id: 'mix',
    name: 'MIX',
    full: 'Enchaînement personnalisé de plusieurs timers',
    tag: 'COMBINÉ',
    color: '#9575FF',
    bgColors: ['#9575FF', '#4B2FC9', '#1A0D52'],
    textMode: 'light',
    stats: [
      { key: 'blocks', label: 'BLOCS', value: 'VARIABLE', unit: '', type: 'none', editable: false },
      { key: 'duration', label: 'DURÉE', value: 'VARIABLE', unit: '', type: 'none', editable: false },
      { key: 'presets', label: 'MODÈLES', value: 3, unit: '', type: 'presets', editable: false },
    ],
    phases: ['AMRAP', 'EMOM', 'TABATA', '...'],
  },
];

export const getTimerHero = (timer) => {
  const s = timer.stats;
  if (timer.id === 'amrap') {
    return { number: String(s[0].value).padStart(2, '0'), unit: 'MIN' };
  }
  if (timer.id === 'basic') {
    const v = s[0].value;
    if (v < 60) return { number: String(v).padStart(2, '0'), unit: 'TRAVAIL' };
    const m = Math.floor(v / 60);
    const sec = v % 60;
    return {
      number: sec === 0 ? `${String(m).padStart(2, '0')}:00` : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
      unit: 'TRAVAIL',
    };
  }
  if (timer.id === 'emom') {
    const v = s[0].value;
    if (v < 60) return { number: String(v).padStart(2, '0'), unit: 'SEC' };
    const m = Math.floor(v / 60);
    const sec = v % 60;
    return {
      number: sec === 0 ? `${String(m).padStart(2, '0')}:00` : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
      unit: 'MIN',
    };
  }
  if (timer.id === 'tabata') {
    return { number: String(s[2].value).padStart(2, '0'), unit: 'TOURS' };
  }
  return { number: '∞', unit: 'MODULABLE' };
};
