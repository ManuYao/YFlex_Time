import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { springEnergetic } from '../../lib/animations';

/**
 * <PressTap> — wrapper Pressable + Reanimated qui rejoue le whileTap des maquettes
 * (scale spring) sans alourdir chaque écran.
 *
 * - tapScale : valeur cible au pressIn (0.96 par défaut, 0.94 pour chips, 0.92 pour chip phase, 0.88 pour boutons ronds)
 * - extraStyle / style : style passé au View animé
 * - onHapticIn : callback haptic optionnel déclenché au pressIn
 * - containerStyle : style de la zone d'appui elle-même (flex, alignSelf,
 *   marges) — `style` ne touche que la vue animée à l'intérieur
 * - pressValue : SharedValue optionnelle, menée de 0 à 1 pendant l'appui — permet
 *   au parent d'animer d'autres couches (voile, lueur) sur le même geste, sans
 *   seconde mécanique d'appui (voir components/common/Button.js)
 */
export default function PressTap({
  children,
  onPress,
  onLongPress,
  disabled = false,
  tapScale = 0.96,
  style,
  hitSlop,
  onHapticIn,
  pointerEvents,
  accessibilityLabel,
  pressValue,
  containerStyle,
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(tapScale, springEnergetic);
        if (pressValue) pressValue.value = withTiming(1, { duration: 90 });
        onHapticIn?.();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springEnergetic);
        if (pressValue) pressValue.value = withTiming(0, { duration: 260 });
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      style={containerStyle}
    >
      <Animated.View style={[style, animStyle]} pointerEvents={pointerEvents}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
