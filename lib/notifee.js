// Chargement protege de @notifee/react-native.
//
// La lib jette des l'import quand son module natif est absent : Expo Go, ou
// un APK construit avant qu'elle ne soit ajoutee. Importee directement, elle
// faisait planter l'app au demarrage (ecran rouge "Notifee native module not
// found") avant meme le premier rendu — alors que tout ce qui ne depend pas
// d'elle (sons, chrono a l'ecran, reglages, historique) fonctionne tres bien
// sans. Chaque appelant passe donc par ici et verifie `hasNotifee()` ; sans
// module natif, les fonctionnalites de notification deviennent no-op,
// exactement comme sur iOS.
let notifee = null;
let constants = {};

try {
  const mod = require('@notifee/react-native');
  notifee = mod.default ?? null;
  constants = mod;
} catch {
  notifee = null;
}

export const hasNotifee = () => !!notifee;

export const {
  AndroidForegroundServiceType = {},
  AndroidImportance = {},
  AndroidVisibility = {},
  AuthorizationStatus = {},
  EventType = {},
} = constants;

export default notifee;
