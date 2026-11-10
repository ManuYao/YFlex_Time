import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Petit tutoriel du MIX : s'ouvre UNE fois, la première fois qu'on arrive dans le
 * constructeur (là où on compose et où l'on lance un MIX), puis seulement à la
 * demande (Paramètres › Tutoriel › « Le constructeur MIX »).
 *
 * État mémorisé : `flexTimer_mixTutorialSeen` (purgé par le reset complet des
 * Paramètres, comme `flexTimer_hubTips`). Même famille que lib/hubTips.js.
 */
export const MIX_TUTORIAL_KEY = 'flexTimer_mixTutorialSeen';

export const loadMixTutorialSeen = async () => {
  try {
    const raw = await AsyncStorage.getItem(MIX_TUTORIAL_KEY);
    return raw ? JSON.parse(raw)?.seen === true : false;
  } catch {
    return false;
  }
};

export const markMixTutorialSeen = async () => {
  try {
    await AsyncStorage.setItem(MIX_TUTORIAL_KEY, JSON.stringify({ seen: true, at: Date.now() }));
  } catch {}
};

/** Pur : vrai si le tutoriel doit s'ouvrir tout seul (jamais vu, ni demandé à la main). */
export const shouldShowMixTutorial = ({ seen, forced = false }) => forced || !seen;

// Quatre écrans, dans l'ordre où on en a besoin. Phrases courtes, mots simples.
export const MIX_TUTORIAL_STEPS = [
  {
    id: 'blocks',
    icon: 'blocks',
    title: 'Des blocs à la suite',
    text: 'Un MIX est une séance faite de blocs : AMRAP, EMOM, TABATA ou BASIC. Ajoute-les, règle chacun, puis maintiens un bloc pour le déplacer.',
  },
  {
    id: 'rest',
    icon: 'rest',
    title: 'Les repos, ta passerelle',
    text: 'Glisse un bloc Repos entre deux exercices : le temps de souffler ou de changer de machine. « Repos auto » en pose un partout d’un coup.',
  },
  {
    id: 'kg',
    icon: 'dumbbell',
    title: 'Tes kg en séance',
    text: 'Quand un exercice a une charge, une bulle apparaît à droite des commandes : touche-la pour noter tes kg, sans arrêter le chrono.',
  },
  {
    id: 'reorder',
    icon: 'move',
    title: 'Machine prise ?',
    text: 'Pendant un repos, maintiens l’anneau : tu peux faire un exercice à venir tout de suite, ou le reporter à la fin. Ceux déjà faits ne bougent pas.',
  },
];
