import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Petites bulles d'explication du menu (hub) : la première fois qu'on l'ouvre,
 * une bulle par entrée (Mix, Historique, Planning, Jeux) dit en une phrase à quoi
 * elle sert. Même famille que lib/seasonNudge.js (état « déjà vues » mémorisé).
 */
export const HUB_TIPS_KEY = 'flexTimer_hubTips';

// TEMP (test de l'utilisateur, 03/11/2026) : tant qu'il n'a pas demandé de
// l'enlever, les bulles reviennent à CHAQUE ouverture du menu. Pour revenir au
// comportement final (une seule fois), passer à false.
export const HUB_TIPS_ALWAYS = true;

export const loadHubTipsSeen = async () => {
  try {
    const raw = await AsyncStorage.getItem(HUB_TIPS_KEY);
    return raw ? JSON.parse(raw)?.seen === true : false;
  } catch {
    return false;
  }
};

export const markHubTipsSeen = async () => {
  try {
    await AsyncStorage.setItem(HUB_TIPS_KEY, JSON.stringify({ seen: true, at: Date.now() }));
  } catch {}
};

/** Pure — true si les bulles doivent s'afficher à cette ouverture du menu. */
export const shouldShowHubTips = ({ seen, always = HUB_TIPS_ALWAYS }) => always || !seen;

// Une entrée par porte du menu, dans l'ordre où elles sont à l'écran. Phrases
// courtes : on explique, on ne fait pas un cours. Rien sur Premium : la
// personne le découvrira d'elle-même.
export const HUB_TIPS = [
  {
    id: 'mix',
    icon: 'mix',
    title: 'Mix et Partage',
    text: 'Compose tes propres séances en enchaînant les chronos, puis partage-les avec tes amis.',
  },
  {
    id: 'history',
    icon: 'history',
    title: 'Historique',
    text: 'Toutes tes séances et tes stats, jour par jour, avec ton temps total et ta série.',
  },
  {
    id: 'planning',
    icon: 'calendar',
    title: 'Planning',
    text: 'Crée ton planning comme tu veux, et lance tes mix directement depuis ton planning.',
  },
  {
    id: 'games',
    icon: 'puzzle',
    title: 'Jeux',
    text: 'Plein de jeux pour se muscler en s’amusant, seul ou entre amis.',
  },
];
