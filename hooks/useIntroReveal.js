import { useAnimatedStyle } from 'react-native-reanimated';

import { INTRO_REVEAL_FROM_SCALE, introReveal } from '../lib/introReveal';

/**
 * Style d'apparition d'un écran à la fin de l'intro de démarrage : opacité de 0 à 1 et petit zoom
 * (0,92 → 1), tirés de la valeur partagée `introReveal` (lib/introReveal.js). Elle vaut 1 en temps
 * normal : aucun effet. À poser sur l'enveloppe d'un écran où l'intro peut se terminer (l'accueil ;
 * les Paramètres pour le bouton de test).
 */
export default function useIntroReveal() {
  return useAnimatedStyle(() => ({
    opacity: introReveal.value,
    transform: [{ scale: INTRO_REVEAL_FROM_SCALE + (1 - INTRO_REVEAL_FROM_SCALE) * introReveal.value }],
  }));
}
