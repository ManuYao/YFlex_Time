import AsyncStorage from '@react-native-async-storage/async-storage';

export const LEGAL_CONSENT_KEY = 'flexTimer_legalAccepted';

// Version du texte accepté, pas un simple booléen : si les conditions
// changent un jour (nouvelle fonction, nouvelle formulation juridique), il
// suffit d'incrémenter ce numéro pour que tout le monde relise et réaccepte,
// sans avoir à inventer une nouvelle clé de stockage. Purgée par le reset
// complet (app/settings.js) : après réinitialisation, on repart de zéro.
export const LEGAL_CONSENT_VERSION = '1';

export const loadLegalAccepted = async () => {
  try {
    return (await AsyncStorage.getItem(LEGAL_CONSENT_KEY)) === LEGAL_CONSENT_VERSION;
  } catch {
    // En cas de doute (stockage illisible), on redemande : mieux vaut une
    // relecture de trop qu'une validation juridique jamais obtenue.
    return false;
  }
};

export const setLegalAccepted = async () => {
  try {
    await AsyncStorage.setItem(LEGAL_CONSENT_KEY, LEGAL_CONSENT_VERSION);
  } catch {}
};
