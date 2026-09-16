import { useCallback, useRef, useState } from 'react';

import { useOtaUpdate } from './useOtaUpdate';
import { hasSeenUpdatePopup, markUpdatePopupSeen } from '../lib/updatePopup';

// Nombre de swipes du carrousel Home avant de proposer la mise à jour — un
// signal "l'utilisateur est en train de se servir de l'app", plutôt qu'un
// popup qui saute dessus dès le montage de l'écran.
const SWIPES_BEFORE_POPUP = 4;

/**
 * Déclenche la feuille "Nouvelle version" après quelques swipes du carrousel
 * Home, si une mise à jour est prête et n'a pas déjà été montrée (voir
 * lib/updatePopup.js — dédupliqué par updateId, purgé au reset complet).
 *
 * Compteur en mémoire (pas persisté) : repart de zéro à chaque ouverture de
 * l'app, ce qui est très bien — swiper 4 fois fait partie de l'usage normal
 * de l'écran d'accueil.
 *
 * Utilisation : appeler `registerSwipe()` dans le handler de fin de scroll du
 * carrousel (app/home.js), et rendre <UpdateSheet /> quand `visible` est vrai.
 */
export function useSwipeTriggeredUpdate() {
  const { pending, updateId, restart } = useOtaUpdate();
  const [visible, setVisible] = useState(false);
  const swipeCountRef = useRef(0);
  // updateId déjà vérifié cette session, pour ne pas relancer hasSeenUpdatePopup
  // à chaque swipe une fois la décision prise.
  const checkedForRef = useRef(null);

  const registerSwipe = useCallback(() => {
    swipeCountRef.current += 1;
    if (!pending || !updateId) return;
    if (swipeCountRef.current < SWIPES_BEFORE_POPUP) return;
    if (checkedForRef.current === updateId) return;
    checkedForRef.current = updateId;

    hasSeenUpdatePopup(updateId).then((seen) => {
      if (!seen) setVisible(true);
    });
  }, [pending, updateId]);

  const dismiss = useCallback(() => {
    markUpdatePopupSeen(updateId);
    setVisible(false);
  }, [updateId]);

  return { visible, restart, dismiss, registerSwipe };
}
