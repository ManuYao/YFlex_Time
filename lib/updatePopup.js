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

/**
 * Dérive { id, mode } depuis les champs bruts de `useOtaUpdate()` — même
 * calcul utilisé par la feuille automatique (components/common/UpdateGate.js)
 * et par l'ouverture manuelle depuis Paramètres > À propos > Version
 * (app/settings.js). Centralisé ici pour que les deux ne divergent jamais :
 * avant, `settings.js` recalculait le même if/else à la main sans jamais
 * appeler `markUpdatePopupSeen` derrière — consulter la version depuis
 * Paramètres ne comptait donc pas comme "vue", et la feuille automatique
 * revenait quand même au lancement suivant, alors même que rien de nouveau
 * n'avait été publié.
 *
 * @returns {{ id: string, mode: 'pending' | 'info' } | null}
 */
export const resolveUpdateCandidate = ({ pending, updateId, runningUpdateId }) => {
  if (pending && updateId) return { id: updateId, mode: 'pending' };
  if (runningUpdateId) return { id: runningUpdateId, mode: 'info' };
  return null;
};
