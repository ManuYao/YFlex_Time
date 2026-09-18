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

export const CUSTOM_CATEGORIES_KEY = 'flexTimer_customCategories';

// Teintes proposées à la création d'une catégorie. Chaque entrée porte sa
// couleur pleine (chips actifs, pastilles) et sa version claire (texte sur
// fond translucide) : pas de calcul de luminosité à la volée, les valeurs
// sont choisies pour rester lisibles sur le fond noir de l'app.
export const CATEGORY_PALETTE = [
  { color: '#388EFF', text: '#8AC4FF' },
  { color: '#2ECC71', text: '#7EE0A5' },
  { color: '#FF8A3D', text: '#FFC09A' },
  { color: '#A78BFA', text: '#CDBDFF' },
  { color: '#F472B6', text: '#FBB6D6' },
  { color: '#22D3EE', text: '#94E7F5' },
  { color: '#FACC15', text: '#FDE68A' },
  { color: '#F87171', text: '#FCA5A5' },
];

// Groupe de repli : une étiquette dont la catégorie a été supprimée reste
// dans le planning, mais en gris neutre. Elle ne doit surtout pas hériter des
// couleurs de "PECS / TRICEPS" par accident (ancien comportement).
const FALLBACK_CATEGORY = {
  id: '_none',
  label: 'SANS GROUPE',
  color: '#9A9A9A',
  text: '#D6D6D6',
  exercises: [],
};

// Cache module : getCategory() est appelé en plein rendu (chips du planning,
// des archives, de la feuille de détail) et ne peut pas attendre
// AsyncStorage. La liste est hydratée au démarrage (app/_layout.js) puis à
// chaque écriture.
let customCategories = [];

export const loadCustomCategories = async () => {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    customCategories = Array.isArray(list) ? list : [];
  } catch {
    customCategories = [];
  }
  return customCategories;
};

export const getCustomCategories = () => customCategories;

export const getAllCategories = () => [...CATEGORIES, ...customCategories];

export const isCustomCategory = (id) => customCategories.some((c) => c.id === id);

export const getCategory = (id) =>
  CATEGORIES.find((c) => c.id === id) ||
  customCategories.find((c) => c.id === id) ||
  FALLBACK_CATEGORY;

const persistCategories = async (list) => {
  customCategories = list;
  try {
    await AsyncStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(list));
  } catch {}
  return list;
};

export const addCustomCategory = async ({ label, color, text }) => {
  const category = {
    id: `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    label: label.trim().toUpperCase(),
    color,
    text,
    exercises: [],
    custom: true,
  };
  await persistCategories([...customCategories, category]);
  return category;
};

export const updateCustomCategory = (id, patch) =>
  persistCategories(
    customCategories.map((c) =>
      c.id === id
        ? { ...c, ...patch, label: (patch.label ?? c.label).trim().toUpperCase() }
        : c
    )
  );

/**
 * Suppression définitive : la catégorie disparaît de la bibliothèque et ses
 * exercices personnalisés avec elle (ils n'auraient plus de rayon où vivre).
 * Les étiquettes déjà posées dans le planning ne sont PAS touchées — elles
 * basculent simplement sur le gris de FALLBACK_CATEGORY.
 */
export const removeCustomCategory = async (id) => {
  const list = await persistCategories(customCategories.filter((c) => c.id !== id));
  const exercises = await loadCustomExercises();
  const kept = exercises.filter((e) => e.category !== id);
  if (kept.length !== exercises.length) {
    try {
      await AsyncStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(kept));
    } catch {}
  }
  return list;
};

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

// Contrairement aux étiquettes posées dans le planning (rattachées à un jour
// précis, avec charge/séries/repos), un exercice ici n'est qu'une entrée de
// bibliothèque — le retirer n'affecte aucune séance déjà planifiée. Identifié
// par (label, category) plutôt qu'un id : addCustomExercise n'en génère pas.
export const removeCustomExercise = async ({ label, category }) => {
  const list = await loadCustomExercises();
  const next = list.filter((e) => !(e.label === label && e.category === category));
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

// ---------------------------------------------------------------------------
// Présélection du rayon de la bibliothèque depuis le nom d'un bloc

// Le nom d'un bloc est du texte libre ("jambes + fessiers", "Dos / biceps"),
// jamais un id de groupe : on compare des MOTS ENTIERS, sans casse, accents
// ni ponctuation. Surtout pas d'includes() sur la chaîne brute : "abdos"
// contient "dos", et tout bloc d'abdos partirait dans le rayon du dos.
const toWords = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

// Mots-outils qu'un libellé de groupe perso peut contenir ("Haut du corps") :
// ils ne doivent jamais devenir des mots-clés, sinon "Jour du repos" tomberait
// dans ce groupe à cause de "du".
const STOP_WORDS = new Set([
  'de', 'du', 'des', 'le', 'la', 'les', 'et', 'ou', 'un', 'une',
  'au', 'aux', 'en', 'sur', 'pour', 'avec', 'par', 'dans',
  'mon', 'ma', 'mes', 'ce', 'cet', 'cette',
]);

// Vocabulaire courant en plus des libellés, pour les six groupes d'origine
// seulement (un groupe perso n'est connu que par son nom). Français
// uniquement, et rien que des noms de muscles : un nom d'exercice ("squat",
// "tractions") sollicite souvent plusieurs groupes et ferait plus de
// mauvaises pioches que de bonnes. "bras" est exclu pour la même raison
// (biceps → dos, triceps → pecs).
const SYNONYMS = {
  pecs: ['pectoraux', 'pectoral', 'poitrine', 'tricep'],
  dos: ['dorsaux', 'dorsal', 'lombaires', 'lombaire', 'trapezes', 'trapeze', 'bicep'],
  jambes: [
    'jambe', 'cuisses', 'cuisse', 'quadriceps', 'quadris', 'ischios',
    'fessiers', 'fessier', 'mollets', 'mollet',
  ],
  epaules: ['epaule', 'deltoides', 'deltoide'],
  abdos: ['abdo', 'abdominaux', 'obliques', 'sangle', 'ceinture'],
  cardio: ['course', 'courir', 'velo', 'endurance', 'footing'],
};

const categoryKeywords = (cat) => {
  const set = new Set(toWords(cat.label).filter((w) => w.length > 1 && !STOP_WORDS.has(w)));
  (SYNONYMS[cat.id] || []).forEach((w) => set.add(w));
  return set;
};

/**
 * Groupe musculaire déduit du nom d'un bloc, ou null si aucun mot ne
 * correspond — la bibliothèque garde alors son rayon par défaut. Mieux vaut
 * ne rien présélectionner que présélectionner de travers : l'utilisateur
 * croirait être au bon rayon. Le premier mot du nom qui correspond l'emporte
 * ("Pecs / dos" → pecs) ; pour un même mot, les groupes d'origine sont testés
 * avant les groupes perso (ordre de getAllCategories()).
 */
export const guessCategoryFromName = (name) => {
  const tokens = toWords(name);
  if (!tokens.length) return null;
  const candidates = getAllCategories().map((cat) => [cat.id, categoryKeywords(cat)]);
  for (const token of tokens) {
    const hit = candidates.find(([, keywords]) => keywords.has(token));
    if (hit) return hit[0];
  }
  return null;
};
