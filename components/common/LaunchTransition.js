import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import LaunchRing, { FineCrown, RadialGlow } from './LaunchRing';
import LaunchBurst from './LaunchBurst';
import useAmbiance from '../../hooks/useAmbiance';
import { accentTextOn } from '../../lib/buttonTokens';
import { fonts } from '../../lib/fonts';
import {
  LAUNCH_GLOW_REST,
  burstParticles,
  launchRingSize,
  rgbToHex,
} from '../../lib/launchVisuals';

/**
 * Transition de lancement (accueil → décompte). Remplace l'ancien « bouton qui devient un gros
 * disque » : le bouton Lancer se resserre en point lumineux, monte au centre de l'écran et
 * s'épanouit en anneau de 60 graduations qui s'allument en vague — le langage de l'app — pendant
 * que le nom du mode se pose dans l'anneau.
 *
 * Elle s'arrête sur l'image EXACTE où commence le décompte (app/countdown.js) : même anneau, même
 * taille, même centre, même lueur (LAUNCH_GLOW_REST). Le changement d'écran est donc invisible.
 *
 * Avec une ambiance de saison active : lueur teintée, fine couronne de repères aux couleurs de
 * la saison, tête de comète teintée, et une rafale de formes de la saison (feuilles, flocons,
 * pétales…) qui jaillit à l'arrivée. Sans ambiance (réglage « Aucune ») : la même transition, en
 * blanc (ou noir sur un mode à texte noir), avec quelques étincelles discrètes.
 *
 * Légèreté : uniquement `transform` et `opacity` sur le fil d'interface (aucune largeur, hauteur
 * ni position animée). Le bouton qui se resserre est fait de deux demi-disques et d'un rectangle
 * qui rétrécit, justement pour ne rien animer de la mise en page. « Réduire les animations » :
 * seul un fondu reste.
 */

export const LAUNCH_TOTAL_MS = 1760;
const REDUCED_TOTAL_MS = 950;

// Calendrier (ms depuis le tap).
const COND_MS = 300; // le bouton se resserre en disque
const FLIGHT_AT = 170;
const FLIGHT_MS = 600; // le disque monte au centre
const ARRIVE_AT = FLIGHT_AT + FLIGHT_MS;
const RING_AT = 740; // la vague de graduations part avant l'arrivée : la comète « reçoit » le point
const SWEEP_MS = 480;
const RISE_MS = 110;
const FALL_MS = 360;

const E_OUT = Easing.out(Easing.cubic);
const E_INOUT = Easing.bezier(0.45, 0, 0.2, 1);
const E_FLY = Easing.bezier(0.55, 0, 0.2, 1);

