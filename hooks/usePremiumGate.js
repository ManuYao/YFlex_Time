import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { haptic } from './useHaptic';
import { usePremium } from './usePremium';
import { playSound } from '../lib/sounds';
import { isLocked } from '../lib/premiumFeatures';

/**
 * Point d'entrée UNIQUE des fonctions réservées à Premium (règles dans
 * lib/premiumFeatures.js). Un écran ne lit plus `isPremium` pour décider : il
 * demande si une porte est fermée, et utilise le refus commun.
 *
 *   const { locked, deny, guard } = usePremiumGate();
 *   locked('game.combo')                      // vrai = couronne + refus
 *   guard('game.combo', () => router.push(…)) // lance l'action ou refuse
 *   deny()                                    // refus seul (vibration + son + page Premium)
 *
 * Tant que le statut n'est pas lu (`loaded` faux), aucune porte n'est fermée :
 * on ne refuse jamais un vrai Premium sur une lecture pas finie. Les écrans
 * sensibles gardent leur filet à l'ouverture / au lancement.
 */
export function usePremiumGate() {
  const router = useRouter();
  const { isPremium, loaded } = usePremium();

  const locked = useCallback((gate) => loaded && isLocked(gate, isPremium), [loaded, isPremium]);

  const deny = useCallback(() => {
    haptic.warning();
    playSound('blockedTimer');
    router.push('/premium');
  }, [router]);

  // Retourne vrai si l'action a été lancée, faux si la porte était fermée.
  const guard = useCallback(
    (gate, onAllowed) => {
      if (loaded && isLocked(gate, isPremium)) {
        deny();
        return false;
      }
      if (onAllowed) onAllowed();
      return true;
    },
    [loaded, isPremium, deny]
  );

  return { isPremium, loaded, locked, deny, guard };
}
