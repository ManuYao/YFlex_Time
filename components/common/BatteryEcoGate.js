import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';

import { applyLightPending } from '../../lib/lightMode';
import { startDeviceWatch } from '../../lib/deviceWatch';

/**
 * Mode allégé (lib/lightMode.js, lib/batteryEco.js) : démarre la surveillance de la batterie
 * et de la chauffe, et applique le changement à chaque CHANGEMENT D'ÉCRAN (jamais pendant qu'on
 * regarde). Aucun message affiché : tout se fait en silence (décision du 10/11/2026).
 */
export default function BatteryEcoGate() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    startDeviceWatch();
  }, []);

  // Le premier rendu ne compte pas : le démarrage est géré par startDeviceWatch.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    applyLightPending();
  }, [pathname]);

  return null;
}
