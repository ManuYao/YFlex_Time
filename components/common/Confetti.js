import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const COLORS = ['#FFC933', '#1FC777', '#FF5454', '#9575FF'];
const PARTICLE_COUNT = 24;
const ANIM_DURATION = 1800;
const TOTAL_LIFETIME = 2500;

const easeImpact = Easing.bezier(0.22, 1, 0.36, 1);

export default function Confetti({ enabled = true, originY = '33%' }) {
  const [mounted, setMounted] = useState(enabled);

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setTimeout(() => setMounted(false), TOTAL_LIFETIME);
    return () => clearTimeout(id);
  }, [enabled]);

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const distance = 280 + Math.random() * 180;
        return {
          key: i,
          color: COLORS[i % COLORS.length],
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance + 200,
          delay: Math.random() * 250,
          rotate: Math.random() * 720 - 360,
        };
      }),
    []
  );

  if (!mounted) return null;

  return (
    <View pointerEvents="none" style={[styles.layer, { top: originY }]}>
      {particles.map((p) => (
        <Particle key={p.key} {...p} />
      ))}
    </View>
  );
}

function Particle({ color, dx, dy, delay, rotate }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rot = useSharedValue(0);

  useEffect(() => {
    tx.value = withDelay(delay, withTiming(dx, { duration: ANIM_DURATION, easing: easeImpact }));
    ty.value = withDelay(delay, withTiming(dy, { duration: ANIM_DURATION, easing: easeImpact }));
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 220, easing: easeImpact }),
        withTiming(0.6, { duration: ANIM_DURATION - 220, easing: easeImpact })
      )
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(1, { duration: ANIM_DURATION - 600 }),
        withTiming(0, { duration: 520 })
      )
    );
    rot.value = withDelay(delay, withTiming(rotate, { duration: ANIM_DURATION, easing: easeImpact }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: color },
        animStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: '50%',
    width: 0,
    height: 0,
    zIndex: 5,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
    marginLeft: -4,
    marginTop: -4,
  },
});
