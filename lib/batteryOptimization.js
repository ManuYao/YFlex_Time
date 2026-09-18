// Exclusion de l'optimisation batterie Android. Le service de premier plan
// (lib/timerNotification.js) suffit dans la grande majorité des cas ; cette
// exclusion est la ceinture en plus pour les constructeurs agressifs
// (Xiaomi, Huawei, Samsung en mode économie) qui tuent quand même le
// processus. Jamais imposée : on le propose une seule fois, et la ligne
// Paramètres > Timers reste disponible ensuite.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';

const IS_ANDROID = Platform.OS === 'android';
export const BATTERY_PROMPT_KEY = 'flexTimer_batteryPromptSeen';

export async function isBatteryOptimizationEnabled() {
  if (!IS_ANDROID) return false;
  try {
    return await notifee.isBatteryOptimizationEnabled();
  } catch {
    return false;
  }
}

export async function openBatteryOptimizationSettings() {
  if (!IS_ANDROID) return;
  try {
    await notifee.openBatteryOptimizationSettings();
  } catch {}
}

export async function shouldPromptBatteryOptimization() {
  if (!IS_ANDROID) return false;
  try {
    if (await AsyncStorage.getItem(BATTERY_PROMPT_KEY)) return false;
  } catch {
    return false;
  }
  return isBatteryOptimizationEnabled();
}

export async function markBatteryPromptSeen() {
  try {
    await AsyncStorage.setItem(BATTERY_PROMPT_KEY, '1');
  } catch {}
}
