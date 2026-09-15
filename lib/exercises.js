import AsyncStorage from '@react-native-async-storage/async-storage';

// Bibliothèque d'exercices proposée dans le planning. Les couleurs ne
// reprennent pas celles des modes de chrono (timers-config.js) : ici elles
// codent un groupe musculaire, pas un mode, et les deux ne cohabitent jamais
// sur le même écran.
export const CATEGORIES = [
  {
    id: 'pecs',
    label: 'PECS / TRICEPS',
    color: '#388EFF',
    text: '#8AC4FF',
    exercises: [
      'Développé couché',
      'Développé incliné',
      'Développé haltères',
      'Écarté poulie',
      'Pompes',
      'Dips',
      'Poulie triceps',
      'Barre au front',
      'Extension nuque',
    ],
  },
  {
    id: 'dos',
    label: 'DOS / BICEPS',
    color: '#2ECC71',
    text: '#7EE0A5',
    exercises: [
      'Tirage vertical',
      'Tirage horizontal',
      'Rowing barre',
      'Rowing haltère',
      'Tractions',
      'Soulevé de terre',
      'Curl barre',
      'Curl haltères',
      'Curl marteau',
    ],
  },
  {
    id: 'jambes',
    label: 'JAMBES',
    color: '#FF8A3D',
    text: '#FFC09A',
    exercises: [
      'Squat',
      'Presse à cuisses',
      'Fentes',
      'Leg extension',
      'Leg curl',
      'Soulevé de terre jambes tendues',
      'Hip thrust',
      'Mollets debout',
    ],
  },
  {
    id: 'epaules',
    label: 'ÉPAULES',
    color: '#A78BFA',
    text: '#CDBDFF',
    exercises: [
      'Développé militaire',
      'Développé Arnold',
      'Élévations latérales',
      'Élévations frontales',
      'Oiseau',
      'Rowing menton',
      'Face pull',
    ],
  },
  {
    id: 'abdos',
    label: 'ABDOS / GAINAGE',
    color: '#F472B6',
    text: '#FBB6D6',
    exercises: [
      'Crunch',
      'Gainage',
      'Gainage latéral',
      'Relevé de jambes',
      'Russian twist',
      'Roulette abdos',
      'Mountain climber',
    ],
  },
  {
    id: 'cardio',
    label: 'CARDIO',
    color: '#22D3EE',
    text: '#94E7F5',
    exercises: [
      'Course',
      'Tapis',
      'Vélo',
      'Rameur',
      'Elliptique',
      'Corde à sauter',
      'Burpees',
    ],
  },
];

export const getCategory = (id) =>
  CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

export const CUSTOM_EXERCISES_KEY = 'flexTimer_customExercises';

// Les exercices créés à la main rejoignent la bibliothèque : sans ça il
// faudrait les retaper à chaque bloc, toutes les semaines.
export const loadCustomExercises = async () => {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_EXERCISES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const addCustomExercise = async ({ label, category }) => {
  const list = await loadCustomExercises();
  const known = [
    ...getCategory(category).exercises,
    ...list.filter((e) => e.category === category).map((e) => e.label),
  ];
  const duplicate = known.some((x) => x.toLowerCase() === label.toLowerCase());
  const next = duplicate ? list : [...list, { label, category }];
  try {
    await AsyncStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(next));
  } catch {}
  return next;
};

// Teintes dérivées de la couleur de base : le fond et la bordure des chips
// sont la même couleur à faible opacité, comme sur les cards translucides du
// reste de l'app. Suffixes hexa = canal alpha (0x24 ≈ 14 %, 0x47 ≈ 28 %).
export const categoryChip = (id, dimmed = false) => {
  const cat = getCategory(id);
  return dimmed
    ? { bg: `${cat.color}14`, border: `${cat.color}29`, text: `${cat.text}B3` }
    : { bg: `${cat.color}24`, border: `${cat.color}47`, text: cat.text };
};
