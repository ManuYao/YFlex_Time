// Rappel mensuel (Android) pour activer les notifications, tant que ce n'est
// pas fait — sans lui, la notification de chrono en arrière-plan
// (lib/timerNotification.js) échoue en silence, l'utilisateur ne sait
// jamais pourquoi. La demande système (notifee.requestPermission()) ne
// s'affiche qu'une fois dans la vie de l'app (Android le garantit) ; ce
// rappel est le seul moyen de faire changer d'avis quelqu'un qui a refusé,
// ou de relancer quelqu'un qui n'a simplement jamais eu l'occasion de
// répondre. Une fois par mois : demandé par l'utilisateur, "3 fois réparti
// sur 3 mois" jugé trop envahissant après réflexion, "une fois par mois"
// retenu à la place, sans limite de nombre de fois tant que la permission
// n'est pas accordée.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AuthorizationStatus } from '@notifee/react-native';

const IS_ANDROID = Platform.OS === 'android';
export const NOTIFICATION_PROMPT_KEY = 'flexTimer_notificationPromptLastShown';
const PROMPT_EVERY_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export async function isNotificationPermissionGranted() {
  if (!IS_ANDROID) return true;
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
  } catch {
    return true; // en cas de doute, ne pas harceler
  }
}

export async function shouldPromptNotificationPermission() {
  if (!IS_ANDROID) return false;
  if (await isNotificationPermissionGranted()) return false;
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_PROMPT_KEY);
    const last = raw ? Number(raw) : 0;
    return !last || Date.now() - last >= PROMPT_EVERY_MS;
  } catch {
    return false;
  }
}

export async function markNotificationPromptShown() {
  try {
    await AsyncStorage.setItem(NOTIFICATION_PROMPT_KEY, String(Date.now()));
  } catch {}
}

// Toujours vers les réglages système, jamais un nouveau requestPermission() :
// après un premier refus (à l'onboarding ou avant), Android ne réaffiche
// plus jamais le dialogue système — seuls les réglages de l'app permettent
// de revenir en arrière. Marche aussi pour quelqu'un qui n'a jamais répondu.
export async function openNotificationSettings() {
  if (!IS_ANDROID) return;
  try {
    await notifee.openNotificationSettings();
  } catch {}
}
