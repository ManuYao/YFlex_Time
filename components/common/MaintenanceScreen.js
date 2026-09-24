import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, BackHandler, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import Button from './Button';
import IconButton from './IconButton';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { D, slideInY, easeImpact } from '../../lib/animations';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Rouge → orange → jaune → vert → bleu → violet, en diagonale sur le contour.
const RAINBOW = ['#FF5454', '#FF8A3D', '#FFC933', '#1FC777', '#3DA5FF', '#9575FF'];

const MODE_DOTS = ['#FF5454', '#FFC933', '#1FC777', '#9575FF'];
const CARD_RADIUS = 24;
// Place laissée autour de la carte pour que la lueur du contour ne soit pas
// rognée par les bords du Svg.
const HALO_MARGIN = 5;
const LINE_WIDTH = 1.5;
const GLOW_WIDTH = 7;

// Même exception que UpdateGate/MaintenanceBanner : jamais par-dessus le
// tutoriel (ni le chrono/countdown, au cas où le message arriverait pendant
// une séance déjà en cours au moment du montage).
const HIDDEN_ROUTES = new Set(['/', '/index', '/onboarding', '/countdown', '/running']);

/**
 * Le halo est un CONTOUR fin arc-en-ciel qui épouse le bord de la carte, avec
 * une lueur à peine visible et un reflet coloré qui en fait lentement le tour
 * (refait le 24/09/2026 à la demande de l'utilisateur : l'ancien halo — un
 * grand carré arc-en-ciel qui tournait derrière la carte, affiché à 5-15 %
 * d'opacité — ressortait délavé, « énorme » et « pas coloré »).
 *
 * Intensité selon la longueur du message (seuils du brief d'origine,
 * <50 / 50-150 / >150 caractères) : un texte long veut dire « il se passe
 * quelque chose d'important », le contour est un peu plus présent et le
 * reflet tourne un peu plus vite. Toujours discret.
 */
const intensityFor = (length) => {
  if (length > 150) return { line: 0.75, glow: 0.16, duration: 4200 };
  if (length >= 50) return { line: 0.65, glow: 0.12, duration: 5600 };
  return { line: 0.55, glow: 0.09, duration: 7000 };
};

