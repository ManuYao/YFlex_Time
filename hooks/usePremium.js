import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getCachedPremium, loadIsPremium, saveIsPremium, subscribePremium } from '../lib/premium';

// Le statut vit dans lib/premium.js (copie en mémoire partagée) : ce hook part
// de cette copie, s'abonne aux changements, et relit au focus par sécurité.
// Pour tout ce qui BLOQUE ou MONTRE une fonction réservée, préférer
// hooks/usePremiumGate.js (refus, pastilles, règles au même endroit).
export function usePremium() {
  const [isPremium, setIsPremiumState] = useState(getCachedPremium() === true);
  // Vrai dès que la première lecture est faite : avant, `isPremium` vaut false
  // par défaut, et un écran dont la mise en page dépend de ce réglage (Profil)
  // changerait de hauteur à l'arrivée de la vraie valeur.
  const [loaded, setLoaded] = useState(getCachedPremium() !== null);

  useEffect(() => {
    const apply = (value) => {
      setIsPremiumState(value);
      setLoaded(true);
    };
    const unsubscribe = subscribePremium(apply);
    // Un changement arrivé entre le rendu et l'abonnement ne doit pas se perdre.
    const current = getCachedPremium();
    if (current !== null) apply(current);
    return unsubscribe;
  }, []);

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
    saveIsPremium(value);
  }, []);

  return { isPremium, setIsPremium, loaded };
}
