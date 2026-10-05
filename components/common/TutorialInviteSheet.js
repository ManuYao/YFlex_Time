import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import BottomSheet from './BottomSheet';
import Button from './Button';
import AppIcon from './AppIcon';
import TickRing from './TickRing';
import { fonts } from '../../lib/fonts';
import { PAIR_GAP } from '../../lib/buttonTokens';
import { playSound } from '../../lib/sounds';
import { haptic } from '../../hooks/useHaptic';

const RING = 76;

/**
 * Pop-up qui PROPOSE le tutoriel de démarrage — jamais imposé : on peut dire
 * « Plus tard », ou « ne plus me le proposer », et le tour reste ouvert depuis
 * les Paramètres.
 *
 * À l'apparition : une vibration + un son, pour que la proposition se remarque
 * sans être agressive. Le son passe par le registre `lib/sounds.js` (clé
 * `tutorialInvite`) : le changer plus tard ne demande de toucher qu'une ligne
 * là-bas. Les deux respectent les réglages Sons et Vibrations de la personne.
 *
 * `onClose(choice)` est appelé une seule fois, à la fin de l'animation de
 * fermeture, avec 'accept' | 'never' | null (voile, retour Android, « Plus
 * tard »). Naviguer seulement à ce moment-là : partir pendant que la feuille se
 * ferme laisserait son BackHandler armé sous l'écran suivant.
 */
export default function TutorialInviteSheet({ screenH, onClose }) {
  const choiceRef = useRef(null);
  const reduceMotion = useReducedMotion();

  // Anneau qui "respire" + rebond d'arrivée : une invitation qui s'anime
  // doucement, sans attirer l'œil en boucle.
  const pop = useSharedValue(reduceMotion ? 1 : 0.6);
  const breathe = useSharedValue(0);

  useEffect(() => {
    haptic.success();
    playSound('tutorialInvite');
    if (!reduceMotion) {
      pop.value = withDelay(120, withSpring(1, { damping: 11, stiffness: 220 }));
      breathe.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }
    return () => cancelAnimation(breathe);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: pop.value > 1 ? 1 : pop.value,
    transform: [{ scale: pop.value * (1 + breathe.value * 0.04) }],
  }));

  return (
    <BottomSheet
      screenH={screenH}
      onClose={() => onClose?.(choiceRef.current)}
      zIndex={130}
    >
      {({ close }) => (
        <View>
          <Animated.View style={[styles.ringWrap, ringStyle]}>
            <TickRing
              progress={0.75}
              size={RING}
              colorActive="#FFFFFF"
              colorInactive="rgba(255,255,255,0.22)"
            />
            <View style={styles.ringCenter} pointerEvents="none">
              <AppIcon name="play" size={22} color="#FFFFFF" />
            </View>
          </Animated.View>

          <Text style={styles.title}>Un petit tour guidé ?</Text>
          <Text style={styles.body}>
            En 2 minutes, on te montre le menu et tu lances un premier chrono de test. Tu peux
            t'arrêter quand tu veux, et le retrouver plus tard dans les Paramètres.
          </Text>

          <View style={styles.actions}>
            <Button variant="glass" label="Plus tard" haptic={haptic.light} onPress={close} />
            <Button
              variant="solid"
              label="C'est parti"
              icon="play"
              onPress={() => {
                haptic.medium();
                choiceRef.current = 'accept';
                close();
              }}
              style={styles.confirm}
            />
          </View>

          <Pressable
            onPress={() => {
              haptic.light();
              choiceRef.current = 'never';
              close();
            }}
            hitSlop={8}
            style={styles.neverShow}
          >
            <Text style={styles.neverShowText}>Non merci, ne plus me le proposer</Text>
          </Pressable>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  ringWrap: {
    width: RING,
    height: RING,
    marginBottom: 14,
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 19,
    color: '#FFFFFF',
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.62)',
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PAIR_GAP,
    marginTop: 22,
  },
  confirm: {
    flex: 1,
  },
  neverShow: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  neverShowText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.40)',
    textDecorationLine: 'underline',
  },
});
