import React, { forwardRef, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import PressTap from './PressTap';
import { withAlpha } from '../../lib/phase-colors';

// Part de lumière du contour au repos quand il invite (0 = invisible, 1 = à fond) :
// discret mais visible. Pendant le maintien il monte jusqu'à 1.
const REST_OPACITY = 0.5;

/**
 * HoldToTag — une zone (un score de jeu) qu'on MAINTIENT pour noter son exercice
 * (voir lib/gameExercises.js). Trois choses, toutes sans animation en boucle :
 *  - `invite` : un contour lumineux fixe, discret, fait tout le tour de la zone ;
 *  - l'appui : la zone s'enfonce légèrement (PressTap) ;
 *  - le maintien : le contour monte progressivement jusqu'à l'ouverture (`holdMs`),
 *    et retombe si on relâche avant — on voit que quelque chose se passe.
 * Opacité seule (aucune vue de plus que le contour) : pas de lag.
 *
 * Props:
 * - color    : hex opaque (la couleur du jeu)
 * - radius   : arrondi de la zone (le contour le suit)
 * - invite   : contour allumé au repos (score pas encore noté)
 * - holdMs   : durée du maintien avant `onHold`
 * - onHold   : appelé une fois le maintien accompli
 * - style    : style de la zone (comme le `style` de PressTap)
 * Le `ref` pointe la zone (pour la mesurer, ex. une bulle d'explication).
 */
const HoldToTag = forwardRef(function HoldToTag(
  { color, radius = 16, invite = false, holdMs = 1000, onHold, style, children, accessibilityLabel },
  ref
) {
  const hold = useSharedValue(0);
  const rest = invite ? REST_OPACITY : 0;

  const start = useCallback(() => {
    cancelAnimation(hold);
    hold.value = withTiming(1, { duration: holdMs, easing: Easing.linear });
  }, [holdMs]);

  const end = useCallback(() => {
    cancelAnimation(hold);
    hold.value = withTiming(0, { duration: 220 });
  }, []);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: rest + (1 - rest) * hold.value,
  }));

  return (
    <View ref={ref} collapsable={false}>
      <PressTap
        onLongPress={onHold}
        delayLongPress={holdMs}
        onPressStart={start}
        onPressEnd={end}
        tapScale={0.97}
        style={style}
        accessibilityLabel={accessibilityLabel}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              borderRadius: radius,
              borderColor: withAlpha(color, 0.9),
              boxShadow: `0 0 14px 1px ${withAlpha(color, 0.5)}`,
            },
            haloStyle,
          ]}
        />
        {children}
      </PressTap>
    </View>
  );
});

export default HoldToTag;

const styles = StyleSheet.create({
  halo: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1.5,
  },
});
