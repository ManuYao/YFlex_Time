import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Pattern, Stop, Rect, Circle } from 'react-native-svg';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import TickRing from './TickRing';
import { fonts } from '../../lib/fonts';
import { easeImpact } from '../../lib/animations';
import { playSound } from '../../lib/sounds';

const PALETTE = ['#FFFFFF', '#FF5454', '#1FC777', '#FFC933', '#9575FF'];
const ICON_SIZE = 150;
const GLOW_SIZE = 260;
const RING_SIZE = 160;
const INITIAL = Dimensions.get('window');
const HOLD_MS = 1450;
const EXIT_MS = 350;
const PARTICLE_COUNT = 18;
const STREAK_COUNT = 8;

/**
 * Écran de démarrage animé, bloquant, affiché une fois par 24 h (voir
 * lib/splash.js). L'icône reste immobile : seuls les effets autour bougent —
 * un halo qui éclate derrière, des ondes de choc, puis des traits lumineux et
 * des particules qui jaillissent devant.
 *
 * L'icône est pour l'instant la signature visuelle de l'app (anneau à
 * graduations + nom en Anton) : les fichiers assets/icon*.png sont encore le
 * motif de démonstration d'Expo. Quand une vraie icône existera, remplacer
 * le bloc `wordmark` par une <Image>.
 */
export default function LaunchSplash({ onDone }) {
  const rootOpacity = useSharedValue(1);
  const iconOpacity = useSharedValue(0);

  useEffect(() => {
    playSound('intro');
    iconOpacity.value = withTiming(1, { duration: 220 });
    rootOpacity.value = withDelay(
      HOLD_MS,
      withTiming(0, { duration: EXIT_MS }, (done) => {
        if (done) runOnJS(onDone)();
      })
    );
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const distance = 110 + Math.random() * 110;
        return {
          id: i,
          color: PALETTE[i % PALETTE.length],
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          delay: 120 + Math.random() * 260,
          size: 4 + Math.round(Math.random() * 4),
        };
      }),
    []
  );

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));
  const iconStyle = useAnimatedStyle(() => ({ opacity: iconOpacity.value }));

  // Le Svg de fond doit couvrir la racine réelle (plus haute que
  // Dimensions.get('window') en edge-to-edge), d'où la mesure par onLayout —
  // même précaution que GradientBackground.
  const [size, setSize] = useState({ width: INITIAL.width, height: INITIAL.height });
  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height }
    );
  };

  return (
    <Animated.View style={[styles.root, rootStyle]} onLayout={handleLayout}>
      <Pressable style={StyleSheet.absoluteFill} />

      <Svg
        width={size.width}
        height={size.height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="base" cx="50%" cy="50%" rx="75%" ry="60%" fx="50%" fy="50%">
            <Stop offset="0" stopColor="#1C1C1C" stopOpacity="1" />
            <Stop offset="0.6" stopColor="#070707" stopOpacity="1" />
            <Stop offset="1" stopColor="#000000" stopOpacity="1" />
          </RadialGradient>
          <Pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <Circle cx="11" cy="11" r="1" fill="#FFFFFF" />
          </Pattern>
          <RadialGradient id="vignette" cx="50%" cy="50%" rx="70%" ry="60%" fx="50%" fy="50%">
            <Stop offset="0" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.85" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#base)" />
        <Rect width="100%" height="100%" fill="url(#dots)" opacity={0.11} />
        <Rect width="100%" height="100%" fill="url(#vignette)" />
      </Svg>

      <View style={styles.stage} pointerEvents="none">
        <Glow />
        {[0, 1, 2].map((i) => (
          <Ring key={i} delay={i * 110} />
        ))}

        <Animated.View style={[styles.icon, iconStyle]}>
          <TickRing progress={1} size={ICON_SIZE} />
          <View style={styles.wordmark}>
            <Text style={styles.word}>FLEX</Text>
            <Text style={styles.word}>TIMER</Text>
          </View>
        </Animated.View>

        {Array.from({ length: STREAK_COUNT }).map((_, i) => (
          <Streak key={i} angle={(360 / STREAK_COUNT) * i} delay={140 + i * 18} />
        ))}
        {particles.map(({ id, ...p }) => (
          <Particle key={id} {...p} />
        ))}
      </View>
    </Animated.View>
  );
}

function Glow() {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1.5, { duration: 700, easing: easeImpact });
    opacity.value = withSequence(
      withTiming(0.28, { duration: 150 }),
      withTiming(0, { duration: 550, easing: easeImpact })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.glow, style]} />;
}

function Ring({ delay }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withTiming(2.3, { duration: 800, easing: easeImpact }));
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.7, { duration: 60 }),
        withTiming(0, { duration: 740, easing: easeImpact })
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.ring, style]} />;
}

function Streak({ angle, delay }) {
  const travel = useSharedValue(-50);
  const opacity = useSharedValue(0);
  const scaleY = useSharedValue(0.3);

  useEffect(() => {
    travel.value = withDelay(delay, withTiming(-170, { duration: 520, easing: easeImpact }));
    scaleY.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 200, easing: easeImpact }),
        withTiming(0.5, { duration: 320, easing: easeImpact })
      )
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(1, { duration: 160 }),
        withTiming(0, { duration: 280 })
      )
    );
  }, []);

  // rotate d'abord, puis translateY : la translation suit l'axe tourné, le
  // trait file donc vers l'extérieur dans sa propre direction.
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { rotate: `${angle}deg` },
      { translateY: travel.value },
      { scaleY: scaleY.value },
    ],
  }));

  return <Animated.View style={[styles.streak, style]} />;
}

function Particle({ color, dx, dy, delay, size }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    tx.value = withDelay(delay, withTiming(dx, { duration: 800, easing: easeImpact }));
    ty.value = withDelay(delay, withTiming(dy, { duration: 800, easing: easeImpact }));
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 180, easing: easeImpact }),
        withTiming(0.4, { duration: 620, easing: easeImpact })
      )
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(1, { duration: 320 }),
        withTiming(0, { duration: 400 })
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: -size / 2,
          top: -size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Point d'ancrage 0x0 au centre de l'écran. Surtout PAS d'alignItems /
  // justifyContent ici : Yoga les applique aussi aux enfants absolus sans
  // left/top, ce qui ajoutait un second centrage par-dessus les décalages et
  // envoyait toute l'animation en haut à gauche. Chaque enfant se place donc
  // avec un left/top explicite de -moitié de sa taille.
  stage: {
    width: 0,
    height: 0,
  },

  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    left: -GLOW_SIZE / 2,
    top: -GLOW_SIZE / 2,
    backgroundColor: '#FFFFFF',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    left: -RING_SIZE / 2,
    top: -RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  icon: {
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE,
    left: -ICON_SIZE / 2,
    top: -ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 27,
    letterSpacing: 1.5,
    color: '#FFFFFF',
    includeFontPadding: false,
  },

  streak: {
    position: 'absolute',
    width: 2,
    height: 56,
    borderRadius: 1,
    left: -1,
    top: -28,
    backgroundColor: '#FFFFFF',
  },
  particle: {
    position: 'absolute',
  },
});
