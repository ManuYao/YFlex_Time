import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import { withAlpha } from '../../lib/phase-colors';

const breathe = Easing.inOut(Easing.ease);

/**
 * ScoreHalo — contour lumineux qui respire autour d'un score pas encore « noté »
 * (voir lib/gameExercises.js) : l'invitation à le maintenir pour dire quel exercice
 * on a fait. À poser DANS la vue du score (elle en prend la taille) ; ne reçoit
 * aucun appui. Opacité seule (rien d'autre n'est animé : pas de lag), une seule
 * vue, éteinte dès `active` faux ; « réduire les animations » = contour fixe.
 *
 * Props:
 * - color  : hex opaque (la couleur du jeu)
 * - radius : arrondi du score qu'il entoure
 * - active : respire tant que vrai
 */
export default function ScoreHalo({ color, radius = 16, active = true }) {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(active ? 0.9 : 0);

  useEffect(() => {
    cancelAnimation(glow);
    if (!active) {
      glow.value = withTiming(0, { duration: 250 });
    } else if (reduceMotion) {
      glow.value = withTiming(0.9, { duration: 250 });
    } else {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: breathe }),
          withTiming(0.35, { duration: 1100, easing: breathe })
        ),
        -1,
        false
      );
    }
    return () => cancelAnimation(glow);
  }, [active, reduceMotion]);

  const animStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.halo,
        {
          borderRadius: radius,
          borderColor: withAlpha(color, 0.95),
          boxShadow: `0 0 18px 2px ${withAlpha(color, 0.75)}`,
        },
        animStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  halo: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
  },
});
