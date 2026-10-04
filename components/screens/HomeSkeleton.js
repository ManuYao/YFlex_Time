import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SkeletonGroup, SkeletonBlock } from '../common/Skeleton';
import { BOTTOM_GAP, BUTTON_HEIGHT, ROUND_SIZE, SIDE_GAP } from '../../lib/buttonTokens';
import { scaled, useLayoutLevel, useUiScale } from '../../lib/responsive';

// Fond : le gris du timer BASIC (lib/timers-config.js) — un gris d'atelier, pas
// du noir. C'est le fond le plus neutre de l'app : il ne laisse pas deviner quel
// timer s'ouvre (voir le commentaire du composant).
const BG = ['#3A3A3A', '#1A1A1A', '#080808'];
const BG_LOCATIONS = [0, 0.45, 1];

// Matière des blocs : un gris translucide plus clair que celui du Skeleton de
// base (conçu pour le fond noir du Profil), sinon ils se perdent sur du gris.
const FILL = 'rgba(255,255,255,0.17)';
const FILL_SOFT = 'rgba(255,255,255,0.09)';
const EDGE = 'rgba(255,255,255,0.10)';

const TICKS = 60;
// Longueur de la « comète » qui tourne sur l'anneau, en graduations.
const COMET_TICKS = 14;
const SPIN_MS = 2600;

// Même géométrie que TickRing (components/common/TickRing.js) : l'anneau du
// squelette est celui de la vraie carte, graduation par graduation.
function tickGeometry(size) {
  const center = size / 2;
  const outer = size / 2 - 4;
  const inner = outer - 18;
  return Array.from({ length: TICKS }).map((_, i) => {
    const angle = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    const r1 = major ? inner - 4 : inner;
    return {
      x1: center + Math.cos(angle) * r1,
      y1: center + Math.sin(angle) * r1,
      x2: center + Math.cos(angle) * outer,
      y2: center + Math.sin(angle) * outer,
      major,
    };
  });
}

/**
 * L'anneau à 60 graduations en gris, avec un reflet qui en fait le tour. Le
 * reflet n'est qu'un calque qui TOURNE (transform sur le fil d'interface) : il
 * continue de glisser même pendant que le JavaScript monte l'accueil derrière.
 * `strokeOpacity` plutôt qu'un rgba : react-native-svg ignore l'alpha d'un rgba
 * (piège n°13 du CLAUDE.md).
 */
function SkeletonRing({ size, reduceMotion }) {
  const ticks = useMemo(() => tickGeometry(size), [size]);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      spin.value = 0;
      return undefined;
    }
    spin.value = withRepeat(withTiming(1, { duration: SPIN_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(spin);
  }, [reduceMotion]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  return (
    <View style={{ width: size, height: size }}>
      {/* Halo doux derrière l'anneau : de la profondeur, sans couleur. */}
      <Svg
        width={size * 1.6}
        height={size * 1.6}
        style={[styles.glow, { left: -size * 0.3, top: -size * 0.3 }]}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="homeSkelGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.11" />
            <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0.03" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size * 0.8} cy={size * 0.8} r={size * 0.8} fill="url(#homeSkelGlow)" />
      </Svg>

      {/* Les 60 graduations, éteintes. */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        {ticks.map((g, i) => (
          <Line
            key={i}
            x1={g.x1}
            y1={g.y1}
            x2={g.x2}
            y2={g.y2}
            stroke="#FFFFFF"
            strokeOpacity={g.major ? 0.22 : 0.13}
            strokeWidth={g.major ? 2.5 : 1.5}
            strokeLinecap="round"
          />
        ))}
      </Svg>

      {/* La comète : les graduations qui précèdent la tête s'éteignent peu à peu. */}
      <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {Array.from({ length: COMET_TICKS }).map((_, k) => {
            const g = ticks[(TICKS - k) % TICKS];
            const fade = Math.pow(1 - k / COMET_TICKS, 1.6);
            return (
              <Line
                key={k}
                x1={g.x1}
                y1={g.y1}
                x2={g.x2}
                y2={g.y2}
                stroke="#FFFFFF"
                strokeOpacity={0.62 * fade}
                strokeWidth={g.major ? 2.5 : 1.5}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Un reflet qui traverse son parent (à poser dans une vue `overflow: 'hidden'`). */
function Shimmer({ width, reduceMotion, delay = 600 }) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || width <= 0) return undefined;
    t.value = 0;
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, false)
    );
    return () => cancelAnimation(t);
  }, [reduceMotion, width, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -width * 0.6 + t.value * width * 1.9 }, { rotate: '16deg' }],
  }));

  if (reduceMotion || width <= 0) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.shimmer, { width: width * 0.45 }, style]}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/** Une case de réglage : étiquette + valeur, avec un liseré comme la vraie carte. */
function StatCard() {
  return (
    <View style={styles.stat}>
      <SkeletonBlock width={34} height={8} radius={4} style={styles.fillSoft} />
      <SkeletonBlock width={58} height={18} radius={7} style={styles.fill} />
    </View>
  );
}

/** Bouton rond de la barre du haut : disque à liseré avec un pictogramme éteint. */
function RoundPlaceholder() {
  return (
    <View style={styles.round}>
      <SkeletonBlock width={16} height={16} radius={5} style={styles.fill} />
    </View>
  );
}

