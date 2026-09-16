import AsyncStorage from '@react-native-async-storage/async-storage';

export const CONTACT_NOTICE_KEY = 'flexTimer_contactNoticeHidden';

// « Ne plus afficher ce message » : une fois coché, le bouton Contact ouvre
// directement le mail. Purgé par la réinitialisation de l'app (settings.js).
export const loadContactNoticeHidden = async () => {
  try {
    return (await AsyncStorage.getItem(CONTACT_NOTICE_KEY)) === '1';
  } catch {
    return false;
  }
};

export const setContactNoticeHidden = async (hidden) => {
  try {
    if (hidden) await AsyncStorage.setItem(CONTACT_NOTICE_KEY, '1');
    else await AsyncStorage.removeItem(CONTACT_NOTICE_KEY);
  } catch {}
};