function LaunchTransition({ timer, ctaRect, screenW, screenH, onComplete }) {
  const reduced = useReducedMotion();
  const { ambiance } = useAmbiance();

  const cx = screenW / 2;
  const cy = screenH / 2;
  const R = launchRingSize(screenW, screenH);

  // Encre de l'anneau et du texte : la même règle que le décompte (texte du mode).
  const ink = timer.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF';
  const labelInk = accentTextOn(timer.color, timer.textMode);
  const accent = ambiance ? ambiance.accent : ink;
  const glowColor = ambiance ? rgbToHex(ambiance.glow) : '#FFFFFF';

  // Le bouton Lancer tel que mesuré au tap.
  const w = ctaRect.width;
  const h = ctaRect.height;
  const bx = ctaRect.x + w / 2;
  const by = ctaRect.y + h / 2;
  const dx = cx - bx;
  const dy = cy - by;
  const gap = Math.max(0, (w - h) / 2);

  const total = reduced ? REDUCED_TOTAL_MS : LAUNCH_TOTAL_MS;

  const cond = useSharedValue(0);
  const fly = useSharedValue(0);
  const pop = useSharedValue(0);
  const labelOp = useSharedValue(1);
  const capsuleOp = useSharedValue(1);
  const shock = useSharedValue(0);
  const glowOp = useSharedValue(reduced ? LAUNCH_GLOW_REST : 0);
  const glowScale = useSharedValue(reduced ? 1 : 0.6);
  const heroPret = useSharedValue(0);
  const heroName = useSharedValue(0);
  const heroTag = useSharedValue(0);
  const heroBar = useSharedValue(0);
  const heroOut = useSharedValue(0);
  const crownOp = useSharedValue(0);
  const crownRot = useSharedValue(0);
  const burst = useSharedValue(0);
  const done = useSharedValue(0);

  // Une seule fin, quelle que soit la source (fin d'animation ou minuterie de secours).
  const finishedRef = useRef(false);
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (reduced) {
      labelOp.value = withTiming(0, { duration: 160 });
      capsuleOp.value = withTiming(0, { duration: 220 });
      heroPret.value = withDelay(120, withTiming(1, { duration: 300 }));
      heroName.value = withDelay(160, withTiming(1, { duration: 320 }));
      heroTag.value = withDelay(260, withTiming(1, { duration: 300 }));
      heroBar.value = withDelay(320, withTiming(1, { duration: 300 }));
      heroOut.value = withDelay(total - 220, withTiming(1, { duration: 200 }));
    } else {
      labelOp.value = withTiming(0, { duration: 140 });
      cond.value = withTiming(1, { duration: COND_MS, easing: E_INOUT });
      fly.value = withDelay(FLIGHT_AT, withTiming(1, { duration: FLIGHT_MS, easing: E_FLY }));
      pop.value = withDelay(ARRIVE_AT, withTiming(1, { duration: 280, easing: E_OUT }));
      shock.value = withDelay(ARRIVE_AT, withTiming(1, { duration: 700, easing: E_OUT }));
      glowOp.value = withDelay(
        RING_AT,
        withSequence(
          withTiming(0.55, { duration: 240, easing: E_OUT }),
          withTiming(LAUNCH_GLOW_REST, { duration: 520, easing: E_INOUT })
        )
      );
      glowScale.value = withDelay(RING_AT, withTiming(1, { duration: 760, easing: E_OUT }));
      heroPret.value = withDelay(930, withTiming(1, { duration: 420, easing: E_OUT }));
      heroName.value = withDelay(980, withTiming(1, { duration: 520, easing: E_OUT }));
      heroTag.value = withDelay(1150, withTiming(1, { duration: 360, easing: E_OUT }));
      heroBar.value = withDelay(1230, withTiming(1, { duration: 380, easing: E_OUT }));
      heroOut.value = withDelay(1450, withTiming(1, { duration: 250, easing: E_INOUT }));
      burst.value = withDelay(ARRIVE_AT, withTiming(1, { duration: 950, easing: Easing.linear }));
      if (ambiance) {
        crownOp.value = withDelay(
          780,
          withSequence(
            withTiming(1, { duration: 320, easing: E_OUT }),
            withDelay(350, withTiming(0, { duration: 300, easing: E_INOUT }))
          )
        );
        crownRot.value = withDelay(780, withTiming(36, { duration: 1000, easing: Easing.linear }));
      }
    }
    done.value = withDelay(
      total,
      withTiming(1, { duration: 1 }, (finished) => {
        if (finished) runOnJS(finish)();
      })
    );
    // Secours : si l'animation ne signalait jamais sa fin, la séance part quand même.
    const fallback = setTimeout(finish, total + 700);
    return () => clearTimeout(fallback);
  }, []);

  /* ───── styles animés ───── */

  const wrapStyle = useAnimatedStyle(() => {
    const f = fly.value;
    return {
      opacity: capsuleOp.value * (1 - pop.value),
      transform: [
        { translateX: dx * f },
        { translateY: dy * f },
        { scale: 1 - 0.1 * f + 0.8 * pop.value },
      ],
    };
  });
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: gap * cond.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -gap * cond.value }] }));
  const midStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.001, 1 - cond.value) }],
  }));
  // Le disque passe de la couleur du mode à l'encre pendant son vol : il devient lumière.
  const modeColor = timer.color; // un worklet ne capture jamais tout l'objet `timer`
  const colorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fly.value, [0, 1], [modeColor, ink]),
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOp.value }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOp.value,
    transform: [{ scale: glowScale.value }],
  }));
  const shockStyle = useAnimatedStyle(() => ({
    opacity: 0.6 * Math.pow(1 - shock.value, 1.5),
    transform: [{ scale: 0.3 + 0.95 * shock.value }],
  }));
  const crownStyle = useAnimatedStyle(() => ({
    opacity: crownOp.value,
    transform: [{ rotate: `${crownRot.value}deg` }],
  }));

  const pretStyle = useAnimatedStyle(() => ({
    opacity: heroPret.value * (1 - heroOut.value),
    transform: [{ translateY: (1 - heroPret.value) * 10 }],
  }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: heroName.value * (1 - heroOut.value),
    transform: [{ translateY: (1 - heroName.value) * 14 }, { scale: 0.94 + 0.06 * heroName.value }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: heroTag.value * (1 - heroOut.value),
    transform: [{ translateY: (1 - heroTag.value) * 8 }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: heroBar.value * (1 - heroOut.value),
    transform: [{ scaleX: Math.max(0.001, heroBar.value) }],
  }));

  /* ───── rafale ───── */

  const particles = useMemo(() => {
    if (reduced) return [];
    if (ambiance) {
      const dir = ambiance.dir;
      return burstParticles({
        seed: `launch-${ambiance.id}`,
        count: 12,
        minDist: R * 0.5,
        maxDist: R * 1.0,
        minSize: 16,
        maxSize: 26,
        kinds: ambiance.motifs,
        drift: dir === 0 ? 0 : dir > 0 ? R * 0.45 : -R * 0.45,
        spin: 120,
        delayMax: 0.28,
        alpha: 0.95,
      });
    }
    return burstParticles({
      seed: `launch-${timer.id}`,
      count: 10,
      minDist: R * 0.55,
      maxDist: R * 0.95,
      minSize: 3,
      maxSize: 6,
      colors: [ink],
      spin: 0,
      delayMax: 0.3,
      alpha: 0.8,
    });
  }, [reduced, ambiance, R, ink, timer.id]);

  const nameSize = Math.round(R * 0.24);
  const glowSize = R * 1.9;
  const crownRadius = R / 2 + 8;
  const crownBox = (crownRadius + 2) * 2;
  const heroMaxW = R - 64;

  return (
    <View style={styles.layer} pointerEvents="none">
      {/* Lueur ronde derrière l'anneau */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.abs,
          { left: cx - glowSize / 2, top: cy - glowSize / 2, width: glowSize, height: glowSize },
          glowStyle,
        ]}
      >
        <RadialGlow size={glowSize} color={glowColor} id="launchGlowHome" />
      </Animated.View>

      {/* Fine couronne de la saison */}
      {ambiance && !reduced ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.abs,
            { left: cx - crownBox / 2, top: cy - crownBox / 2, width: crownBox, height: crownBox },
            crownStyle,
          ]}
        >
          <FineCrown radius={crownRadius} color={ambiance.accent} opacity={0.7} />
        </Animated.View>
      ) : null}

      {/* L'anneau de 60 graduations */}
      <View
        pointerEvents="none"
        style={[styles.abs, { left: cx - R / 2, top: cy - R / 2, width: R, height: R }]}
      >
        <LaunchRing
          size={R}
          color={ink}
          mode={reduced ? 'static' : 'ignite'}
          startDelay={RING_AT}
          sweepMs={SWEEP_MS}
          riseMs={RISE_MS}
          fallMs={FALL_MS}
        />
      </View>

      {/* Tête de comète qui parcourt l'anneau avec la vague */}
      {!reduced ? <CometHead cx={cx} cy={cy} R={R} color={accent} ink={ink} /> : null}

      {/* Onde de choc à l'arrivée du point */}
      {!reduced ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.abs,
            {
              left: cx - R / 2,
              top: cy - R / 2,
              width: R,
              height: R,
              borderRadius: R / 2,
              borderWidth: 2,
              borderColor: accent,
            },
            shockStyle,
          ]}
        />
      ) : null}

      {/* Étincelles / formes de la saison */}
      {!reduced ? (
        <LaunchBurst progress={burst} particles={particles} x={cx} y={cy} ink={ink} accent={accent} />
      ) : null}

      {/* Le nom du mode, posé dans l'anneau */}
      <View style={styles.heroBox} pointerEvents="none">
        <Animated.Text
          style={[styles.pret, { color: timer.textMode === 'dark' ? 'rgba(10,10,10,0.75)' : 'rgba(255,255,255,0.9)' }, pretStyle]}
        >
          PRÊT
        </Animated.Text>
        <Animated.View style={[{ maxWidth: heroMaxW }, nameStyle]}>
          <Text
            style={[
              styles.name,
              { color: ink, fontSize: nameSize, lineHeight: Math.round(nameSize * 1.18) },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {timer.name}
          </Text>
        </Animated.View>
        <Animated.Text
          style={[styles.tag, { color: timer.textMode === 'dark' ? 'rgba(10,10,10,0.65)' : 'rgba(255,255,255,0.8)' }, tagStyle]}
        >
          {timer.tag}
        </Animated.Text>
        <Animated.View
          style={[
            styles.bar,
            { backgroundColor: timer.textMode === 'dark' ? 'rgba(10,10,10,0.5)' : 'rgba(255,255,255,0.7)' },
            barStyle,
          ]}
        />
      </View>

      {/* Traînée du point lumineux */}
      {!reduced
        ? [0, 1, 2].map((k) => (
            <Ghost key={k} k={k} bx={bx} by={by} d={h} dx={dx} dy={dy} color={ink} />
          ))
        : null}

      {/* Le bouton Lancer qui se resserre, puis vole */}
      <Animated.View
        pointerEvents="none"
        style={[styles.abs, { left: ctaRect.x, top: ctaRect.y, width: w, height: h }, wrapStyle]}
      >
        <Animated.View
          style={[styles.piece, { left: 0, width: h, height: h, borderRadius: h / 2 }, colorStyle, leftStyle]}
        />
        <Animated.View
          style={[styles.piece, { left: w - h, width: h, height: h, borderRadius: h / 2 }, colorStyle, rightStyle]}
        />
        <Animated.View
          style={[styles.piece, { left: h / 2, width: Math.max(0, w - h), height: h }, colorStyle, midStyle]}
        />
        <Animated.View style={[styles.labelBox, labelStyle]}>
          <Text style={[styles.label, { color: labelInk }]} numberOfLines={1}>
            Lancer {timer.name}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export default memo(LaunchTransition);

/**
 * La tête de comète : un petit point lumineux (et sa traîne) qui fait le tour de l'anneau
 * exactement au rythme de la vague de graduations — 360° pendant `SWEEP_MS`, à partir de
 * `RING_AT`. Un conteneur qui tourne : une seule transformation, aucune position animée.
 */
const CometHead = memo(function CometHead({ cx, cy, R, color, ink }) {
  const rot = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    rot.value = withDelay(RING_AT, withTiming(360, { duration: SWEEP_MS, easing: Easing.linear }));
    op.value = withDelay(
      RING_AT,
      withSequence(
        withTiming(1, { duration: 60 }),
        withDelay(SWEEP_MS - 140, withTiming(0, { duration: 160 }))
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  const dots = useMemo(() => {
    const r = R / 2 - 13; // au milieu de la bande des graduations
    const sizes = [10, 8, 6.5, 5, 4];
    const alphas = [1, 0.7, 0.5, 0.32, 0.18];
    return sizes.map((s, i) => {
      const a = (-i * 5 * Math.PI) / 180; // 5° de plus derrière à chaque point
      return {
        s,
        alpha: alphas[i],
        left: R / 2 + Math.sin(a) * r - s / 2,
        top: R / 2 - Math.cos(a) * r - s / 2,
      };
    });
  }, [R]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.abs, { left: cx - R / 2, top: cy - R / 2, width: R, height: R }, style]}
    >
      {dots.map((d, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: d.left,
            top: d.top,
            width: d.s,
            height: d.s,
            borderRadius: d.s / 2,
            backgroundColor: i === 0 ? ink : color,
            opacity: d.alpha,
          }}
        />
      ))}
    </Animated.View>
  );
});

