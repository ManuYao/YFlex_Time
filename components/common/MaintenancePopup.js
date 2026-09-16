import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { D, easeImpact, springEnergetic } from '../../lib/animations';

// Rouge → orange → jaune → vert → bleu → violet → rouge. La dernière couleur
// répète la première : sans ça, la jointure du dégradé apparaîtrait comme une
// cassure nette qui tourne avec le halo.
const RAINBOW = [
  '#FF5454',
  '#FF8A3D',
  '#FFC933',
  '#1FC777',
  '#3DA5FF',
  '#9575FF',
  '#FF5454',
];

const MODE_DOTS = ['#FF5454', '#FFC933', '#1FC777', '#9575FF'];

const RADIUS = 28;

/**
 * Intensité du halo selon la longueur du message : un texte long veut dire
 * « il se passe quelque chose d'important », le halo devient plus présent et
 * tourne plus vite ; un message d'une ligne reste discret.
 * Seuils repris tels quels du brief (50 / 150 caractères).
 */
const intensityFor = (length) => {
  if (length > 150) {
    return { ring: 0.9, glow: 0.42, duration: 1600, spread: 22, width: 3.5 };
  }
  if (length >= 50) {
    return { ring: 0.7, glow: 0.28, duration: 2500, spread: 16, width: 3 };
  }
  return { ring: 0.5, glow: 0.16, duration: 3500, spread: 12, width: 2.5 };
};

// Un carré assez grand pour couvrir la carte quel que soit l'angle : son côté
// vaut la diagonale. Sinon les coins se videraient en tournant.
const square = (w, h) => {
  const side = Math.ceil(Math.sqrt(w * w + h * h));
  return {
    position: 'absolute',
    width: side,
    height: side,
    left: (w - side) / 2,
    top: (h - side) / 2,
  };
};

/**
 * Pop-up de maintenance — le message complet, montré UNE fois par texte
 * (hooks/useAPKCheck.js) ; le bandeau prend le relais ensuite. Non bloquante :
 * voile, bouton retour Android et « Fermer » referment tous les trois.
 *
 * Le halo est fait de deux copies du même dégradé qui tournent ensemble : une
 * grande qui déborde (la lueur) et une découpée au ras de la carte (la
 * bordure). Pas de BlurView pour l'adoucir : GrainOverlay est désactivé dans
 * ce projet, et flouter un dégradé sans dithering fait ressortir du banding
 * au lieu de l'adoucir (voir CLAUDE.md).
 */
export default function MaintenancePopup({ title = 'MAINTENANCE', message = '', onClose }) {
  const { width } = useWindowDimensions();
  const [size, setSize] = useState(null);

  const tier = useMemo(() => intensityFor(message.length), [message]);

  const rot = useSharedValue(0);
  const halo = useSharedValue(0);
  const backdrop = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  const close = () => {
    haptic.light();
    backdrop.value = withTiming(0, { duration: D.fast });
    opacity.value = withTiming(0, { duration: D.fast });
    scale.value = withTiming(0.94, { duration: D.fast, easing: easeImpact }, (done) => {
      if (done) runOnJS(onClose)();
    });
  };

  useEffect(() => {
    haptic.light();
    backdrop.value = withTiming(1, { duration: D.base, easing: easeImpact });
    scale.value = withSpring(1, springEnergetic);
    opacity.value = withTiming(1, { duration: D.base, easing: easeImpact });

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Rotation continue. `Easing.linear` est indispensable : le moindre easing
  // ferait accélérer puis ralentir le halo à chaque tour.
  useEffect(() => {
    rot.value = 0;
    rot.value = withRepeat(
      withTiming(360, { duration: tier.duration, easing: Easing.linear }),
      -1,
      false
    );
  }, [tier.duration]);

  // Le halo n'apparaît qu'une fois la carte mesurée : sans ce fondu on
  // verrait un carré de couleurs mal placé le temps du premier onLayout.
  useEffect(() => {
    if (size) halo.value = withTiming(1, { duration: D.slow, easing: easeImpact });
  }, [size]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: rot.value + 'deg' }],
  }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: halo.value * tier.ring }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: halo.value * tier.glow }));

  const onLayout = (e) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  };

  const g = tier.spread;

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />

      <Animated.View
        onLayout={onLayout}
        style={[
          styles.cardWrap,
          { maxWidth: Math.min(width - 40, 380), padding: tier.width },
          cardStyle,
        ]}
      >
        {size ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.layer,
                { top: -g, left: -g, right: -g, bottom: -g, borderRadius: RADIUS + g },
                glowStyle,
              ]}
            >
              <Animated.View style={[square(size.w + g * 2, size.h + g * 2), spinStyle]}>
                <LinearGradient
                  colors={RAINBOW}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.layer,
                StyleSheet.absoluteFillObject,
                { borderRadius: RADIUS },
                ringStyle,
              ]}
            >
              <Animated.View style={[square(size.w, size.h), spinStyle]}>
                <LinearGradient
                  colors={RAINBOW}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </Animated.View>
          </>
        ) : null}

        <View style={[styles.card, { borderRadius: RADIUS - tier.width }]}>
          <View style={styles.eyebrowRow}>
            <View style={styles.dots}>
              {MODE_DOTS.map((c) => (
                <View key={c} style={[styles.dot, { backgroundColor: c }]} />
              ))}
            </View>
            <Text style={styles.eyebrow}>Information</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <PressTap onPress={close} style={styles.cta} accessibilityLabel="Fermer">
            <Text style={styles.ctaText}>Fermer</Text>
          </PressTap>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 160,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  cardWrap: {
    width: '100%',
    borderRadius: RADIUS,
  },
  layer: {
    position: 'absolute',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#0A0A0A',
    paddingVertical: 24,
    paddingHorizontal: 22,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  eyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  message: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 22,
  },
  cta: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    letterSpacing: -0.15,
    color: '#0A0A0A',
  },
});
