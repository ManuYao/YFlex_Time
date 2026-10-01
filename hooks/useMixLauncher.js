import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { useHaptic } from './useHaptic';
import { useCooldown } from './useCooldown';
import { usePremium } from './usePremium';
import { useTimers } from '../contexts/TimersContext';
import { playSound } from '../lib/sounds';

/**
 * Lance un MIX depuis n'importe quel écran (constructeur, hub Mix et Partage,
 * bibliothèque…) sans repasser par l'accueil.
 *
 * Le MIX est la fonction qui porte le freemium : le quota hebdomadaire
 * (lib/cooldown.js, TABATA 4 / MIX 3 par semaine) doit donc s'appliquer
 * EXACTEMENT comme sur le bouton Lancer de l'accueil, sinon ce raccourci
 * deviendrait la porte dérobée du quota. Même règles qu'app/home.js :
 *  - verrouillé → vibration d'alerte, son de refus, page Premium ;
 *  - sinon on part ; la place est consommée au GO (app/countdown.js), pas ici.
 *
 * Rend `launchMix(mix)` → `true` si la séance part, `false` sinon (mix vide
 * ou verrouillé).
 *
 * Navigation : on remonte à la racine puis on REMPLACE par /countdown, comme le
 * fait l'accueil. La pile devient [countdown] ; en fin de séance l'app
 * revient sur l'accueil (carte MIX), sans empiler l'écran d'où l'on est parti.
 *
 * Non repris de l'accueil, volontairement : la page « chrono fiable »
 * (permissions) qui précède la toute première séance et la transition en
 * cercle qui grandit — raccourci = direct au 3-2-1.
 */
export function useMixLauncher() {
  const router = useRouter();
  const haptic = useHaptic();
  const { saveCurrentMix } = useTimers();
  const { getStatus } = useCooldown();
  const { isPremium } = usePremium();

  return useCallback(
    async (mix) => {
      if (!mix || !Array.isArray(mix.blocks) || mix.blocks.length === 0) return false;

      if (!isPremium && getStatus('mix').isLocked) {
        haptic.warning();
        playSound('blockedTimer');
        router.push('/premium');
        return false;
      }

      // Le MIX lancé devient le MIX courant : c'est lui que /countdown puis
      // /running relisent dans TimersContext.
      await saveCurrentMix(mix);
      haptic.medium();

      try {
        if (router.canDismiss?.()) router.dismissAll();
      } catch {
        // Pile déjà à la racine : rien à retirer.
      }
      router.replace({ pathname: '/countdown', params: { timerId: 'mix' } });
      return true;
    },
    [router, haptic, saveCurrentMix, getStatus, isPremium]
  );
}
