import { useCallback } from 'react';

import { haptic } from './useHaptic';
import { usePremium } from './usePremium';
import { playSound } from '../lib/sounds';
import { isLocked, gatePromptText, COOLDOWN_PROMPT_TEXT } from '../lib/premiumFeatures';
import { showPremiumPrompt } from '../lib/premiumPrompt';

/**
 * Refus Premium COMMUN (hors hook : utilisable aussi depuis un hook ou un
 * gestionnaire sans passer par usePremiumGate) : vibration d'alerte, son de refus,
 * puis le pop-up Premium (couronne + « Voir Premium »), jamais une redirection
 * d'office vers la page Premium. `text` = phrase du pop-up.
 */
export function denyPremium(text) {
  haptic.warning();
  playSound('blockedTimer');
  showPremiumPrompt(text);
}

// Même refus pour un chrono verrouillé par un quota (dormant : lib/cooldown.js).
export function denyCooldown() {
  denyPremium(COOLDOWN_PROMPT_TEXT);
}

/**
 * Point d'entrée UNIQUE des fonctions réservées à Premium (règles dans
 * lib/premiumFeatures.js). Un écran ne lit plus `isPremium` pour décider : il
 * demande si une porte est fermée, et utilise le refus commun.
 *
 *   const { locked, deny, guard } = usePremiumGate();
 *   locked('game.combo')                      // vrai = couronne + refus
 *   guard('game.combo', () => router.push(…)) // lance l'action ou refuse
 *   deny('game.combo')                        // refus seul (vibration + son + pop-up Premium)
 *
 * Le refus affiche le pop-up commun (PremiumPromptGate) avec la phrase de la
 * porte ; « Voir Premium » dans ce pop-up ouvre la page Premium.
 *
 * Tant que le statut n'est pas lu (`loaded` faux), aucune porte n'est fermée :
 * on ne refuse jamais un vrai Premium sur une lecture pas finie. Les écrans
 * sensibles gardent leur filet à l'ouverture / au lancement.
 */
export function usePremiumGate() {
  const { isPremium, loaded } = usePremium();

  const locked = useCallback((gate) => loaded && isLocked(gate, isPremium), [loaded, isPremium]);

  // `gate` = la porte refusée (sa phrase est lue dans lib/premiumFeatures.js).
  const deny = useCallback((gate) => denyPremium(gatePromptText(gate)), []);

  // Retourne vrai si l'action a été lancée, faux si la porte était fermée.
  const guard = useCallback(
    (gate, onAllowed) => {
      if (loaded && isLocked(gate, isPremium)) {
        deny(gate);
        return false;
      }
      if (onAllowed) onAllowed();
      return true;
    },
    [loaded, isPremium, deny]
  );

  return { isPremium, loaded, locked, deny, guard };
}
