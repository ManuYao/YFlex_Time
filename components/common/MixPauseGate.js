import React, { useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';

import MixPauseSheet from './MixPauseSheet';
import { useTimers } from '../../contexts/TimersContext';
import { getCachedPremium, loadIsPremium, subscribePremium } from '../../lib/premium';
import { onMixPauseRequest, pauseGroups, reviewNeeded } from '../../lib/libraryLimits';
import { storage } from '../../lib/storage';
import { waitSplashBeat } from '../../lib/splash';
import { waitForUpdateGateSettled } from '../../lib/updateGateSignal';

// « A été Pro » : posé tant qu'on est Premium, sert à reconnaître le moment où
// l'abonnement se perd (au lancement suivant, ou en direct), même quand l'app
// était fermée. Purgé par le reset complet (app/settings.js).
const WAS_PRO_KEY = 'flexTimer_mixPauseWasPro';

// Écrans où une feuille ne doit pas surgir (mêmes que UpdateGate).
const HIDDEN_ROUTES = new Set(['/', '/index', '/onboarding', '/tutorial', '/season-recap', '/countdown', '/running', '/game-count', '/game-pyramid', '/game-combo']);

/**
 * Perte de Premium : propose UNE fois de choisir les mix qu'on garde actifs
 * (components/common/MixPauseSheet.js). Rien n'est supprimé, les autres passent
 * en pause (lib/libraryLimits.js). Monté une seule fois à la racine.
 *
 * Deux façons de l'ouvrir :
 *  - automatique, une fois, à la perte de Premium s'il y a trop de mix actifs ;
 *  - à la demande, depuis « Mes mix » (onMixPauseRequest), pour échanger un mix
 *    actif contre un mix en pause quand on veut.
 */
export default function MixPauseGate() {
  const { library, hydrated, applyMixPause } = useTimers();
  // Statut lu dans lib/premium.js (copie partagée) et non via hooks/usePremium :
  // ce hook s'appuie sur useFocusEffect, qui n'a pas de sens hors d'un écran.
  const [premium, setPremium] = useState(getCachedPremium());
  useEffect(() => {
    const off = subscribePremium(setPremium);
    loadIsPremium().then(setPremium);
    return off;
  }, []);
  const loaded = premium !== null;
  const isPremium = premium === true;
  const pathname = usePathname();
  const { height } = useWindowDimensions();
  const [groups, setGroups] = useState(null);
  const [pending, setPending] = useState(false);
  const libraryRef = useRef(library);
  libraryRef.current = library;

  // À la demande (« Choisir mes mix » dans Mes mix).
  useEffect(
    () =>
      onMixPauseRequest(() => {
        const g = pauseGroups(libraryRef.current);
        if (g.length > 0) setGroups(g);
      }),
    []
  );

  // Détection de la perte de Premium.
  useEffect(() => {
    if (!loaded || !hydrated) return undefined;
    let cancelled = false;
    (async () => {
      const wasPro = await storage.get(WAS_PRO_KEY);
      if (cancelled) return;
      if (isPremium) {
        if (!wasPro) await storage.set(WAS_PRO_KEY, true);
        return;
      }
      if (wasPro) {
        await storage.set(WAS_PRO_KEY, false);
        if (!cancelled) setPending(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, hydrated, isPremium]);

  // Affichage de la proposition : jamais sur un écran caché, jamais avant la fin
  // de l'intro ni par-dessus la feuille « Nouvelle version ».
  useEffect(() => {
    if (!pending || groups || HIDDEN_ROUTES.has(pathname)) return undefined;
    if (reviewNeeded(libraryRef.current).length === 0) {
      setPending(false);
      return undefined;
    }
    let cancelled = false;
    waitSplashBeat()
      .then(() => waitForUpdateGateSettled())
      .then(() => {
        if (cancelled) return;
        const g = reviewNeeded(libraryRef.current);
        setPending(false);
        if (g.length > 0) setGroups(g);
      });
    return () => {
      cancelled = true;
    };
  }, [pending, groups, pathname]);

  if (!groups) return null;
  return (
    <MixPauseSheet
      screenH={height}
      groups={groups}
      onConfirm={(kinds, keepIds) => applyMixPause(kinds, keepIds)}
      onClose={() => setGroups(null)}
    />
  );
}
