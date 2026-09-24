import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

import { easeImpact } from '../../lib/animations';

/**
 * ShineSweep — un reflet de lumière qui traverse un bouton en diagonale, puis
 * revient à intervalles réguliers. Même langage que la « brillance » des
 * cartes de l'Historique : il dit « ceci est vivant, touche-moi » sans
 * clignoter en continu.
 *
 * À poser DANS une vue en `overflow: 'hidden'` (le bouton) : c'est elle qui
 * découpe le reflet à la forme de la capsule.
 *
 * Toujours monté, même à l'arrêt (invisible) : un enfant qui apparaît juste
 * après la mesure du bouton, pendant l'animation d'entrée d'un parent, peut
 * figer cette entrée à opacity 0 sur la Nouvelle Architecture (bug vécu sur
 * MaintenanceScreen, voir CLAUDE.md).
 *
 * Props:
 * - width, height : taille du bouton (mesurée par onLayout chez le parent)
 * - active        : coupe le reflet (bouton désactivé, écran qui part…)
 * - delay         : attente avant le premier passage (ms)
 * - every         : pause entre deux passages (ms)
 * - intensity     : opacité du cœur du reflet
 */
const SWEEP_MS = 950;

export default function ShineSweep({
  width,
  height,
  active = true,
  delay = 700,
  every = 6500,
  intensity = 0.34,
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const band = Math.max(36, height * 1.2);
  const run = active && !reduceMotion && width > 0;

  useEffect(() => {
    if (!run) {
      cancelAnimation(progress);
      progress.value = 0;
      return undefined;
    }
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: SWEEP_MS, easing: easeImpact }),
          withDelay(every, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(progress);
  }, [run, delay, every]);

  const bandStyle = useAnimatedStyle(() => ({
    opacity: progress.value > 0 && progress.value < 1 ? 1 : 0,
    transform: [
      { translateX: -band * 1.5 + progress.value * (width + band * 3) },
      { rotate: '18deg' },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.band,
        { width: band, height: Math.max(height, 1) * 2.4, top: -height * 0.7 },
        bandStyle,
      ]}
    >
      <LinearGradient
        colors={[
          'rgba(255,255,255,0)',
          `rgba(255,255,255,${intensity})`,
          'rgba(255,255,255,0)',
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
  },
});
