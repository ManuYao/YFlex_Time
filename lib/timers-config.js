import { computeTotalDuration } from './timer-engine';

export const TIMERS = [
  {
    id: 'amrap',
    name: 'AMRAP',
    full: 'Un maximum de tours dans le temps donné',
    tag: 'ENDURANCE',
    color: '#FF5454',
    bgColors: ['#FF5454', '#B81818', '#4A0606'],
    textMode: 'light',
    // La durée, et rien d'autre (v16.4.0). Les cases TOURS (« ∞ ») et REPOS
    // (« — ») n'étaient ni réglables ni utiles : un AMRAP n'a ni nombre de
    // tours ni repos à régler, elles ne faisaient que charger l'écran.
    stats: [
      { key: 'duration', label: 'DURÉE', value: 20, unit: 'min', type: 'minutes', range: [1, 60], editable: true },
    ],
    // Valeur de départ (20 min) : le déroulé réel suit la durée choisie, voir
    // getTimerPhases() plus bas.
    phases: ['20 MIN NON-STOP', 'BILAN'],
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
      { key: 'rest', label: 'REPOS', value: 75, unit: 's', type: 'seconds', range: [5, 600], editable: true },
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
      { key: 'rounds', label: 'TOURS', value: 6, unit: '', type: 'rounds', range: [1, 50], editable: true },
      { key: 'total', label: 'TOTAL', value: '06:00', unit: '', type: 'computed', editable: false },
    ],
    phases: ['TOUR 1', 'TOUR 2', 'TOUR 3', '...'],
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
      { key: 'work', label: 'TRAVAIL', value: 20, unit: 's', type: 'seconds', range: [5, 300], editable: true },
      { key: 'rest', label: 'REPOS', value: 10, unit: 's', type: 'seconds', range: [5, 300], editable: true },
      { key: 'rounds', label: 'TOURS', value: 5, unit: '', type: 'rounds', range: [1, 30], editable: true },
    ],
    phases: ['TRAVAIL', 'REPOS', 'TRAVAIL', 'REPOS'],
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
    return `Alterne ${formatSecondsLabel(work)} de travail et ${formatSecondsLabel(rest)} de repos`;
  }
  if (timer.id === 'mix') {
    const blocks = timer._mix?.blocks?.length ?? 0;
    if (blocks === 0) return timer.full; // "Enchaînement personnalisé de plusieurs timers"
    return `Enchaînement personnalisé de ${blocks} bloc${blocks > 1 ? 's' : ''}`;
  }
  return timer.full;
};

// Déroulé (L) affiché sous les réglages sur la Home : ce qui SE PASSE vraiment,
// dans l'ordre. Recalculé depuis les réglages courants, comme la description.
//
// AMRAP (v16.5.0) : l'ancien déroulé « ÉCHAUFFEMENT / AMRAP / RÉCUP' » ne
// correspondait plus à rien — le chrono ne fait ni échauffement ni récupération,
// ce sont des blocs du MIX. Un AMRAP, c'est UNE phase d'effort continue à la
// durée choisie (la personne compte ses tours elle-même), puis le bilan. Court
// à dessein : la première version (4 pastilles) était trop longue.
// Les autres modes gardent le déroulé de leur configuration.
export const getTimerPhases = (timer) => {
  if (timer.id === 'amrap') {
    const duration = timer.stats.find((x) => x.key === 'duration')?.value ?? 20;
    return [`${duration} MIN NON-STOP`, 'BILAN'];
  }
  return timer.phases;
};

// Déroulé en BARRE (accueil) : la même histoire que getTimerPhases mais en
// segments proportionnels, moins de texte. `kind: 'work'` = effort, `'rest'` =
// pause (dessinée plus courte et éteinte). Aucune couleur propre : la barre
// reprend celles de la carte (DA), pour ne rien casser.
const MAX_BAR_ROUNDS = 8;
export const getTimerBar = (timer) => {
  const stat = (key, fallback) => timer.stats.find((x) => x.key === key)?.value ?? fallback;
  if (timer.id === 'amrap') return [{ kind: 'work', weight: 1 }];
  if (timer.id === 'basic') {
    const rounds = Math.min(MAX_BAR_ROUNDS, Math.max(1, stat('rounds', 3)));
    const out = [];
    for (let i = 0; i < rounds; i++) {
      out.push({ kind: 'work', weight: 2 });
      if (i < rounds - 1) out.push({ kind: 'rest', weight: 1 });
    }
    return out;
  }
  if (timer.id === 'emom') {
    const rounds = Math.min(12, Math.max(1, stat('rounds', 6)));
    return Array.from({ length: rounds }, () => ({ kind: 'work', weight: 1 }));
  }
  if (timer.id === 'tabata') {
    const work = Math.max(1, stat('work', 20));
    const rest = Math.max(1, stat('rest', 10));
    const rounds = Math.min(MAX_BAR_ROUNDS, Math.max(1, stat('rounds', 8)));
    const out = [];
    for (let i = 0; i < rounds; i++) {
      out.push({ kind: 'work', weight: work });
      if (i < rounds - 1) out.push({ kind: 'rest', weight: rest });
    }
    return out;
  }
  if (timer.id === 'mix') {
    const blocks = timer._mix?.blocks || [];
    return blocks.map((b) => {
      const rounds = Math.max(1, b.rounds || 1);
      const weight =
        b.type === 'tabata' || b.type === 'basic'
          ? ((b.duration || 0) + (b.rest || 0)) * rounds
          : (b.duration || 0) * rounds;
      return {
        kind: b.type === 'rest' ? 'rest' : 'work',
        weight: Math.max(1, weight),
      };
    });
  }
  return [];
};

