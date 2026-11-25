// État vivant de la politique d'orientation (components/common/OrientationGate.js) et
// réglage de TEST du verrou (Paramètres › Mémoire).
//
// Pourquoi : en fenêtre flottante Samsung (« pop-up view », glisser-déposer), la pop-up de
// notre app s'ouvre GRANDE et en forme de portrait, et se redimensionne mal, alors que
// SmartWOD (React Native aussi) s'ouvre petite et se redimensionne dans tous les sens.
// Le manifeste de SmartWOD ne déclare RIEN pour sa fenêtre (ni taille minimale, ni taille
// de départ, ni orientation) et son code ne verrouille jamais l'orientation (analyse du
// 21/11/2026). Le nôtre déclare en plus une taille minimale (<layout>), un drapeau
// « redimensionnable » explicite, et verrouille le portrait à chaud quand la fenêtre est
// presque aussi grande que l'écran (OrientationGate). Les trois modes ci-dessous testent le
// verrou sans nouvel APK (tout est en JavaScript) :
//   'normal' : comme avant (portrait verrouillé en plein écran, libre dans une fenêtre réduite)
//   'soft'   : « verrou souple » = SCREEN_ORIENTATION_LOCKED : l'app ne tourne pas avec le
//              téléphone mais n'impose pas la forme portrait à la fenêtre
//   'none'   : aucun verrou (SmartWOD) : l'app peut tourner si la rotation auto est active
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEST_KEY = 'flexTimer_orientationTest';

export const ORIENTATION_TEST_MODES = ['normal', 'soft', 'none'];

// wanted  : ce que la politique veut ('portrait' | 'free' | 'soft')
// applied : ce qui a vraiment été demandé à Android (mêmes valeurs), null tant que rien
// testMode : réglage de test ('normal' | 'soft' | 'none')
let state = { wanted: null, applied: null, testMode: 'normal' };
let loaded = false;
const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(state); } catch {}
  });
};

// '1' = ancien réglage « verrou coupé » (18.16.2) → 'none'.
const parseMode = (raw) => (raw === 'soft' ? 'soft' : raw === 'none' || raw === '1' ? 'none' : 'normal');

export const getOrientationState = () => state;

export const subscribeOrientationState = (fn) => {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
};

export const setOrientationState = (patch) => {
  const next = { ...state, ...patch };
  if (next.wanted === state.wanted && next.applied === state.applied && next.testMode === state.testMode) return;
  state = next;
  notify();
};

export async function loadOrientationTest() {
  if (loaded) return state.testMode;
  loaded = true;
  try {
    setOrientationState({ testMode: parseMode(await AsyncStorage.getItem(TEST_KEY)) });
  } catch {}
  return state.testMode;
}

export function setOrientationTest(mode) {
  loaded = true;
  const next = parseMode(mode);
  setOrientationState({ testMode: next });
  AsyncStorage.setItem(TEST_KEY, next).catch(() => {});
}
