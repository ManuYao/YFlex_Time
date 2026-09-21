import * as Haptics from 'expo-haptics';

let vibrateEnabled = true;
// 'light' | 'medium' | 'strong' — reglage Parametres. expo-haptics n'expose
// pas d'amplitude libre, seulement trois styles d'impact : l'intensite se
// traduit donc en decalage sur cette echelle plutot qu'en pourcentage.
let strength = 'medium';

const STYLES = ['light', 'medium', 'heavy'];
const SHIFT = { light: -1, medium: 0, strong: 1 };

const scaled = (base) => {
  const i = STYLES.indexOf(base) + (SHIFT[strength] ?? 0);
  return STYLES[Math.max(0, Math.min(STYLES.length - 1, i))];
};

const IMPACT = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

export const setHapticEnabled = (v) => {
  vibrateEnabled = !!v;
};

export const setHapticStrength = (v) => {
  if (SHIFT[v] !== undefined) strength = v;
};

const safe = (fn) => {
  if (!vibrateEnabled) return Promise.resolve();
  return fn().catch(() => {});
};

const impact = (base) => safe(() => Haptics.impactAsync(IMPACT[scaled(base)]));

export const haptic = {
  light: () => impact('light'),
  medium: () => impact('medium'),
  heavy: () => impact('heavy'),
  // selectionAsync n'a pas de variante d'intensite : en mode fort on retombe
  // sur un impact leger, nettement plus perceptible que le tick de selection.
  selection: () =>
    strength === 'strong'
      ? impact('light')
      : safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export function useHaptic() {
  return haptic;
}
