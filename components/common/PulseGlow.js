import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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
 * PulseGlow — lueur diffuse qui respire autour d'un bouton (bouton central de
 * la séance). Une vraie lueur floue, pas un disque coloré : c'est une vue
 * transparente de la taille du bouton qui porte un `boxShadow` sans décalage.
 * L'ombre extérieure de boxShadow est découpée hors de la forme (Android :
 * clipOutPath), donc seule la lueur autour est visible, jamais à travers.
 * Android 9+ ; en dessous la lueur n'est simplement pas dessinée.
 *
 * Ne prend jamais de couleur inventée : `color` = la couleur du mode (hex).
 *
 * Props:
 * - color  : hex opaque (couleur du mode)
 * - size   : diamètre du bouton qu'elle entoure
 * - active : respire tant que vrai ; s'éteint en fondu sinon (pause = la
 *            lueur qui s'arrête EST l'information)
 */
export default function PulseGlow({ color, size = 92, active = true }) {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(active ? 0.75 : 0);

  useEffect(() => {
    cancelAnimation(glow);
    if (!active) {
      glow.value = withTiming(0, { duration: 350 });
    } else if (reduceMotion) {
      glow.value = withTiming(0.8, { duration: 350 });
    } else {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: breathe }),
          withTiming(0.7, { duration: 1400, easing: breathe })
        ),
        -1,
        false
      );
    }
    return () => cancelAnimation(glow);
  }, [active, reduceMotion]);

  // Opacité seule, plus lente et moins ample (v14.1.1) : faire aussi varier
  // l'échelle obligeait Android à redessiner le flou de l'ombre à chaque
  // image, et le bord de la lueur « clignotait » au lieu de respirer.
  const animStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View pointerEvents="none" style={styles.center}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            boxShadow: `0 0 30px 4px ${withAlpha(color, 0.85)}, 0 0 12px 1px ${withAlpha(color, 0.9)}`,
          },
          animStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
