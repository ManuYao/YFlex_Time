import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const COUNT = 5;
const STAGGER_MS = 110;
const UP_MS = 260;
const DOWN_MS = 260;
const REST_MS = 260;

function Dot({ index, size, color }) {
  const lift = useSharedValue(0);

  useEffect(() => {
    // Une vague : chaque point part 110 ms après le précédent, tous sur la
    // même période, donc la vague garde toujours la même forme. Piloté sur le
    // fil d'interface : continue de bouger même si le JS est occupé.
    lift.value = withDelay(
      index * STAGGER_MS,
      withRepeat(
        withSequence(
          withTiming(1, { duration: UP_MS, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: DOWN_MS, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: REST_MS })
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(lift);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * lift.value,
    transform: [{ translateY: -size * 0.45 * lift.value }, { scale: 0.75 + 0.4 * lift.value }],
  }));

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

/**
 * Cinq petits points qui se soulèvent l'un après l'autre : le « ça travaille »
 * de l'app, posé à la place du libellé d'un bouton de validation
 * (Button `loading`).
 *
 * Props : color (hex ou rgba, c'est un fond de vue), size (diamètre d'un point,
 * 6 par défaut), gap (espace entre deux points).
 */
export default function DotsLoader({ color = '#FFFFFF', size = 6, gap }) {
  const space = gap ?? Math.round(size * 0.9);
  return (
    <View style={[styles.row, { gap: space, paddingTop: size * 0.45 }]} accessibilityRole="progressbar">
      {Array.from({ length: COUNT }).map((_, i) => (
        <Dot key={i} index={i} size={size} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
