import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { loadCooldownMap, saveCooldownMap, getCooldownStatus, consumeLaunch } from '../lib/cooldown';

// Meme pattern que useTimerHeat.js : recharge au focus (la Home est
// retrouvee via router.replace apres chaque seance).
export function useCooldown() {
  const [map, setMap] = useState({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadCooldownMap().then((m) => {
        if (!cancelled) setMap(m);
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
