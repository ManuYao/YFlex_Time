import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { loadCooldownMap, saveCooldownMap, getCooldownStatus, consumeLaunch } from '../lib/cooldown';

// Meme pattern que useTimerHeat.js : recharge au focus (la Home est
// retrouvee via router.replace apres chaque seance).
// Mêmes entrées ? (objet `{ modeId: { uses, weekStart } }`, deux niveaux à plat)
const sameMap = (a, b) => {
  if (a === b) return true;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => {
    const x = a[k];
    const y = b[k];
    return x === y || (!!x && !!y && x.uses === y.uses && x.weekStart === y.weekStart);
  });
};

export function useCooldown() {
  const [map, setMap] = useState({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadCooldownMap().then((m) => {
        // Relu à CHAQUE retour sur l'écran : si rien n'a changé on garde le même
        // objet, sinon `getStatus` change et tout l'accueil se redessine pour rien.
        if (!cancelled) setMap((prev) => (sameMap(prev, m) ? prev : m));
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const getStatus = useCallback((timerId) => getCooldownStatus(map, timerId), [map]);

  const registerLaunch = useCallback((timerId) => {
    setMap((prev) => {
      const next = consumeLaunch(prev, timerId);
      saveCooldownMap(next);
      return next;
    });
  }, []);

  return { getStatus, registerLaunch };
}
