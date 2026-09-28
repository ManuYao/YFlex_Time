import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

const pulseEasing = Easing.inOut(Easing.ease);

/**
 * HighlightPulse — surbrillance brève et FINIE (`pulses` passages), pour
 * attirer l'œil sur un élément précis après une redirection (ex. un réglage
 * dans Paramètres, depuis une popup qui y a envoyé l'utilisateur). Différent
 * de PulseGlow (boucle infinie tant qu'`active`) : ici la séquence s'arrête
 * d'elle-même après `pulses` allers-retours. Si `active` redevient faux (ou
 * si le composant est démonté — l'utilisateur a quitté l'écran), l'animation
 * s'arrête immédiatement et ne reprend jamais : `active` n'est jamais remis à
 * vrai une seconde fois par ce composant, un seul passage dans une vie de
 * montage.
 */
export default function HighlightPulse({ active, pulses = 2, color = '#FFFFFF', style, children }) {
  const glow = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(glow);
    if (active) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 380, easing: pulseEasing }),
          withTiming(0, { duration: 380, easing: pulseEasing })
        ),
        pulses,
        false
      );
    } else {
      glow.value = withTiming(0, { duration: 200 });
    }
    return () => cancelAnimation(glow);
  }, [active, pulses]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.30 }));

  return (
    <View style={style}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: color }, overlayStyle]}
      />
    </View>
  );
}