// Horloge du hero : toujours deux chiffres, HH:MM:SS au-delà d'une heure.
const heroClock = (total) => {
  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
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
    // Durée réelle de la séance, calculée par le moteur lui-même : pas de
    // repos après le dernier tour, donc 8 × 20s/10s = 03:50 et non 04:00.
    // Les tours restent lisibles dans la rangée de réglages sous le cercle.
    return { number: heroClock(computeTotalDuration(timer)), unit: 'TOTAL' };
  }
  if (timer.id === 'mix') {
    const blocks = timer._mix?.blocks?.length ?? 0;
    return { number: String(blocks).padStart(2, '0'), unit: 'BLOCS' };
  }
  return { number: '∞', unit: 'MODULABLE' };
};

// Formats "prose" (pas de zéro devant, contrairement au format horloge des
// roues de sélection) : "1 min 15", "20 sec", "8 tours".
const proseDuration = (v) => {
  if (v < 60) return `${v} sec`;
  const m = Math.floor(v / 60);
  const s = v % 60;
  return s === 0 ? `${m} min` : `${m} min ${s}`;
};
const proseRounds = (v) => `${v} ${v > 1 ? 'tours' : 'tour'}`;
const statValue = (timer, key) => timer.stats?.find((x) => x.key === key)?.value;

// Contenu du sheet "Comment ça marche ?" (appui long > panneau stats >
// ModeStatsSheet). Les exemples de durée/tours reprennent les valeurs
// réellement réglées par l'utilisateur sur ce timer (dynamique), pas des
// nombres figés — demande explicite : si l'utilisateur change son EMOM à 45s,
// l'explication doit parler de 45s, pas de "1 minute".
export const getHowToItems = (timer) => {
  if (timer.id === 'amrap') {
    const duration = `${statValue(timer, 'duration') ?? 20} min`;
    return [
      { icon: 'loop', lead: 'Circuit à enchaîner', text: `Fais un maximum de tours de ton circuit en ${duration} — le nombre de tours n'est pas limité.` },
      { icon: 'pulse', lead: 'Cardio en continu', text: `Course, vélo, tapis... tiens ${duration} sans t'arrêter et vise la distance ou l'intensité.` },
    ];
  }
  if (timer.id === 'basic') {
    const rest = proseDuration(statValue(timer, 'rest') ?? 30);
    const rounds = proseRounds(statValue(timer, 'rounds') ?? 3);
    return [
      { icon: 'dumbbell', lead: 'Ton effort, ton rythme', text: `Fais ta série (ex : 6 à 12 tractions), puis appuie pour lancer ${rest} de repos.` },
      { icon: 'repeat', lead: `${rounds}`, text: 'Répète pour le nombre de tours réglé ci-dessus — ajustable à tout moment.' },
    ];
  }
  if (timer.id === 'emom') {
    const interval = proseDuration(statValue(timer, 'interval') ?? 60);
    const rounds = proseRounds(statValue(timer, 'rounds') ?? 10);
    return [
      { icon: 'stopwatch', lead: `Toutes les ${interval}`, text: `Un nouvel effort démarre à chaque intervalle, pendant ${rounds}.` },
      { icon: 'bolt', lead: 'Finis vite, repose plus', text: "Termine ta série (ex : 10 pompes) avant la fin de l'intervalle : le temps qu'il reste est ton repos." },
    ];
  }
  if (timer.id === 'tabata') {
    const work = proseDuration(statValue(timer, 'work') ?? 20);
    const rest = proseDuration(statValue(timer, 'rest') ?? 10);
    const rounds = proseRounds(statValue(timer, 'rounds') ?? 8);
    return [
      { icon: 'flame', lead: 'Travail chronométré', text: `${work} d'effort non-stop (pompes, squats...), puis ${rest} de repos.` },
      { icon: 'loop', lead: `${rounds} automatiques`, text: 'Le cycle travail/repos se répète tout seul, rien à relancer.' },
      { icon: 'link', lead: "Change d'exercice à chaque tour", text: 'Tractions, tirage à la poulie, pompes... enchaîne comme tu veux, le but est de bosser le muscle à ta façon.' },
    ];
  }
  if (timer.id === 'mix') {
    return [
      { icon: 'blocks', lead: 'Ton enchaînement', text: 'Combine plusieurs blocs (AMRAP, EMOM, TABATA...) que tu configures toi-même dans le constructeur.' },
      { icon: 'puzzle', lead: '100% modulable', text: 'Ajoute, réordonne ou supprime des blocs pour coller exactement à ta séance.' },
    ];
  }
  return [{ icon: 'medal', lead: timer.name, text: timer.full }];
};

