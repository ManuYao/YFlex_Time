import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import TutorialMenu from '../components/screens/TutorialMenu';
import TutorialBilan from '../components/screens/TutorialBilan';
import TutorialTour from '../components/screens/TutorialTour';
import { STEPS, TUTORIAL_TIMER_ID, markTutorialOutcome } from '../lib/tutorial';
import { useHaptic } from '../hooks/useHaptic';

// Tour guidé de démarrage — jamais imposé (proposé par un pop-up sur
// l'accueil, rouvrable depuis les Paramètres, quittable à chaque écran).
//
// Niveau 1 : le menu (`menu`) → chrono de test dans le VRAI décompte et le VRAI
//            chrono (/countdown puis /running avec tutorial=1) → bilan (`bilan`)
// Niveau 2 : Historique, Planning, Profil (`tour`), facultatif
//
// L'état d'étape vit dans les paramètres de la route (`step`, `done`) : le test
// passe par d'autres écrans, qui y reviennent par `router.replace`.
export default function Tutorial() {
  const router = useRouter();
  const haptic = useHaptic();
  const { step: stepParam, done } = useLocalSearchParams();
  const [override, setOverride] = useState(null);
  const step = override ?? (STEPS[stepParam] ? stepParam : STEPS.menu);
  const success = done === '1';
  const leavingRef = useRef(false);

  // Sortie : l'accueil. Si le tour a été ouvert depuis les Paramètres, la pile
  // contient encore l'écran sous nous : on la vide avant de revenir à l'accueil
  // pour ne pas empiler deux accueils.
  const leave = useCallback(
    (outcome) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      markTutorialOutcome(outcome);
      try {
        if (router.canDismiss?.()) router.dismissAll();
      } catch {}
      router.replace('/home');
    },
    [router]
  );

  // Quitter depuis une étape : ce qui a déjà été fait compte (quitter pendant
  // le niveau 2 garde « niveau 1 terminé », quitter le menu = tuto refusé).
  const handleQuit = useCallback(() => {
    haptic.light();
    if (step === STEPS.tour || (step === STEPS.bilan && success)) leave('done1');
    else leave('declined');
  }, [step, success, leave, haptic]);

  // Le retour Android quitte le tour, comme le bouton : jamais d'écran piège.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleQuit();
      return true;
    });
    return () => sub.remove();
  }, [handleQuit]);

  const launchTest = useCallback(() => {
    router.replace({
      pathname: '/countdown',
      params: { timerId: TUTORIAL_TIMER_ID, tutorial: '1' },
    });
  }, [router]);

  if (step === STEPS.bilan) {
    return (
      <TutorialBilan
        success={success}
        onContinue={() => setOverride(STEPS.tour)}
        onFinish={() => leave(success ? 'done1' : 'declined')}
        onRetry={() => router.replace({ pathname: '/tutorial', params: { step: STEPS.menu } })}
      />
    );
  }

  if (step === STEPS.tour) {
    return <TutorialTour onDone={() => leave('done')} onQuit={handleQuit} />;
  }

  return <TutorialMenu onLaunch={launchTest} onQuit={handleQuit} />;
}
