import AsyncStorage from '@react-native-async-storage/async-storage';

// Mémorise l'updateId (UUID EAS Update) de la dernière feuille "Nouvelle
// version" déjà montrée automatiquement — pour ne la pousser qu'une fois par
// mise à jour réelle, pas à chaque retour au premier plan tant qu'elle
// n'a pas été redémarrée. Purgée par le reset complet de l'app
// (app/settings.js) : après un reset, l'utilisateur est retraité comme un
// nouvel install, donc une mise à jour déjà en attente peut réapparaître.
export const UPDATE_POPUP_SEEN_KEY = 'flexTimer_updatePopupSeen';

// Suivi PAR MODE, pas un seul id (corrigé le 22/09/2026). Une même mise à
// jour traverse deux étapes distinctes — 'pending' (téléchargée, contenu
// pas encore lisible puisque son propre JS n'a pas tourné) puis 'info'
// (rebootée, contenu enfin exact) — et marquer l'étape pending comme "vue"
// ne doit PAS escamoter l'étape info : c'est pourtant ce que faisait
// l'ancien format à clé unique. Conséquence concrète constatée par
// l'utilisateur : après avoir tapé "Redémarrer maintenant", il ne voyait
// jamais la vraie fenêtre "Quoi de neuf" au relancement suivant — elle était
// déjà comptée comme vue par la case pending. Stocké en JSON
// { pending: id, info: id }.
const readSeenMap = async () => {
  const raw = await AsyncStorage.getItem(UPDATE_POPUP_SEEN_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    // Ancien format : une simple string, l'updateId marqué vu sans
    // distinction d'étape. Migrée en "vu en pending" UNIQUEMENT — jamais en
    // "vu en info" — pour que la fenêtre "Quoi de neuf" s'affiche enfin une
    // fois avec le contenu exact, même pour une mise à jour déjà redémarrée
    // sous l'ancien système.
  }
  return { pending: raw };
};

export const hasSeenUpdatePopup = async (updateId, mode) => {
  if (!updateId) return true;
  try {
    const seen = await readSeenMap();
    return seen[mode] === updateId;
  } catch {
    return true; // en cas de doute, ne pas imposer la feuille
  }
};

export const markUpdatePopupSeen = async (updateId, mode) => {
  if (!updateId) return;
  try {
    const seen = await readSeenMap();
    seen[mode] = updateId;
    await AsyncStorage.setItem(UPDATE_POPUP_SEEN_KEY, JSON.stringify(seen));
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