/**
 * Vraie page de maintenance, plein écran — PAS un blocage : contrairement à
 * `APKBlockedScreen`, on peut toujours la fermer (croix, bouton, voile,
 * retour Android) et l'app continue derrière, comme le brief d'origine le
 * demande ("banner info discret, app continue"). Montée UNE fois par message
 * (`flexTimer_maintenanceSeen`, voir hooks/useAPKCheck.js) ; `MaintenanceBanner`
 * prend le relais ensuite et un tap dessus rouvre cette page.
 *
 * Remplace l'ancien `MaintenancePopup` (modale centrée), en page complète.
 * Titre et message sont centrés au milieu de la page (ils étaient collés en
 * haut, texte aligné à gauche — « même pas centré », retour utilisateur).
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

  const trace = useSharedValue(0);
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

  // Reflet qui fait le tour du contour. `Easing.linear` est indispensable :
  // le moindre easing le ferait accélérer puis ralentir à chaque tour.
  useEffect(() => {
    trace.value = 0;
    trace.value = withRepeat(
      withTiming(1, { duration: tier.duration, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(trace);
  }, [tier.duration]);

  // Le contour n'apparaît qu'une fois la carte mesurée ET arrivée à sa place
  // (son entrée glisse de 14 px pendant D.base, après 180 ms) : fondu
  // retardé, sinon on le verrait immobile pendant que la carte glisse dessous.
  useEffect(() => {
    if (size) {
      halo.value = withDelay(180 + D.base, withTiming(1, { duration: D.slow, easing: easeImpact }));
    }
  }, [size]);

  const close = () => {
    haptic.light();
    onClose();
  };

  const onLayout = (e) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  };

  // Le trait est centré sur une ligne rentrée d'un demi-trait : il couvre
  // pile le bord de la carte, sans déborder. Le reflet est un tiret du même
  // trait (strokeDasharray) qu'on fait glisser tout le long du périmètre.
  const border = useMemo(() => {
    if (!size) return null;
    const rw = size.w - LINE_WIDTH;
    const rh = size.h - LINE_WIDTH;
    const r = Math.max(0, Math.min(CARD_RADIUS - LINE_WIDTH / 2, rw / 2, rh / 2));
    const perimeter = 2 * (rw + rh) - 8 * r + 2 * Math.PI * r;
    return {
      x: HALO_MARGIN + LINE_WIDTH / 2,
      y: HALO_MARGIN + LINE_WIDTH / 2,
      rw,
      rh,
      r,
      perimeter,
      comet: Math.min(perimeter * 0.14, 120),
    };
  }, [size]);
  const perimeter = border ? border.perimeter : 0;

  const cometProps = useAnimatedProps(() => ({
    strokeDashoffset: -trace.value * perimeter,
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value }));

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
            {/* Vibration déjà dans `close` : pas de prop `haptic`. */}
            <IconButton icon="close" onPress={close} accessibilityLabel="Fermer" />
          </Animated.View>

          {/* Titre + carte centrés dans toute la hauteur libre, entre l'en-tête
              et le bouton Fermer. */}
          <View style={styles.middle}>
            <Animated.Text entering={slideInY(12, D.base, 100)} style={styles.title}>
              {title}
            </Animated.Text>

            {/*
              `onLayout` reste sur une View simple, jamais sur le noeud qui
              porte `entering` : le contour (juste en dessous) ne se monte
              qu'APRÈS ce premier onLayout, donc si c'était le même noeud,
              l'entrée en fondu de reanimated devait encaisser un changement
              d'enfants en plein milieu de sa propre transition — sur la
              Nouvelle Architecture, ça a laissé le fondu bloqué à son état
              initial (opacity 0) et donc la carte + son texte invisibles en
              permanence. Le texte vit dans son propre Animated.View, dont
              les enfants ne changent jamais après le montage ; le contour est
              un frère ajouté APRÈS lui, donc dessiné par-dessus son bord.
            */}
            <View onLayout={onLayout} style={styles.cardWrap}>
              <Animated.View entering={slideInY(14, D.base, 180)} style={styles.card}>
                <Text style={styles.message}>{message}</Text>
              </Animated.View>

              {border ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.border,
                    { width: size.w + HALO_MARGIN * 2, height: size.h + HALO_MARGIN * 2 },
                    haloStyle,
                  ]}
                >
                  <Svg width={size.w + HALO_MARGIN * 2} height={size.h + HALO_MARGIN * 2}>
                    <Defs>
                      <SvgGradient id="maintenanceRainbow" x1="0" y1="0" x2="1" y2="1">
                        {RAINBOW.map((c, i) => (
                          <Stop key={c} offset={i / (RAINBOW.length - 1)} stopColor={c} stopOpacity={1} />
                        ))}
                      </SvgGradient>
                    </Defs>
                    {/* Lueur : trait large et très pâle, centré sur le bord. */}
                    <Rect
                      x={border.x}
                      y={border.y}
                      width={border.rw}
                      height={border.rh}
                      rx={border.r}
                      ry={border.r}
                      fill="none"
                      stroke="url(#maintenanceRainbow)"
                      strokeOpacity={tier.glow}
                      strokeWidth={GLOW_WIDTH}
                    />
                    {/* Contour fin, sur tout le tour. */}
                    <Rect
                      x={border.x}
                      y={border.y}
                      width={border.rw}
                      height={border.rh}
                      rx={border.r}
                      ry={border.r}
                      fill="none"
                      stroke="url(#maintenanceRainbow)"
                      strokeOpacity={tier.line}
                      strokeWidth={LINE_WIDTH}
                    />
                    {/* Reflet coloré qui fait lentement le tour. */}
                    <AnimatedRect
                      x={border.x}
                      y={border.y}
                      width={border.rw}
                      height={border.rh}
                      rx={border.r}
                      ry={border.r}
                      fill="none"
                      stroke="url(#maintenanceRainbow)"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeDasharray={[border.comet, border.perimeter - border.comet]}
                      animatedProps={cometProps}
                    />
                  </Svg>
                </Animated.View>
              ) : null}
            </View>
          </View>

          <Animated.View entering={slideInY(14, D.base, 260)}>
            <Button variant="spectrum" fullWidth label="Fermer" onPress={close} />
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

  middle: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  // lineHeight à ×1,18 pour Anton (piège n°19 : égal à la taille, le glyphe
  // est rogné et déborde sur ses voisins).
  title: {
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 54,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 22,
  },

  cardWrap: {
    borderRadius: CARD_RADIUS,
  },
  // Le Svg du contour déborde de HALO_MARGIN de chaque côté, pour la lueur.
  border: {
    position: 'absolute',
    top: -HALO_MARGIN,
    left: -HALO_MARGIN,
  },
  card: {
    backgroundColor: 'rgba(10,10,10,0.88)',
    borderRadius: CARD_RADIUS,
    paddingVertical: 24,
    paddingHorizontal: 22,
  },
  message: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
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