// Contenu de la page dédiée "Voir plus" (app/mode-guide.js), ouverte depuis
// HowToSheet. Plus profond que getHowToItems (qui explique le mécanisme) :
// ici, d'où vient le format et dans quels sports il se retrouve. Volontairement
// pas prescriptif — des pistes, jamais des règles : c'est le sportif qui choisit
// ses exercices, l'app ne fait que tenir le temps (demande explicite de
// l'utilisateur, v14.15.0).
export const getModeGuide = (timer) => {
  if (timer.id === 'amrap') {
    return [
      {
        title: "D'où ça vient",
        text: "Le format vient de l'entraînement fonctionnel façon CrossFit : un temps fixe, un objectif — faire le plus de tours possible d'un circuit avant que le chrono ne s'arrête.",
      },
      {
        title: 'Pour quels sports',
        text: "Utile partout où on peut mesurer un volume dans un temps donné : circuits de squats, pompes ou burpees, course, vélo, rameur, corde à sauter, longueurs en piscine, enchaînement de voies d'escalade. À toi de décider ce qui compte comme un tour.",
      },
      {
        title: 'Pourquoi ce format',
        text: "Le temps est fixe, pas l'effort : un débutant fait moins de tours, un athlète confirmé plus — tout le monde s'arrête à la même seconde. Le format s'adapte à ton niveau sans que tu aies à changer la durée.",
      },
    ];
  }
  if (timer.id === 'basic') {
    return [
      {
        title: "D'où ça vient",
        text: 'Le principe classique de la musculation et du street workout : tu fais ta série à ton rythme, puis tu lances un repos minuté quand toi, tu es prêt à repartir.',
      },
      {
        title: 'Pour quels sports',
        text: 'Idéal pour tout ce qui se compte en répétitions plutôt qu’en temps : tractions, dips, squats, développé couché, mouvements de force, drills de gymnastique ou d’arts martiaux. Le nombre de tours et la durée du repos restent entièrement ton choix.',
      },
      {
        title: 'Pourquoi ce format',
        text: "Rien ne te presse pendant l'effort — seul le repos est chronométré. C'est le format le plus proche d'une séance de musculation classique, juste débarrassé du chrono qu'il faut relancer soi-même entre deux séries.",
      },
    ];
  }
  if (timer.id === 'emom') {
    return [
      {
        title: "D'où ça vient",
        text: "Autre classique de l'entraînement fonctionnel : un nouvel effort démarre à chaque top, en général toutes les minutes — ce qu'il reste de temps une fois ta série finie devient ton repos.",
      },
      {
        title: 'Pour quels sports',
        text: 'Parfait pour du travail cadencé : kettlebell, burpees, sauts sur box, corde à sauter, sprints courts, ou des drills techniques qu’on veut répéter à intervalle régulier (frappes, passes, transitions). Fonctionne aussi à deux, en alternant les minutes.',
      },
      {
        title: 'Pourquoi ce format',
        text: "L'intervalle impose un rythme : finis vite, tu récupères plus longtemps ; traîne, et le repos disparaît. Un format qui apprend à doser son effort — la contrainte vient du chrono, pas de toi.",
      },
    ];
  }
  if (timer.id === 'tabata') {
    return [
      {
        title: "D'où ça vient",
        text: 'Nommé d’après une étude du Dr Izumi Tabata sur des patineurs de vitesse : de très courtes salves d’effort quasi maximal séparées d’un repos tout aussi court, répétées plusieurs fois. Le 20s/10s est le point de départ historique — les durées restent réglables ici.',
      },
      {
        title: 'Pour quels sports',
        text: 'Le format HIIT par excellence : sprints, vélo, rameur, boxe ou kickboxing au sac, circuits au poids du corps, mouvements explosifs. Changer d’exercice à chaque tour ou garder le même — les deux se valent.',
      },
      {
        title: 'Pourquoi ce format',
        text: "L'intensité prime sur la durée : des efforts courts mais quasi maximaux, avec juste assez de repos pour repartir. Il muscle la capacité à encaisser l'effort répété, pas la performance sur un seul essai.",
      },
    ];
  }
  if (timer.id === 'mix') {
    return [
      {
        title: "D'où ça vient",
        text: 'Aucune séance réelle ne suit un seul format du début à la fin : un échauffement, un bloc principal, une finition — MIX assemble plusieurs blocs AMRAP, EMOM, TABATA, BASIC ou repos dans l’ordre que tu veux.',
      },
      {
        title: 'Pour quels sports',
        text: "Utile pour reproduire la structure d'un vrai entraînement : un cours collectif, une séance de préparation physique, un circuit qui alterne cardio et renforcement, ou même un enchaînement multi-sports — rameur, puis haltères, puis gainage.",
      },
      {
        title: 'Pourquoi ce format',
        text: "Parce qu'une séance n'est presque jamais un seul bloc répété à l'identique. MIX te laisse construire exactement la structure que tu utilises déjà, sans jongler entre plusieurs chronomètres.",
      },
    ];
  }
  return [{ title: timer.name, text: timer.full }];
};
