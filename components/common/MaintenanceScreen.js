import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { D, slideInY, easeImpact } from '../../lib/animations';

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
const CARD_RADIUS = 28;

// Même exception que UpdateGate/MaintenanceBanner : jamais par-dessus le
// tutoriel (ni le chrono/countdown, au cas où le message arriverait pendant
// une séance déjà en cours au moment du montage).
const HIDDEN_ROUTES = new Set(['/', '/index', '/onboarding', '/countdown', '/running']);

/**
 * Intensité du halo selon la longueur du message : un texte long veut dire
 * « il se passe quelque chose d'important », le halo devient plus présent et
 * tourne plus vite ; un message d'une ligne reste discret. Seuils du brief
 * d'origine (<50 / 50-150 / >150 caractères).
 *
 * TRÈS discret : juste un scintillement subtil qu'on voit à peine, pas envahissant.
 */
const intensityFor = (length) => {
  if (length > 150) {
    return { ring: 0.15, glow: 0.08, duration: 1600, spread: 5, width: 1.5 };
  }
  if (length >= 50) {
    return { ring: 0.12, glow: 0.06, duration: 2500, spread: 4.5, width: 1.3 };
  }
  return { ring: 0.1, glow: 0.05, duration: 3500, spread: 4, width: 1.2 };
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
 * Vraie page de maintenance, plein écran — PAS un blocage : contrairement à
 * `APKBlockedScreen`, on peut toujours la fermer (croix, bouton, voile,
 * retour Android) et l'app continue derrière, comme le brief d'origine le
 * demande ("banner info discret, app continue"). Montée UNE fois par message
 * (`flexTimer_maintenanceSeen`, voir hooks/useAPKCheck.js) ; `MaintenanceBanner`
 * prend le relais ensuite et un tap dessus rouvre cette page.
 *
 * Remplace l'ancien `MaintenancePopup` (modale centrée) — gardait le même
 * halo (deux dégradés arc-en-ciel qui tournent ensemble, intensité pilotée
 * par la longueur du message) mais en page complète, plus impactante.
 */
export default function MaintenanceScreen({
  title = 'MAINTENANCE',
  message = '',
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [size, setSize] = useState(null);

  const tier = useMemo(() => intensityFor(message.length), [message]);
  // Jamais par-dessus le tutoriel : tant que la route est cachée, on ne
  // déclenche ni le haptique ni la capture du bouton retour Android — un
  // simple `return null` après les hooks ne suffirait pas, ces effets de
  // bord resteraient actifs derrière l'onboarding. Le contenu apparaît (et
  // les effets s'arment) dès que `pathname` change, sans démonter le
  // composant (monté une fois pour toute la durée du message dans
  // app/_layout.js).
  const isHidden = HIDDEN_ROUTES.has(pathname);

  const rot = useSharedValue(0);
  const halo = useSharedValue(0);

  useEffect(() => {
    if (isHidden) return undefined;
    haptic.light();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [isHidden]);

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

  const close = () => {
    haptic.light();
    onClose();
  };

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

  if (isHidden) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
    <View style={styles.root}>
      <LinearGradient
        colors={['#3A2F05', '#141005', '#000000']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.content,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
          ]}
        >
          <Animated.View entering={slideInY(10, D.base, 40)} style={styles.topRow}>
            <View style={styles.eyebrowRow}>
              <View style={styles.dots}>
                {MODE_DOTS.map((c) => (
                  <View key={c} style={[styles.dot, { backgroundColor: c }]} />
                ))}
              </View>
              <Text style={styles.eyebrow}>Maintenance en cours</Text>
            </View>
            <Pressable onPress={close} hitSlop={12} accessibilityLabel="Fermer">
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </Animated.View>

          <Animated.Text entering={slideInY(12, D.base, 100)} style={styles.title}>
            {title}
          </Animated.Text>

          {/*
            `onLayout` reste sur une View simple, jamais sur le noeud qui
            porte `entering` : le halo (juste en dessous) ne se monte
            qu'APRÈS ce premier onLayout, donc si c'était le même noeud,
            l'entrée en fondu de reanimated devait encaisser un changement
            d'enfants en plein milieu de sa propre transition — sur la
            Nouvelle Architecture, ça a laissé le fondu bloqué à son état
            initial (opacity 0) et donc la carte + son texte invisibles en
            permanence, alors que le halo (piloté par de simples
            useAnimatedStyle, pas par `entering`) s'affichait bien. Le texte
            vit maintenant dans son propre Animated.View, dont les enfants ne
            changent jamais après le montage.
          */}
          <View onLayout={onLayout} style={[styles.cardWrap, { padding: tier.width }]}>
            {size ? (
              <>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.layer,
                    { top: -g, left: -g, right: -g, bottom: -g, borderRadius: CARD_RADIUS + g },
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
                    { borderRadius: CARD_RADIUS },
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

            <Animated.View
              entering={slideInY(14, D.base, 180)}
              style={[styles.card, { borderRadius: CARD_RADIUS - tier.width }]}
            >
              <Text style={styles.message}>{message}</Text>
            </Animated.View>
          </View>

          <View style={styles.spacer} />

          <Animated.View entering={slideInY(14, D.base, 260)}>
            <PressTap onPress={close} accessibilityLabel="Fermer">
              <LinearGradient
                colors={RAINBOW.slice(0, 6)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>Fermer</Text>
              </LinearGradient>
            </PressTap>
            <Text style={styles.hint}>
              L'app reste utilisable normalement pendant la maintenance.
            </Text>
          </Animated.View>
        </View>
      </View>
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    // Rendu dans un <Modal> (couche native séparée, cf. plus haut) : plus
    // besoin de position:absolute/zIndex, le Modal EST déjà le conteneur
    // plein écran — flex:1 suffit à occuper tout l'espace disponible.
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  closeIcon: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: 'rgba(255,255,255,0.55)',
    padding: 4,
  },

  title: {
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    marginBottom: 24,
  },

  cardWrap: {
    borderRadius: CARD_RADIUS,
  },
  layer: {
    position: 'absolute',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'rgba(10,10,10,0.88)',
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  message: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(255,255,255,0.85)',
  },

  spacer: {
    flex: 1,
    minHeight: 24,
  },

  cta: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    letterSpacing: -0.15,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hint: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.38)',
    marginTop: 14,
  },
});
