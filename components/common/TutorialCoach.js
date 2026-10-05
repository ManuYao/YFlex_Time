import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

// Ce que dit le coach à chaque moment du chrono de test (coachStepFor,
// lib/tutorialShape.js). Court, en mots simples : on lit ça en quelques
// secondes, entre deux gestes.
const STEPS = {
  work: {
    n: 1,
    title: 'Ton chrono monte',
    body: "Fais ta série à ton rythme. Quand c'est fini, tape REPOS.",
    point: true,
  },
  rest: {
    n: 2,
    title: 'Place au repos',
    body: 'Le temps descend : respire. Les 3 dernières secondes sonnent, puis la série suivante démarre.',
    point: false,
  },
  last: {
    n: 3,
    title: 'Dernier tour',
    body: 'Quand tu as fini, tape FINI. Le test se termine.',
    point: true,
  },
};
const TOTAL = 3;

/**
 * Bulle de guidage posée sous l'anneau du VRAI chrono, pendant le BASIC de
 * test du tutoriel. Elle remplace le déroulé des phases (même emplacement) et
 * ne bloque rien : le chrono reste entièrement utilisable, et « Quitter le
 * tuto » est toujours là — le tutoriel n'est jamais imposé.
 *
 * Props:
 * - step    : 'work' | 'rest' | 'last' | null (null = rien à dire)
 * - tokens  : getTokens(timer.textMode)
 * - compact : fenêtre réduite → titre seul (le corps passe en premier au sacrifice)
 * - onQuit  : « Quitter le tuto »
 */
export default function TutorialCoach({ step, tokens, compact = false, onQuit }) {
  const reduceMotion = useReducedMotion();
  const def = step ? STEPS[step] : null;

  // Entrée à chaque changement d'étape, pilotée à la main (le repo évite
  // `entering` sur un nœud dont le contenu change juste après sa mesure).
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (!def) return undefined;
    if (reduceMotion) {
      enter.value = 1;
      return undefined;
    }
    enter.value = 0;
    enter.value = withSpring(1, { damping: 16, stiffness: 260, mass: 1 });
    return undefined;
  }, [step]);

  useEffect(() => {
    cancelAnimation(bob);
    if (def?.point && !reduceMotion) {
      bob.value = 0;
      bob.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 520, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 520, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    } else {
      bob.value = 0;
    }
    return () => cancelAnimation(bob);
  }, [step]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.value),
    transform: [{ translateY: (1 - Math.min(1, enter.value)) * 14 }],
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value * 6 }, { rotate: '90deg' }],
  }));

  if (!def) return null;

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: tokens.chipBg, borderColor: tokens.chipBorder },
          cardStyle,
        ]}
      >
        <View style={styles.head}>
          <Text style={[styles.eyebrow, { color: tokens.tertiary }]}>
            TEST · ÉTAPE {def.n}/{TOTAL}
          </Text>
          <Pressable
            onPress={() => {
              haptic.light();
              onQuit?.();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Quitter le tutoriel"
          >
            <Text style={[styles.quit, { color: tokens.muted }]}>Quitter le tuto</Text>
          </Pressable>
        </View>
        <Text style={[styles.title, { color: tokens.primary }]} numberOfLines={1}>
          {def.title}
        </Text>
        {!compact && <Text style={[styles.body, { color: tokens.secondary }]}>{def.body}</Text>}
      </Animated.View>

      {/* La flèche montre le bouton central, juste en dessous. */}
      {def.point && !compact ? (
        <Animated.View style={[styles.arrow, arrowStyle]} pointerEvents="none">
          <AppIcon name="arrow" size={22} color={tokens.primary} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 9.5,
    letterSpacing: 2.2,
  },
  quit: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  arrow: {
    marginTop: 6,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
