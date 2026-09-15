import AsyncStorage from '@react-native-async-storage/async-storage';

// Mémorise l'updateId (UUID EAS Update) de la dernière feuille "Nouvelle
// version" déjà montrée automatiquement — pour ne la pousser qu'une fois par
// mise à jour réelle, pas à chaque retour au premier plan tant qu'elle
// n'a pas été redémarrée. Purgée par le reset complet de l'app
// (app/settings.js) : après un reset, l'utilisateur est retraité comme un
// nouvel install, donc une mise à jour déjà en attente peut réapparaître.
export const UPDATE_POPUP_SEEN_KEY = 'flexTimer_updatePopupSeen';

export const hasSeenUpdatePopup = async (updateId) => {
  if (!updateId) return true;
  try {
    const seen = await AsyncStorage.getItem(UPDATE_POPUP_SEEN_KEY);
    return seen === updateId;
  } catch {
    return true; // en cas de doute, ne pas imposer la feuille
  }
};

export const markUpdatePopupSeen = async (updateId) => {
  if (!updateId) return;
  try {
    await AsyncStorage.setItem(UPDATE_POPUP_SEEN_KEY, updateId);
  } catch {}
};