/** Un fantôme du point, un peu en retard : la traînée du vol. */
const Ghost = memo(function Ghost({ k, bx, by, d, dx, dy, color }) {
  const f = useSharedValue(0);
  const a = 0.34 - 0.09 * k;
  const s0 = 0.8 - 0.12 * k;

  useEffect(() => {
    f.value = withDelay(FLIGHT_AT + 60 * (k + 1), withTiming(1, { duration: FLIGHT_MS, easing: E_FLY }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(f.value, [0, 0.1, 0.8, 1], [0, a, a * 0.6, 0]),
    transform: [{ translateX: dx * f.value }, { translateY: dy * f.value }, { scale: s0 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.abs,
        { left: bx - d / 2, top: by - d / 2, width: d, height: d, borderRadius: d / 2, backgroundColor: color },
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 60,
  },
  abs: {
    position: 'absolute',
  },
  piece: {
    position: 'absolute',
    top: 0,
  },
  labelBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Même typo que le label du bouton Lancer (Button lg).
  label: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 16,
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
  heroBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pret: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  name: {
    fontFamily: fonts.display,
    letterSpacing: -2,
    includeFontPadding: false,
    textAlign: 'center',
  },
  tag: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 3.85,
    textTransform: 'uppercase',
    marginTop: 18,
  },
  bar: {
    width: 56,
    height: 2,
    borderRadius: 1,
    marginTop: 14,
  },
});
