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
import useArmed from '../../hooks/useArmed';
import { accentTextOn } from '../../lib/buttonTokens';
import { fonts } from '../../lib/fonts';
import {
  LAUNCH_GLOW_REST,
  burstParticles,
  launchRingSize,
  launchTone,
} from '../../lib/launchVisuals';

/**
 * Transition de lancement (accueil → décompte), en ÉLÉMENT PARTAGÉ : l'anneau de la carte de
 * l'accueil est le même que celui du décompte, il voyage de l'un à l'autre.
 *
 *   1. L'anneau de la carte reste exactement où il est (copie à l'identique : 45 graduations
 *      allumées sur 60, même taille, même position, mesurées au tap) ; tout le reste de l'accueil
 *      s'efface en fondu. Le bouton Lancer se resserre en point lumineux et monte le rejoindre.
 *   2. À son arrivée le point éclate : une onde, une vague de lumière parcourt l'anneau (la comète
 *      de l'app) — et l'anneau, qui TOURNE UNE FOIS SUR LUI-MÊME comme une pièce (même geste que
 *      l'intro de démarrage), glisse jusqu'à sa place du décompte (centre de l'écran, taille
 *      `launchRingSize`), en s'éteignant à son niveau de repos.
 *   3. Le nom du mode se pose dans l'anneau, tient un instant, puis s'efface.
 *
 * Elle s'arrête sur l'image EXACTE où commence le décompte (app/countdown.js) : même anneau,
 * même taille, même centre, même lueur (LAUNCH_GLOW_REST). Le changement d'écran est invisible.
 * Sans anneau mesurable (fenêtre minuscule : la carte n'en a pas), l'anneau apparaît directement
 * au centre au moment où le point arrive.
 *
 * Avec une ambiance de saison : lueur teintée, fine couronne de repères aux couleurs de la saison,
 * tête de comète teintée et rafale de formes de la saison (feuilles, flocons, pétales…). Sans
 * ambiance (réglage « Aucune ») : blanc (noir sur un mode à texte noir), quelques étincelles.
 *
 * PRÉCHARGEMENT : tout est monté et dessiné dans son état de départ (le bouton, l'anneau copié)
 * AVANT que l'horloge ne démarre (hooks/useArmed.js) : le gel du montage ne mange jamais les
 * premières images. `fade` (valeur partagée de l'accueil) n'est lancée qu'à ce moment-là.
 *
 * Légèreté : uniquement `transform` et `opacity` sur le fil d'interface (aucune largeur, hauteur
 * ni position animée). « Réduire les animations » : seul un fondu reste.
 */

export const LAUNCH_TOTAL_MS = 2850;
const REDUCED_TOTAL_MS = 950;

// Calendrier (ms depuis l'armement).
const COND_MS = 450; // le bouton se resserre en point
const FLIGHT_AT = 200;
const FLIGHT_MS = 700; // le point monte jusqu'à l'anneau de la carte
const ARRIVE_AT = FLIGHT_AT + FLIGHT_MS;
const RING_AT = ARRIVE_AT; // la vague de lumière part à l'arrivée du point
const SWEEP_MS = 520;
const RISE_MS = 120;
const FALL_MS = 420;
const MOVE_AT = 950; // l'anneau glisse jusqu'à sa place du décompte...
const MOVE_MS = 1000;
const SPIN_AT = 950; // ... en faisant un tour sur lui-même
const SPIN_MS = 1050;
const HERO_OUT_AT = 2350;

const HOME_LIT = 45; // l'anneau de la carte : floor(60 × 0.75) graduations allumées (TickRing)

const E_OUT = Easing.out(Easing.cubic);
const E_INOUT = Easing.bezier(0.45, 0, 0.2, 1);
const E_FLY = Easing.bezier(0.55, 0, 0.2, 1);
// Le tour démarre doucement, file, puis ralentit longuement jusqu'à se poser (comme l'intro).
const E_SPIN = Easing.bezier(0.35, 0, 0.12, 1);

// Angle ramené entre -180° et 180° (équivalent visuellement).
function norm(a) {
  'worklet';
  return ((((a + 180) % 360) + 360) % 360) - 180;
}

