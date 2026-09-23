// Page "chrono fiable à 100 %" (components/common/PermissionPrimer.js),
// montrée AVANT toute fenêtre système. Android n'affiche sa demande de
// notifications que deux fois dans la vie de l'app : on ne la déclenche
// qu'après un "Activer" sur notre page, un "Plus tard" ne grille rien.
//
// Deux moments, une fois chacun :
//   - 'onboarding'   : fin du tutoriel.
//   - 'firstSession' : lancement d'une séance, si les notifications ne sont
//                      toujours pas activées. Jamais dans le même lancement
//                      de l'app que la page du tutoriel : deux fois la même
//                      page à une minute d'écart, c'est du harcèlement.
import { Platform, PermissionsAndroid } from 'react-native';
import { storage } from './storage';
import { hasNotifee } from './notifee';
import {
  isNotificationPermissionGranted,
  openNotificationSettings,
  markNotificationPromptShown,
} from './notificationPrompt';
import { isBatteryOptimizationEnabled, markBatteryPromptSeen } from './batteryOptimization';

const IS_ANDROID = Platform.OS === 'android';
export const PERMISSION_PRIMER_KEY = 'flexTimer_permissionPrimerSeen';

// Sous ce délai, la réponse "ne plus demander" n'a pas pu venir d'un doigt :
// Android a répondu seul, sans fenêtre (refus définitif déjà enregistré).
const INSTANT_ANSWER_MS = 350;

let shownThisRun = false;

export async function getPermissionStatus() {
  const [notifications, batteryOptimized] = await Promise.all([
    isNotificationPermissionGranted(),
    isBatteryOptimizationEnabled(),
  ]);
  return { notifications, battery: !batteryOptimized };
}

export async function shouldShowPermissionPrimer(moment) {
  if (!IS_ANDROID || !hasNotifee()) return false;
  if (moment === 'firstSession' && shownThisRun) return false;
  const seen = (await storage.get(PERMISSION_PRIMER_KEY)) || {};
  if (seen[moment]) return false;
  const status = await getPermissionStatus();
  // Au tutoriel c'est le moment "installation" : on montre la page s'il
  // manque quoi que ce soit. Avant une séance, seulement si l'essentiel
  // (les notifications) manque — la batterie seule ne vaut pas une coupure.
  if (moment === 'onboarding') return !status.notifications || !status.battery;
  return !status.notifications;
}

export async function markPermissionPrimerShown(moment) {
  shownThisRun = true;
  const seen = (await storage.get(PERMISSION_PRIMER_KEY)) || {};
  await storage.set(PERMISSION_PRIMER_KEY, { ...seen, [moment]: Date.now() });
  // La page couvre déjà ces deux rappels : sans ça, quelqu'un qui dit
  // "Plus tard" avant sa séance se ferait relancer en fin de séance.
  await markNotificationPromptShown();
  await markBatteryPromptSeen();
}

// 'granted' | 'denied' | 'settings' (réglages système ouverts)
export async function requestNotificationPermission() {
  if (!IS_ANDROID) return 'granted';
  // Avant Android 13, les notifications ne se demandent pas : si elles sont
  // coupées, c'est que l'utilisateur l'a fait lui-même dans les réglages.
  if (Platform.Version < 33) {
    await openNotificationSettings();
    return 'settings';
  }
  const startedAt = Date.now();
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
    if (
      result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN &&
      Date.now() - startedAt < INSTANT_ANSWER_MS
    ) {
      // Refus définitif enregistré avant : seuls les réglages peuvent
      // encore changer ça. Un refus qu'il vient de donner, lui, est respecté.
      await openNotificationSettings();
      return 'settings';
    }
    return 'denied';
  } catch {
    return 'denied';
  }
}
