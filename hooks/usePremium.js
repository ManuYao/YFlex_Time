import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { loadIsPremium, saveIsPremium } from '../lib/premium';

// Meme pattern que useTimerHeat.js / useCooldown.js : recharge au focus, pour
// refleter un changement fait sur l'ecran /premium sans remonter tout un
// arbre de contexte.
export function usePremium() {
  const [isPremium, setIsPremiumState] = useState(false);
  // Vrai dès que la première lecture est faite : avant, `isPremium` vaut false
  // par défaut, et un écran dont la mise en page dépend de ce réglage (Profil)
  // changerait de hauteur à l'arrivée de la vraie valeur.
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadIsPremium().then((v) => {
        if (cancelled) return;
        setIsPremiumState(v);
        setLoaded(true);
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

  return { isPremium, setIsPremium, loaded };
}