/**
 * Squelette de l'accueil : la silhouette d'une carte de timer (barre du haut,
 * anneau à graduations, trois réglages, points, bouton Lancer) sur un fond gris.
 *
 * Volontairement NEUTRE (gris, ni la couleur d'un mode ni son nom) : on ne sait
 * pas encore sur quel timer l'accueil va s'ouvrir — c'est justement ce que le
 * démarrage intelligent (lib/smartStart.js) est en train de décider. Une couleur
 * devinée à tort ferait un éclair avant la bonne.
 *
 * Mêmes tailles que la vraie carte (anneau 320, 260 en fenêtre courte, plus
 * d'anneau en mini) : au fondu, rien ne saute. Si la mise en page de l'accueil
 * change, la mettre à jour ici aussi.
 */
export default function HomeSkeleton() {
  const insets = useSafeAreaInsets();
  const ui = useUiScale();
  const level = useLayoutLevel();
  const reduceMotion = useReducedMotion();
  const isMini = level === 'mini';
  const isCompact = level === 'compact';
  const ring = scaled(isCompact ? 260 : 320, ui);
  const [ctaW, setCtaW] = useState(0);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={BG}
        locations={BG_LOCATIONS}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SkeletonGroup style={styles.group}>
        {/* ── Barre du haut : menu, étiquette du mode, profil ── */}
        <View style={styles.topBar}>
          <RoundPlaceholder />
          <View style={styles.tagPill}>
            <SkeletonBlock width={54} height={8} radius={4} style={styles.fill} />
          </View>
          <RoundPlaceholder />
        </View>

        {/* ── Carte : description, anneau (ou ligne en mini), réglages ── */}
        <View style={styles.card}>
          {!isMini && (
            <View style={styles.description}>
              <SkeletonBlock width="70%" height={10} radius={5} style={styles.fillSoft} />
              <SkeletonBlock width="46%" height={10} radius={5} style={styles.fillSoft} />
            </View>
          )}

          {isMini ? (
            <View style={styles.miniHero}>
              <SkeletonBlock width={86} height={20} radius={7} style={styles.fill} />
              <SkeletonBlock width={1.5} height={26} radius={1} style={styles.fillSoft} />
              <SkeletonBlock width={64} height={30} radius={9} style={styles.fill} />
            </View>
          ) : (
            <View style={[styles.ringWrap, { width: ring, height: ring }]}>
              <SkeletonRing size={ring} reduceMotion={reduceMotion} />
              {/* Le cœur de l'anneau : l'unité, le grand chiffre, le nom. */}
              <View style={styles.ringCenter} pointerEvents="none">
                <SkeletonBlock width={34} height={9} radius={5} style={styles.fillSoft} />
                <SkeletonBlock width={ring * 0.42} height={ring * 0.2} radius={ring * 0.06} style={styles.fill} />
                <SkeletonBlock width={ring * 0.26} height={13} radius={7} style={styles.fillSoft} />
              </View>
            </View>
          )}

          {!isMini && (
            <View style={styles.stats}>
              <StatCard />
              <StatCard />
              <StatCard />
            </View>
          )}
        </View>

        {/* ── Bas : points de pagination, bouton Lancer ── */}
        <View style={styles.bottom}>
          {!isMini && (
            <View style={styles.dots}>
              {[0, 1, 2, 3, 4].map((i) => (
                <SkeletonBlock
                  key={i}
                  width={i === 0 ? 22 : 8}
                  height={8}
                  radius={4}
                  style={i === 0 ? styles.fill : styles.fillSoft}
                />
              ))}
            </View>
          )}
          <View style={styles.cta} onLayout={(e) => setCtaW(e.nativeEvent.layout.width)}>
            <SkeletonBlock width={96} height={12} radius={6} style={styles.fill} />
            <Shimmer width={ctaW} reduceMotion={reduceMotion} />
          </View>
        </View>
      </SkeletonGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  group: {
    flex: 1,
  },

  // Matière des blocs (écrase le gris du Skeleton de base, trop sombre ici).
  fill: {
    backgroundColor: FILL,
  },
  fillSoft: {
    backgroundColor: FILL_SOFT,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  round: {
    width: ROUND_SIZE.nav,
    height: ROUND_SIZE.nav,
    borderRadius: ROUND_SIZE.nav / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FILL_SOFT,
    borderWidth: 1,
    borderColor: EDGE,
  },
  tagPill: {
    height: 26,
    paddingHorizontal: 16,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FILL_SOFT,
    borderWidth: 1,
    borderColor: EDGE,
  },

  card: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  description: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  ringWrap: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  miniHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },

  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 10,
  },
  stat: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: FILL_SOFT,
    borderWidth: 1,
    borderColor: EDGE,
  },

  bottom: {
    paddingHorizontal: SIDE_GAP,
    paddingBottom: BOTTOM_GAP,
    gap: 18,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Le bouton Lancer : une capsule de verre éteinte, un reflet la traverse.
  cta: {
    height: BUTTON_HEIGHT.lg,
    borderRadius: BUTTON_HEIGHT.lg / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  shimmer: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    left: 0,
  },
});
