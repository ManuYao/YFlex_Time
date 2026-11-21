import { useEffect, useRef, useState } from 'react';
import { Dimensions, PixelRatio, Platform } from 'react-native';
import { useWindowSize } from '../../lib/responsive';
import { orientationPolicy } from '../../lib/orientationPolicy';
import {
  getOrientationState,
  loadOrientationTest,
  setOrientationState,
  subscribeOrientationState,
} from '../../lib/orientationState';
import { logWindow } from '../../lib/windowLog';

// Applique la politique d'orientation (lib/orientationPolicy.js) : portrait verrouillé en
// plein écran, rotation libre dans une fenêtre réduite (fenêtre flottante Samsung, écran
// partagé). Ne rend rien. Le réglage de TEST (Paramètres › Mémoire, lib/orientationState.js)
// peut remplacer cette politique par un verrou « souple » ou par aucun verrou.
//
// IMPORTANT — module natif optionnel : expo-screen-orientation n'existe que dans les APK
// construits depuis la 18.15.0. Les mises à jour à distance (OTA) arrivent aussi sur les
// anciens APK, où l'import lèverait une erreur au chargement et ferait planter le
// démarrage. D'où le require protégé : sans le module, ce composant ne fait rien et
// l'app se comporte exactement comme avant (le verrou portrait vient alors du manifeste).
let ScreenOrientation = null;
try {
  // eslint-disable-next-line global-require
  ScreenOrientation = require('expo-screen-orientation');
} catch (e) {
  ScreenOrientation = null;
}

// Attente après le dernier changement de taille : pendant qu'on tire sur un bord de la
// fenêtre, la taille change à chaque pas ; on ne touche à l'orientation qu'une fois la
// taille posée (et seulement si le mode a vraiment changé).
const SETTLE_MS = 300;

// ActivityInfo.SCREEN_ORIENTATION_LOCKED : « reste dans l'orientation actuelle, quelle
// qu'elle soit ». Contrairement à PORTRAIT, il n'impose aucune forme à la fenêtre.
const SCREEN_ORIENTATION_LOCKED = 14;

const LABELS = { portrait: 'portrait', free: 'libre', soft: 'souple' };
const r = (n) => Math.round(n);

// Un verrou « souple » demandé sans lockPlatformAsync (module trop ancien) retombe sur le portrait.
const effectiveMode = (mode) =>
  mode === 'soft' && !(ScreenOrientation && typeof ScreenOrientation.lockPlatformAsync === 'function') ? 'portrait' : mode;

const applyMode = (mode) => {
  if (mode === 'free') return ScreenOrientation.unlockAsync();
  if (mode === 'soft') {
    return ScreenOrientation.lockPlatformAsync({ screenOrientationConstantAndroid: SCREEN_ORIENTATION_LOCKED });
  }
  return ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
};

export default function OrientationGate() {
  const { width, height } = useWindowSize();
  const appliedRef = useRef(null);
  // Réglage de TEST (Paramètres › Mémoire) : 'normal' | 'soft' | 'none'.
  const [testMode, setTestMode] = useState(getOrientationState().testMode);

  useEffect(() => {
    loadOrientationTest();
    const win = Dimensions.get('window');
    const screen = Dimensions.get('screen');
    logWindow(
      'ouverture',
      `fenêtre ${r(win.width)}×${r(win.height)} · écran ${r(screen.width)}×${r(screen.height)} · densité ${PixelRatio.get().toFixed(2)} · police ×${PixelRatio.getFontScale().toFixed(2)} · Android ${Platform.Version} · verrou possible : ${ScreenOrientation ? 'oui' : 'non (module absent)'}`
    );
    return subscribeOrientationState((s) => setTestMode(s.testMode));
  }, []);

  useEffect(() => {
    const screen = Dimensions.get('screen');
    const policy = orientationPolicy({ width, height }, { width: screen.width, height: screen.height });
    const wanted = effectiveMode(testMode === 'none' ? 'free' : testMode === 'soft' ? 'soft' : policy);
    setOrientationState({ wanted });
    logWindow(
      'taille',
      `vue ${r(width)}×${r(height)} · écran ${r(screen.width)}×${r(screen.height)} · verrou voulu ${LABELS[wanted]}${testMode !== 'normal' ? ' (test)' : ''}`
    );
    if (!ScreenOrientation) return undefined;
    if (wanted === appliedRef.current) return undefined;
    const timer = setTimeout(() => {
      const before = appliedRef.current;
      appliedRef.current = wanted;
      try {
        const done = applyMode(wanted);
        if (done && typeof done.catch === 'function') {
          done.catch((e) => logWindow('échec', `verrou ${LABELS[wanted]} refusé : ${String((e && e.message) || e)}`));
        }
      } catch (e) {
        // Jamais bloquant : au pire, l'orientation reste comme elle est.
        logWindow('échec', `verrou ${LABELS[wanted]} refusé : ${String((e && e.message) || e)}`);
      }
      setOrientationState({ applied: wanted });
      logWindow('verrou', `${before ? LABELS[before] : 'rien demandé'} → ${LABELS[wanted]}`);
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [width, height, testMode]);

  return null;
}
