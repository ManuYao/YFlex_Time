import React, { useEffect, useMemo, useState } from 'react';
<<<<<<< HEAD
import { View, StyleSheet } from 'react-native';
=======
import { View, StyleSheet, Dimensions } from 'react-native';
>>>>>>> d99adb3a8deca24501ce4b66a8f381a5a0fb664d
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSequence,
  Easing,
<<<<<<< HEAD
=======
  runOnJS,
>>>>>>> d99adb3a8deca24501ce4b66a8f381a5a0fb664d
} from 'react-native-reanimated';

const COLORS = ['#FFC933', '#1FC777', '#FF5454', '#9575FF'];
const PARTICLE_COUNT = 24;
const ANIM_DURATION = 1800;
const TOTAL_LIFETIME = 2500;

const easeImpact = Easing.bezier(0.22, 1, 0.36, 1);

<<<<<<< HEAD
export default function Confetti({ enabled = true }) {
=======
export default function Confetti({ enabled = true, originY = '33%' }) {
>>>>>>> d99adb3a8deca24501ce4b66a8f381a5a0fb664d
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
<<<<<<< HEAD
        const distance = 300 + Math.random() * 200;
=======
        const distance = 280 + Math.random() * 180;
>>>>>>> d99adb3a8deca24501ce4b66a8f381a5a0fb664d
        return {
          key: i,
          color: COLORS[i % COLORS.length],
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance + 200,
<<<<<<< HEAD
          delay: Math.random() * 300,
          rotate: Math.random() * 360,
=======
          delay: Math.random() * 250,
          rotate: Math.random() * 720 - 360,
>>>>>>> d99adb3a8deca24501ce4b66a8f381a5a0fb664d
        };
      }),
    []
  );

  if (!mounted) return null;

  return (
<<<<<<< HEAD
    <View pointerEvents="none" style={styles.layer}>
=======
    <View pointerEvents="none" style={[styles.layer, { top: originY }]}>
>>>>>>> d99adb3a8deca24501ce4b66a8f381a5a0fb664d
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
<<<<<<< HEAD
        withTiming(1, { duration: 300, easing: easeImpact }),
        withTiming(0.6, { duration: ANIM_DURATION - 300, easing: easeImpact })
=======
        withTiming(1, { duration: 220, easing: easeImpact }),
        withTiming(0.6, { duration: ANIM_DURATION - 220, easing: easeImpact })
>>>>>>> d99adb3a8deca24501ce4b66a8f381a5a0fb664d
      )
    );
    opacity.value = withDelay(
      delay,
      withSequence(
<<<<<<< HEAD
        withTiming(1, { duration: 100 }),
        withTiming(1, { duration: ANIM_DURATION - 700 }),
        withTiming(0, { duration: 600 })
=======
        withTiming(1, { duration: 80 }),
        withTiming(1, { duration: ANIM_DURATION - 600 }),
        withTiming(0, { duration: 520 })
>>>>>>> d99adb3a8deca24501ce4b66a8f381a5a0fb664d
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
<<<<<<< HEAD
    <Animated.View style={[styles.particle, { backgroundColor: color }, animStyle]} />
=======
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: color },
        animStyle,
      ]}
    />
>>>>>>> d99adb3a8deca24501ce4b66a8f381a5a0fb664d
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
<<<<<<< HEAD
    top: '33%',
=======
>>>>>>> d99adb3a8deca24501ce4b66a8f381a5a0fb664d
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
