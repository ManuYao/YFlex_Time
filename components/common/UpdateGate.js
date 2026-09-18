import React, { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';

import UpdateSheet from './UpdateSheet';
import { useOtaUpdate } from '../../hooks/useOtaUpdate';
import { hasSeenUpdatePopup, markUpdatePopupSeen, resolveUpdateCandidate } from '../../lib/updatePopup';

// Seule exception à l'affichage immédiat : jamais par-dessus un chrono en
// cours, le compte à rebours, l'écran de redirection initial, ou le
// tutoriel — un nouvel utilisateur (ou un reset complet, qui purge aussi
// flexTimer_updatePopupSeen) ne doit jamais voir la feuille se superposer à
// l'onboarding. Dès que l'utilisateur quitte une de ces routes, la feuille
// apparaît (l'effet dépend de `pathname`, donc il se redéclenche à la sortie
// de l'onboarding).
const HIDDEN_ROUTES = new Set(['/', '/index', '/onboarding', '/countdown', '/running']);

/**
 * Monté une fois dans le layout racine. Affiche la feuille "Nouvelle version"
 * dès qu'une version pas encore vue est détectée, où que soit l'utilisateur :
 *
 * - une mise à jour vient d'être téléchargée (`pending`) → mode 'pending',
 *   CTA "Redémarrer maintenant" ;
 * - l'app tourne déjà sur une version OTA (`runningUpdateId`) que
 *   l'utilisateur n'a jamais confirmée — typiquement appliquée toute seule
 *   à un lancement à froid pendant qu'il n'était pas là → mode 'info',
 *   "Quoi de neuf".
 *
 * La feuille revient à chaque lancement tant qu'elle n'a pas été fermée
 * explicitement (Plus tard, Compris, voile, retour Android, ou Redémarrer).
 * Une fois fermée, l'updateId est mémorisé (lib/updatePopup.js) et elle ne
 * réapparaît plus pour cette version. Purgé au reset complet des Paramètres.
 */
export default function UpdateGate() {
  const { pending, updateId, runningUpdateId, restart } = useOtaUpdate();
  const pathname = usePathname();
  const { height } = useWindowDimensions();
  // { id, mode } de la feuille affichée, ou null.
  const [sheet, setSheet] = useState(null);

  const candidate = resolveUpdateCandidate({ pending, updateId, runningUpdateId });
  const candidateId = candidate?.id;

  useEffect(() => {
    if (!candidate || sheet || HIDDEN_ROUTES.has(pathname)) return;
    let cancelled = false;
    hasSeenUpdatePopup(candidate.id).then((seen) => {
      if (!cancelled && !seen) setSheet(candidate);
    });
    return () => {
      cancelled = true;
    };
  }, [candidateId, candidate?.mode, pathname, sheet]);

  if (!sheet) return null;

  const confirm = () => {
    markUpdatePopupSeen(sheet.id);
    setSheet(null);
  };

  return (
    <UpdateSheet
      screenH={height}
      mode={sheet.mode}
      onRestart={() => {
        markUpdatePopupSeen(sheet.id);
        restart();
      }}
      onClose={confirm}
    />
  );
}
