// État vivant de la politique d'orientation (components/common/OrientationGate.js) et
// réglage de TEST « ne jamais verrouiller l'orientation » (Paramètres › Mémoire).
//
// Pourquoi : en fenêtre flottante Samsung (« pop-up view »), des testeurs n'arrivent pas
// à rétrécir la LARGEUR (ni en diagonale) alors que l'appli concurrente SmartWOD, si.
// Le manifeste de l'APK 18.15.0 est correct (fenêtre redimensionnable, plancher 200 x 120,
// plus de verrou portrait au manifeste). Reste une hypothèse : le verrou portrait posé à
// chaud par OrientationGate quand la fenêtre est presque aussi grande que l'écran. Le
// réglage de test le coupe entièrement ; si la largeur devient alors ajustable, c'est lui
// le coupable. Aucun APK nécessaire (tout est en JavaScript).
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEST_KEY = 'flexTimer_orientationTest';

// wanted  : ce que la politique veut ('portrait' | 'free')
// applied : ce qui a vraiment été demandé à Android (même valeurs), null tant que rien
// testNoLock : réglage de test (verrou coupé, la politique répond toujours 'free')
let state = { wanted: null, applied: null, testNoLock: false };
let loaded = false;
const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(state); } catch {}
  });
};

export const getOrientationState = () => state;

export const subscribeOrientationState = (fn) => {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
};

export const setOrientationState = (patch) => {
  const next = { ...state, ...patch };
  if (next.wanted === state.wanted && next.applied === state.applied && next.testNoLock === state.testNoLock) return;
  state = next;
  notify();
};

export async function loadOrientationTest() {
  if (loaded) return state.testNoLock;
  loaded = true;
  try {
    const on = (await AsyncStorage.getItem(TEST_KEY)) === '1';
    setOrientationState({ testNoLock: on });
  } catch {}
  return state.testNoLock;
}

export function setOrientationTest(on) {
  loaded = true;
  setOrientationState({ testNoLock: !!on });
  AsyncStorage.setItem(TEST_KEY, on ? '1' : '0').catch(() => {});
}
