import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import IconButton from './IconButton';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { D, easeImpact, springSheet } from '../../lib/animations';

// Même exception que la feuille "Nouvelle version" (UpdateGate) : rien ne
// s'affiche par-dessus un chrono en cours, le compte à rebours, ou le
// tutoriel. Le bandeau revient dès que l'utilisateur en sort.
const HIDDEN_ROUTES = new Set(['/', '/index', '/onboarding', '/countdown', '/running']);

const ACCENT = '#FFC933';

/**
 * Bandeau de maintenance — discret, non bloquant : l'app continue de
 * fonctionner normalement derrière. Il glisse du haut, reste tant que la
 * maintenance est annoncée, et se referme d'un tap sur la croix (pour la
 * session en cours ; il revient au prochain lancement si la maintenance
 * n'est pas terminée).
 *
 * Le détail complet est dans la page (MaintenanceScreen), montrée une fois
 * par message : ici on ne garde que deux lignes.
 */
export default function MaintenanceBanner({ message, onPress, onDismiss }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-160);
  const opacity = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(400, withSpring(0, springSheet));
    opacity.value = withDelay(400, withTiming(1, { duration: D.base, easing: easeImpact }));
    // Le point respire lentement : signale « c'est en cours », sans
    // clignoter au point de tirer l'œil pendant l'usage de l'app.
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const close = () => {
    haptic.light();
    opacity.value = withTiming(0, { duration: D.fast });
    translateY.value = withTiming(-160, { duration: D.fast, easing: easeImpact }, (done) => {
      if (done && onDismiss) runOnJS(onDismiss)();
    });
  };

  if (!message || HIDDEN_ROUTES.has(pathname)) return null;

  return (
    <Animated.View
      style={[styles.root, { paddingTop: insets.top + 8 }, rootStyle]}
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.card}
        onPress={onPress}
        disabled={!onPress}
        accessibilityLabel="Maintenance en cours"
      >
        <Animated.View style={[styles.dot, dotStyle]} />
        <View style={styles.texts}>
          <Text style={styles.label}>Maintenance</Text>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
        {/* Vibration déjà dans `close` : pas de prop `haptic`. */}
        <IconButton
          icon="close"
          variant="ghost"
          size={32}
          iconSize={13}
          hitSlop={12}
          onPress={close}
          accessibilityLabel="Fermer"
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    zIndex: 150,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(14,14,14,0.96)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,201,51,0.35)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    // Le bandeau flotte au-dessus d'écrans très colorés : sans ombre il se
    // fond dans le fond sur AMRAP ou TABATA.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: ACCENT,
  },
  message: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.82)',
  },
});