function LaunchTransition({ timer, ctaRect, ringRect, screenW, screenH, fade, onComplete }) {
  const reduced = useReducedMotion();
  const { ambiance } = useAmbiance();
  const armed = useArmed();

  const cx = screenW / 2;
  const cy = screenH / 2;
  const R = launchRingSize(screenW, screenH);

  // Couleurs adaptées au mode (lib/launchVisuals.js, launchTone) : jamais de jaune sur jaune sur
  // TABATA, l'accent de la saison seulement s'il ressort sur le fond du mode. Le décompte utilise
  // le MÊME calcul : la lueur doit être identique à leur raccord.
  const { ink, accent, glow: glowColor, glowK, seedMix } = useMemo(
    () => launchTone(timer.color, timer.textMode, ambiance),
    [timer.color, timer.textMode, ambiance]
  );
  const labelInk = accentTextOn(timer.color, timer.textMode);

  // L'anneau de la carte, tel que mesuré au tap : point de départ de l'anneau qui voyage.
  const hasHome = !!ringRect && ringRect.width > 40 && !reduced;
  const hx = hasHome ? ringRect.x + ringRect.width / 2 : cx;
  const hy = hasHome ? ringRect.y + ringRect.height / 2 : cy;
  const gs = hasHome ? ringRect.width / R : 1; // échelle de départ (taille de la carte / taille finale)
  const gdx = hx - cx;
  const gdy = hy - cy;

  // Le bouton Lancer tel que mesuré au tap ; le point monte jusqu'au centre de l'anneau de la carte.
  const w = ctaRect.width;
  const h = ctaRect.height;
  const bx = ctaRect.x + w / 2;
  const by = ctaRect.y + h / 2;
  const dx = hx - bx;
  const dy = hy - by;
  const gap = Math.max(0, (w - h) / 2);

  const total = reduced ? REDUCED_TOTAL_MS : LAUNCH_TOTAL_MS;

  const cond = useSharedValue(0);
  const fly = useSharedValue(0);
  const pop = useSharedValue(0);
  const labelOp = useSharedValue(1);
  const capsuleOp = useSharedValue(1);
  const move = useSharedValue(0);
  const spin = useSharedValue(0);
  const ringOp = useSharedValue(hasHome || reduced ? 1 : 0);
  const shock = useSharedValue(0);
  const glowRest = LAUNCH_GLOW_REST * glowK;
  const glowOp = useSharedValue(reduced ? glowRest : 0);
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

  // Une seule fin, quelle que soit la source (fin d'animation ou minuterie de secours). Démonté
  // (lancement annulé par le retour Android) : plus jamais de fin, sinon la séance partirait quand
  // même après l'annulation.
  const finishedRef = useRef(false);
  useEffect(
    () => () => {
      finishedRef.current = true;
    },
    []
  );
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete();
  }, [onComplete]);

  // Rien ne démarre avant que tout soit monté et dessiné (`armed`).
  useEffect(() => {
    if (!armed) return undefined;
    // Le contenu de l'accueil (carte, barres) s'efface en fondu — c'est l'accueil qui l'affiche.
    fade.value = withTiming(0, { duration: reduced ? 300 : 460, easing: E_INOUT });

    if (reduced) {
      labelOp.value = withTiming(0, { duration: 160 });
      capsuleOp.value = withTiming(0, { duration: 220 });
      heroPret.value = withDelay(120, withTiming(1, { duration: 300 }));
      heroName.value = withDelay(160, withTiming(1, { duration: 320 }));
      heroTag.value = withDelay(260, withTiming(1, { duration: 300 }));
      heroBar.value = withDelay(320, withTiming(1, { duration: 300 }));
      heroOut.value = withDelay(total - 220, withTiming(1, { duration: 200 }));
    } else {
      labelOp.value = withTiming(0, { duration: 180 });
      cond.value = withTiming(1, { duration: COND_MS, easing: E_INOUT });
      fly.value = withDelay(FLIGHT_AT, withTiming(1, { duration: FLIGHT_MS, easing: E_FLY }));
      pop.value = withDelay(ARRIVE_AT, withTiming(1, { duration: 300, easing: E_OUT }));
      shock.value = withDelay(ARRIVE_AT, withTiming(1, { duration: 850, easing: E_OUT }));
      move.value = withDelay(MOVE_AT, withTiming(1, { duration: MOVE_MS, easing: E_INOUT }));
      spin.value = withDelay(SPIN_AT, withTiming(360, { duration: SPIN_MS, easing: E_SPIN }));
      if (!hasHome) ringOp.value = withDelay(ARRIVE_AT, withTiming(1, { duration: 240, easing: E_OUT }));
      glowOp.value = withDelay(
        RING_AT,
        withSequence(
          withTiming(0.55 * glowK, { duration: 260, easing: E_OUT }),
          withTiming(glowRest, { duration: 900, easing: E_INOUT })
        )
      );
      glowScale.value = withDelay(RING_AT, withTiming(1, { duration: 900, easing: E_OUT }));
      heroPret.value = withDelay(1550, withTiming(1, { duration: 420, easing: E_OUT }));
      heroName.value = withDelay(1620, withTiming(1, { duration: 600, easing: E_OUT }));
      heroTag.value = withDelay(1800, withTiming(1, { duration: 400, easing: E_OUT }));
      heroBar.value = withDelay(1880, withTiming(1, { duration: 400, easing: E_OUT }));
      heroOut.value = withDelay(HERO_OUT_AT, withTiming(1, { duration: 300, easing: E_INOUT }));
      burst.value = withDelay(ARRIVE_AT + 20, withTiming(1, { duration: 1000, easing: Easing.linear }));
      if (ambiance) {
        crownOp.value = withDelay(
          ARRIVE_AT + 50,
          withSequence(
            withTiming(1, { duration: 350, easing: E_OUT }),
            withDelay(1050, withTiming(0, { duration: 350, easing: E_INOUT }))
          )
        );
        crownRot.value = withDelay(ARRIVE_AT + 50, withTiming(40, { duration: 1800, easing: Easing.linear }));
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
  }, [armed]);

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
    // La couleur du mode ne dure que le début du vol : le point devient vite de l'encre, jamais de la
    // couleur du fond (jaune sur jaune).
    backgroundColor: interpolateColor(fly.value, [0, seedMix, 1], [modeColor, ink, ink]),
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOp.value }));

  // Le groupe (anneau, lueur, couronne, nom) est dessiné à sa place FINALE ; sa transformation le
  // ramène au départ sur l'anneau de la carte, puis la relâche : il glisse et grandit/rétrécit
  // jusqu'au décompte.
  const groupStyle = useAnimatedStyle(() => {
    const m = move.value;
    return {
      transform: [
        { translateX: gdx * (1 - m) },
        { translateY: gdy * (1 - m) },
        { scale: gs + (1 - gs) * m },
      ],
    };
  });
  // L'anneau tourne comme une pièce autour de son axe vertical (un tour).
  const planeStyle = useAnimatedStyle(() => ({
    opacity: ringOp.value,
    transform: [{ perspective: R * 3 }, { rotateY: `${norm(spin.value)}deg` }],
  }));
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
      {/* Traînée du point lumineux */}
      {!reduced
        ? [0, 1, 2].map((k) => (
            <Ghost key={k} k={k} bx={bx} by={by} d={h} dx={dx} dy={dy} color={ink} play={armed} />
          ))
        : null}

      {/* LE GROUPE QUI VOYAGE : de l'anneau de la carte à l'anneau du décompte */}
      <Animated.View
        pointerEvents="none"
        style={[styles.abs, { left: cx - R / 2, top: cy - R / 2, width: R, height: R }, groupStyle]}
      >
        {/* Lueur ronde derrière l'anneau */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.abs,
            { left: R / 2 - glowSize / 2, top: R / 2 - glowSize / 2, width: glowSize, height: glowSize },
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
              { left: R / 2 - crownBox / 2, top: R / 2 - crownBox / 2, width: crownBox, height: crownBox },
              crownStyle,
            ]}
          >
            <FineCrown radius={crownRadius} color={accent} opacity={0.7} />
          </Animated.View>
        ) : null}

        {/* L'anneau de 60 graduations (copie de celui de la carte), qui tourne sur son axe */}
        <Animated.View
          pointerEvents="none"
          style={[styles.abs, { left: 0, top: 0, width: R, height: R }, planeStyle]}
        >
          <LaunchRing
            size={R}
            color={ink}
            mode={reduced ? 'static' : 'ignite'}
            initialLit={hasHome ? HOME_LIT : 0}
            startDelay={RING_AT}
            sweepMs={SWEEP_MS}
            riseMs={RISE_MS}
            fallMs={FALL_MS}
            play={armed}
          />
          {/* Tête de comète qui parcourt l'anneau avec la vague */}
          {!reduced ? <CometHead R={R} color={accent} ink={ink} play={armed} /> : null}
        </Animated.View>

        {/* Onde de choc à l'arrivée du point */}
        {!reduced ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.abs,
              { left: 0, top: 0, width: R, height: R, borderRadius: R / 2, borderWidth: 2, borderColor: accent },
              shockStyle,
            ]}
          />
        ) : null}

        {/* Étincelles / formes de la saison */}
        {!reduced ? (
          <LaunchBurst progress={burst} particles={particles} x={R / 2} y={R / 2} ink={ink} accent={accent} />
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
      </Animated.View>

      {/* Le bouton Lancer qui se resserre, puis vole jusqu'à l'anneau */}
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
 * Se pose DANS le plan de l'anneau (il tourne avec lui).
 */
const CometHead = memo(function CometHead({ R, color, ink, play }) {
  const rot = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    if (!play) return;
    rot.value = withDelay(RING_AT, withTiming(360, { duration: SWEEP_MS, easing: Easing.linear }));
    op.value = withDelay(
      RING_AT,
      withSequence(
        withTiming(1, { duration: 60 }),
        withDelay(SWEEP_MS - 140, withTiming(0, { duration: 160 }))
      )
    );
  }, [play]);

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
      style={[styles.abs, { left: 0, top: 0, width: R, height: R }, style]}
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
const Ghost = memo(function Ghost({ k, bx, by, d, dx, dy, color, play }) {
  const f = useSharedValue(0);
  const a = 0.34 - 0.09 * k;
  const s0 = 0.8 - 0.12 * k;

  useEffect(() => {
    if (!play) return;
    f.value = withDelay(FLIGHT_AT + 60 * (k + 1), withTiming(1, { duration: FLIGHT_MS, easing: E_FLY }));
  }, [play]);

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
