import AsyncStorage from '@react-native-async-storage/async-storage';

export const SCROLL_HINT_KEY = 'flexTimer_scrollHintNextCard';

// Index (0-2) de la carte par laquelle l'aperçu "glisse vers le planning"
// reprendra à la prochaine ouverture de l'Historique. Une interruption par
// l'utilisateur avance d'une carte, une séquence complète revient à 0.
export const loadScrollHintNextCard = async () => {
  try {
    const raw = await AsyncStorage.getItem(SCROLL_HINT_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isInteger(n) && n >= 0 && n < 3 ? n : 0;
  } catch {
    return 0;
  }
};

export const saveScrollHintNextCard = async (n) => {
  try {
    await AsyncStorage.setItem(SCROLL_HINT_KEY, String(n));
  } catch {}
};
