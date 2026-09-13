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
    full: 'Travail libre, repos minuté à la demande',
    tag: 'INTERSÉRIE',
    color: '#9A9A9A',
    bgColors: ['#3A3A3A', '#1A1A1A', '#050505'],
    textMode: 'light',
    stats: [
      { key: 'rest', label: 'REPOS', value: 30, unit: 's', type: 'seconds', range: [5, 600], editable: true },
      { key: 'rounds', label: 'TOURS', value: 3, unit: '', type: 'rounds', range: [1, 30], editable: true },
    ],
    phases: ['TRAVAIL', 'REPOS'],
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
      { key: 'name', label: 'NOM', value: '—', unit: '', type: 'none', editable: false },
      { key: 'blocks', label: 'BLOCS', value: '0', unit: '', type: 'none', editable: false },
      { key: 'duration', label: 'TOTAL', value: '00:00', unit: '', type: 'none', editable: false },
    ],
    phases: ['AMRAP', 'EMOM', 'TABATA', '...'],
  },
];

// v ≥ 60 → "1:30 min", multiple exact de 60 → "2 min", sinon "Xs".
// Centralise le format déjà utilisé par EMOM/BASIC ci-dessous.
const formatSecondsLabel = (v) => {
  if (v < 60) return `${v}s`;
  if (v % 60 === 0) return `${v / 60} min`;
  const m = Math.floor(v / 60);
  const sec = String(v % 60).padStart(2, '0');
  return `${m}:${sec} min`;
};

// Description (E) affichée sous le nom du timer sur la Home. Chaque timer a
// au moins une stat éditable (WheelPicker) qui peut rendre le texte fixe
// faux avec le temps — on la recalcule ici depuis les stats courantes pour
// que la description reste toujours correcte. Phrases volontairement
// courtes (comparables aux textes d'origine) pour ne pas déborder sous le
// nom du timer.
export const getTimerDescription = (timer) => {
  if (timer.id === 'amrap') {
    const duration = timer.stats.find((x) => x.key === 'duration')?.value ?? 20;
    return `Un maximum de tours en ${duration} minute${duration > 1 ? 's' : ''}`;
  }
  if (timer.id === 'basic') {
    const rest = timer.stats.find((x) => x.key === 'rest')?.value ?? 30;
    return `Travail libre, ${formatSecondsLabel(rest)} de repos à la demande`;
  }
  if (timer.id === 'emom') {
    const interval = timer.stats.find((x) => x.key === 'interval')?.value ?? 60;
    if (interval === 60) return timer.full; // "Un effort à chaque début de minute"
    return `Un effort toutes les ${formatSecondsLabel(interval)}`;
  }
  if (timer.id === 'tabata') {
    const work = timer.stats.find((x) => x.key === 'work')?.value ?? 0;
    const rest = timer.stats.find((x) => x.key === 'rest')?.value ?? 0;
    return `Alterne ${work}s de travail et ${rest}s de repos`;
  }
  if (timer.id === 'mix') {
    const blocks = timer._mix?.blocks?.length ?? 0;
    if (blocks === 0) return timer.full; // "Enchaînement personnalisé de plusieurs timers"
    return `Enchaînement personnalisé de ${blocks} bloc${blocks > 1 ? 's' : ''}`;
  }
  return timer.full;
};

export const getTimerHero = (timer) => {
  const s = timer.stats;
  if (timer.id === 'amrap') {
    return { number: String(s[0].value).padStart(2, '0'), unit: 'MIN' };
  }
  if (timer.id === 'basic') {
    const restStat = s.find((x) => x.key === 'rest');
    const v = restStat?.value ?? 0;
    if (v < 60) return { number: String(v).padStart(2, '0'), unit: 'REPOS' };
    const m = Math.floor(v / 60);
    const sec = v % 60;
    return {
      number: sec === 0 ? `${String(m).padStart(2, '0')}:00` : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
      unit: 'REPOS',
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
  if (timer.id === 'mix') {
    const blocks = timer._mix?.blocks?.length ?? 0;
    return { number: String(blocks).padStart(2, '0'), unit: 'BLOCS' };
  }
  return { number: '∞', unit: 'MODULABLE' };
};
