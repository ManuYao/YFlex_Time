import React, { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';

import UpdateSheet from './UpdateSheet';
import { useOtaUpdate } from '../../hooks/useOtaUpdate';
import { hasSeenUpdatePopup, markUpdatePopupSeen } from '../../lib/updatePopup';

// Jamais pendant une séance ni sur les écrans de passage : dès que
// l'utilisateur en sort (pathname change), la feuille peut s'afficher.
const HIDDEN_ROUTES = new Set(['/', '/index', '/onboarding', '/countdown', '/running', '/end-session']);

/**
 * Monté une fois dans le layout racine. Garde le téléchargement en tâche de
 * fond actif (useOtaUpdate) ET affiche automatiquement la feuille "Nouvelle
 * version" — mais une seule fois par mise à jour réelle (voir
 * lib/updatePopup.js), pas à chaque retour au premier plan : au lancement
 * si une version est déjà prête, ou dès qu'elle vient d'être téléchargée en
 * arrière-plan, ou après un reset complet (la marque "déjà vue" est purgée).
 * "Plus tard" marque quand même la version comme vue pour ne pas relancer la
 * feuille en boucle ; elle reste accessible manuellement dans
 * Paramètres > À propos.
 */
export default function UpdateGate() {
  const { pending, updateId, restart } = useOtaUpdate();
  const pathname = usePathname();
  const { height } = useWindowDimensions();
  const [visibleFor, setVisibleFor] = useState(null);

  useEffect(() => {
    if (!pending || !updateId || HIDDEN_ROUTES.has(pathname)) return;
    let cancelled = false;
    hasSeenUpdatePopup(updateId).then((seen) => {
      if (!cancelled && !seen) setVisibleFor(updateId);
    });
    return () => {
      cancelled = true;
    };
  }, [pending, updateId, pathname]);

  const dismiss = () => {
    markUpdatePopupSeen(visibleFor);
    setVisibleFor(null);
  };

  if (!visibleFor) return null;

  return <UpdateSheet screenH={height} mode="pending" onRestart={restart} onClose={dismiss} />;
}
