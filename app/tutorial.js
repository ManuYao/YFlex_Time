import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import TutorialTour from '../components/screens/TutorialTour';
import { STEPS, markTutorialOutcome } from '../lib/tutorial';
import { useHaptic } from '../hooks/useHaptic';

// Tour guidé de démarrage — jamais imposé (proposé par un pop-up sur
// l'accueil, rouvrable depuis les Paramètres, quittable à chaque écran).
//
// Niveau 1 : trois bulles posées sur le VRAI accueil (choisir un mode, régler,
//            lancer) — sans rien lancer. Elles vivent dans app/home.js (paramètre
//            `tour=1`) ; cet écran ne fait que renvoyer l'accueil quand on arrive
//            ici à l'étape `menu` (Paramètres › Revoir le tutoriel).
// Niveau 2 : le menu puis le Profil (`tour`), facultatif ; « C'est parti »
//            ramène à l'accueil. On y arrive depuis la dernière bulle du niveau 1.
export default function Tutorial() {
  const router = useRouter();
  const haptic = useHaptic();
  const { step: stepParam } = useLocalSearchParams();
  const step = stepParam === STEPS.tour ? STEPS.tour : STEPS.menu;
  const leavingRef = useRef(false);

  // Sortie : l'accueil. Si le tour a été ouvert depuis les Paramètres, la pile
  // contient encore l'écran sous nous : on la vide avant de revenir à l'accueil
  // pour ne pas empiler deux accueils. `withTour` : l'accueil rejoue les bulles.
  const leave = useCallback(
    (outcome, withTour = false) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      if (outcome) markTutorialOutcome(outcome);
      try {
        if (router.canDismiss?.()) router.dismissAll();
      } catch {}
      router.replace(withTour ? { pathname: '/home', params: { tour: '1' } } : '/home');
    },
    [router]
  );

  // Arrivée à l'étape `menu` (ou ancienne adresse du bilan) : le niveau 1 se
  // joue sur l'accueil.
  useEffect(() => {
    if (step === STEPS.menu) leave(null, true);
  }, [step, leave]);

  // Quitter pendant le niveau 2 garde « niveau 1 terminé ».
  const handleQuit = useCallback(() => {
    haptic.light();
    leave('done1');
  }, [leave, haptic]);

  // Le retour Android quitte le tour, comme le bouton : jamais d'écran piège.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleQuit();
      return true;
    });
    return () => sub.remove();
  }, [handleQuit]);

  if (step === STEPS.tour) {
    return <TutorialTour onDone={() => leave('done')} onQuit={handleQuit} />;
  }

  // Le temps du renvoi vers l'accueil.
  return <View style={{ flex: 1, backgroundColor: '#000' }} />;
}
