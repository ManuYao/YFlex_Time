import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { loadIsPremium, saveIsPremium } from '../lib/premium';

// Meme pattern que useTimerHeat.js / useCooldown.js : recharge au focus, pour
// refleter un changement fait sur l'ecran /premium sans remonter tout un
// arbre de contexte.
export function usePremium() {
  const [isPremium, setIsPremiumState] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadIsPremium().then((v) => {
        if (!cancelled) setIsPremiumState(v);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const setIsPremium = useCallback((value) => {
    setIsPremiumState(value);
    saveIsPremium(value);
  }, []);

  return { isPremium, setIsPremium };
}
