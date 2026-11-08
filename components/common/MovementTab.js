import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import PressTap from './PressTap';
import AppIcon from './AppIcon';
import ExerciseAnimation, { ANIMATION_BG } from './ExerciseAnimation';
import { fonts } from '../../lib/fonts';

const PREMIUM_GOLD = '#F0C954';

/**
 * Languette « Voir le mouvement » de l'écran de séance (étape 5, 08/11/2026).
 *
 * Repliée : une petite pastille au-dessus des commandes, qui fait un léger
 * mouvement d'appel à chaque nouvel exercice. Dépliée : une carte compacte
 * avec l'animation de l'exercice EN COURS (effort) ou du suivant (repos,
 * `mode === 'next'`). Tout le monde voit la languette ; pour un non-Premium la
 * carte dit que l'animation en séance est réservée à Premium (elle reste
 * visible dans le planning, gratuite). Le fichier n'est même pas téléchargé
 * pour un non-Premium (voir useExerciseAnimation, `download`).
 *
 * Mémoïsé : l'écran de séance se redessine 10 fois par seconde, la languette
 * ne bouge que si ses propres valeurs changent.
 */
function MovementTab({
  anim,
  name,
  mode = 'now',
  open,
  onToggle,
  isPremium,
  paused = false,
  cardWidth,
  maxAnimHeight,
}) {
  const reduced = useReducedMotion();
  const ty = useSharedValue(0);

  // Appel discret à chaque nouvel exercice, seulement quand elle est repliée.
  useEffect(() => {
    if (open || reduced) return;
    ty.value = withSequence(
      withTiming(-6, { duration: 170 }),
      withTiming(0, { duration: 210 }),
      withTiming(-3, { duration: 150 }),
      withTiming(0, { duration: 190 })
    );
  }, [name, mode]);
  const bounce = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  if (!anim?.entry) return null;

  if (!open) {
    return (
      <Animated.View style={[styles.pillWrap, bounce]}>
        <PressTap
          onPress={onToggle}
          tapScale={0.95}
          hitSlop={8}
          accessibilityLabel={mode === 'next' ? 'Voir le mouvement suivant' : 'Voir le mouvement'}
          style={styles.pill}
        >
          <AppIcon name={isPremium ? 'dumbbell' : 'crown'} size={14} color={isPremium ? '#FFFFFF' : PREMIUM_GOLD} />
          <Text style={styles.pillText} numberOfLines={1}>
            {mode === 'next' ? 'Mouvement suivant' : 'Voir le mouvement'}
          </Text>
        </PressTap>
      </Animated.View>
    );
  }

  const ratio = anim.entry.width / anim.entry.height;
  const frameH = Math.min(maxAnimHeight, (cardWidth - 20) / ratio);
  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <PressTap onPress={onToggle} tapScale={0.98} accessibilityLabel="Replier" style={styles.head}>
        <Text style={styles.headLabel}>{mode === 'next' ? 'ENSUITE' : 'EN COURS'}</Text>
        <Text style={styles.headName} numberOfLines={1}>
          {name}
        </Text>
        <AppIcon name="close" size={14} color="rgba(255,255,255,0.7)" />
      </PressTap>
      {isPremium ? (
        <ExerciseAnimation
          entry={anim.entry}
          uri={anim.uri}
          failed={anim.status === 'error'}
          paused={paused}
          maxHeight={frameH}
          label={name}
        />
      ) : (
        <View style={[styles.locked, { height: frameH }]}>
          <AppIcon name="crown" size={22} color={PREMIUM_GOLD} />
          <Text style={styles.lockedTitle}>L’animation pendant la séance est réservée à Premium.</Text>
          <Text style={styles.lockedSub}>Tu la retrouves gratuitement dans ton planning.</Text>
        </View>
      )}
    </View>
  );
}

export default memo(MovementTab);

const styles = StyleSheet.create({
  pillWrap: {
    alignSelf: 'center',
    marginBottom: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(10,10,10,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  pillText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  card: {
    alignSelf: 'center',
    marginBottom: 8,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(10,10,10,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  headLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.45)',
  },
  headName: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  locked: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: ANIMATION_BG,
    borderWidth: 1,
    borderColor: 'rgba(240,201,84,0.25)',
  },
  lockedTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  lockedSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
  },
});
