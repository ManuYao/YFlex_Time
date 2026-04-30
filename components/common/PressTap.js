import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { springEnergetic } from '../../lib/animations';

/**
 * <PressTap> — wrapper Pressable + Reanimated qui rejoue le whileTap des maquettes
 * (scale spring) sans alourdir chaque écran.
 *
 * - tapScale : valeur cible au pressIn (0.96 par défaut, 0.94 pour chips, 0.92 pour chip phase, 0.88 pour boutons ronds)
 * - extraStyle / style : style passé au View animé
 * - onHapticIn : callback haptic optionnel déclenché au pressIn
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
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(tapScale, springEnergetic);
        onHapticIn?.();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springEnergetic);
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[style, animStyle]} pointerEvents={pointerEvents}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
