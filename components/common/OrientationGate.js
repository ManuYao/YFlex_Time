import { useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import { useWindowSize } from '../../lib/responsive';
import { orientationPolicy } from '../../lib/orientationPolicy';

// Applique la politique d'orientation (lib/orientationPolicy.js) : portrait verrouillé en
// plein écran, rotation libre dans une fenêtre réduite (fenêtre flottante Samsung, écran
// partagé). Ne rend rien.
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

export default function OrientationGate() {
  const { width, height } = useWindowSize();
  const appliedRef = useRef(null);

  useEffect(() => {
    if (!ScreenOrientation) return undefined;
    const screen = Dimensions.get('screen');
    const mode = orientationPolicy({ width, height }, { width: screen.width, height: screen.height });
    if (mode === appliedRef.current) return undefined;
    const timer = setTimeout(() => {
      appliedRef.current = mode;
      try {
        const done =
          mode === 'free'
            ? ScreenOrientation.unlockAsync()
            : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        if (done && typeof done.catch === 'function') done.catch(() => {});
      } catch (e) {
        // Jamais bloquant : au pire, l'orientation reste comme elle est.
      }
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [width, height]);

  return null;
}
