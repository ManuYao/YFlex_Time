import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Pattern, Stop, Rect, Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import LaunchRing, { FineCrown, RadialGlow } from './LaunchRing';
import LaunchBurst from './LaunchBurst';
import AmbianceShape from './AmbianceShapes';
import useAmbiance from '../../hooks/useAmbiance';
import { useSettings } from '../../contexts/SettingsContext';
import { fonts } from '../../lib/fonts';
import { playSound, playSoundSequence, preloadSound, isSoundEnabled } from '../../lib/sounds';
import { consumeUpdateSplash } from '../../lib/splash';
import { appReadyAt, onAppReady } from '../../lib/appReady';
import {
  MODE_RING,
  burstParticles,
  rgbToHex,
  seededRandom,
  splashExitAt,
  splashLookFor,
} from '../../lib/launchVisuals';

/**
 * Intro de démarrage animée, bloquante (voir lib/splash.js pour savoir quand elle se joue).
 *
 * C'est le visage de l'icône de l'app, qui s'allume : l'anneau de 60 graduations aux quatre
 * couleurs des modes (une comète le parcourt et allume chaque graduation), la fine couronne de
 * 120 repères, puis le « F » d'Anton qui se pose au centre pendant que des étincelles jaillissent.
 *
 * DEUX durées, calées sur le son :
 *   - courte (~1,9 s) : un seul son, `intro` ;
 *   - longue (après une mise à jour, quand les sons sont actifs) : `intro` puis `introNew`.
 *     La première seconde est la même que l'intro courte, puis l'intro continue de pétiller
 *     (étincelles, ondes, orbite) et ne se referme QUE quand le dernier son est fini : si la
 *     seconde mélodie est raccourcie un jour, l'intro se raccourcit toute seule.
 * Dans les deux cas elle attend aussi que l'écran derrière (accueil) soit prêt
 * (lib/appReady.js), dans la limite de la patience prévue : la personne arrive sur un accueil
 * déjà posé, pas sur un squelette de chargement. Le moment du son et celui de la fermeture sont
 * décidés par `splashExitAt` (lib/launchVisuals.js, testé).
 *
 * AVEC UNE AMBIANCE DE SAISON : le fond reprend celui de l'icône de la saison (même famille de
 * couleurs), les graduations des fêtes prennent les couleurs de la fête (les saisons gardent les
 * quatre couleurs des modes), des formes de la saison jaillissent et dérivent, et un petit mot
 * s'écrit sous l'anneau. SANS ambiance (réglage « Aucune ») : fond noir étoilé, quatre couleurs,
 * étincelles blanches et colorées — la version de base, refaite à la nouvelle identité.
 *
 * Légèreté : `transform` et `opacity` sur le fil d'interface, rien d'animé en mise en page. Avec
 * « réduire les animations » : l'anneau et le « F » apparaissent en fondu, sans mouvement.
 */

const INITIAL = Dimensions.get('window');
const EXIT_MS = 420;

const E_OUT = Easing.out(Easing.cubic);
const E_INOUT = Easing.inOut(Easing.cubic);
const E_SETTLE = Easing.bezier(0.2, 0.9, 0.3, 1.12); // se pose avec un très léger dépassement

// Le « F » d'Anton de l'icône (canevas de 512), voir design/build-icons.js.
const F_PATH =
  'M222.4 340.0L222.4 172.0L289.6 172.0L289.6 204.7L256.2 204.7L256.2 231.5L287.9 231.5L287.9 263.8L256.2 263.8L256.2 340.0Z';

// Sons à décoder pendant l'intro, pour que la première séance démarre sans latence.
const WARM_SOUNDS = ['countdown1', 'countdown2', 'countdown3', 'go', 'next1', 'next2', 'next3'];

export default function LaunchSplash({ onDone }) {
  // Les réglages (ambiance « Aucune », sons coupés) doivent être lus AVANT de montrer quoi que ce
  // soit : sinon un utilisateur sans ambiance verrait une fois la saison, et l'intro jouerait un
  // son qu'il a coupé. On attend donc les réglages (au plus 700 ms) puis UN rendu de plus : les
  // effets des fournisseurs (réglage des sons) ont alors tous tourné.
  const { hydrated } = useSettings();
  const [go, setGo] = useState(false);
  useEffect(() => {
    if (hydrated) {
      setGo(true);
      return undefined;
    }
    const id = setTimeout(() => setGo(true), 700);
    return () => clearTimeout(id);
  }, [hydrated]);

  if (!go) return <View style={styles.waiting} pointerEvents="none" />;
  return <SplashShow onDone={onDone} />;
}

function SplashShow({ onDone }) {
  const reduced = useReducedMotion();
  const { ambiance } = useAmbiance();
  const look = useMemo(() => splashLookFor(ambiance?.id), [ambiance?.id]);
  const seasonal = look.seasonal && !!ambiance;

  // Longue = mise à jour installée ET sons actifs (sans son, bloquer 5 s pour rien serait pénible).
  const [isLong] = useState(() => {
    const afterUpdate = consumeUpdateSplash();
    return afterUpdate && isSoundEnabled();
  });

  const [size, setSize] = useState({ width: INITIAL.width, height: INITIAL.height });
  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };
  const S = Math.max(200, Math.round(Math.min(300, size.width - 72, size.height * 0.4)));
  const k = S / 300;

  /* ───── valeurs animées ───── */

  const bgOp = useSharedValue(reduced ? 1 : 0);
  const bgScale = useSharedValue(reduced ? 1 : 0.55);
  const glow = useSharedValue(0);
  const crownOp = useSharedValue(reduced ? 1 : 0);
  const crownRot = useSharedValue(0);
  const fOp = useSharedValue(reduced ? 1 : 0);
  const fScale = useSharedValue(reduced ? 1 : 0.74);
  const fGlow = useSharedValue(0);
  const burst = useSharedValue(0);
  const shapes = useSharedValue(0);
  const shower = useSharedValue(0);
  const greet = useSharedValue(reduced ? 1 : 0);
  const label = useSharedValue(reduced ? 1 : 0);
  const breath = useSharedValue(0);
  const finale = useSharedValue(0);

  /* ───── le calendrier de l'intro ───── */

  const startedAtRef = useRef(Date.now());
  const audioDoneRef = useRef(null);
  const exitTimerRef = useRef(null);
  const exitingRef = useRef(false);
  const doneRef = useRef(false);

  const done = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  const startExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    clearTimeout(exitTimerRef.current);
    finale.value = withTiming(1, { duration: EXIT_MS, easing: E_INOUT }, (finished) => {
      if (finished) runOnJS(done)();
    });
    // Secours : l'intro ne doit jamais rester collée à l'écran.
    setTimeout(done, EXIT_MS + 900);
  }, [done]);

  // Recalculé à chaque nouvelle information (début, son terminé, accueil prêt) : une seule
  // minuterie, toujours calée sur la dernière heure de fermeture connue.
  const reschedule = useCallback(() => {
    if (exitingRef.current) return;
    const readyAbs = appReadyAt();
    const at = splashExitAt({
      long: isLong,
      audioDoneAt: audioDoneRef.current,
      readyAt: readyAbs == null ? null : readyAbs - startedAtRef.current,
    });
    clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(
      startExit,
      Math.max(0, startedAtRef.current + at - Date.now())
    );
  }, [isLong, startExit]);

  useEffect(() => {
    startedAtRef.current = Date.now();

    // Le son part en même temps que l'image.
    if (isLong) {
      playSoundSequence(['intro', 'introNew'], () => {
        audioDoneRef.current = Date.now() - startedAtRef.current;
        reschedule();
      });
    } else {
      playSound('intro');
    }

    if (reduced) {
      bgOp.value = 1;
      glow.value = 0.3;
    } else {
      bgOp.value = withTiming(1, { duration: 450, easing: E_OUT });
      bgScale.value = withTiming(1, { duration: 650, easing: E_OUT });
      glow.value = withDelay(
        60,
        withSequence(
          withTiming(0.55, { duration: 300, easing: E_OUT }),
          withTiming(0.28, { duration: 560, easing: E_INOUT })
        )
      );
      crownOp.value = withDelay(380, withTiming(1, { duration: 380, easing: E_OUT }));
      crownRot.value = withTiming(360, { duration: 60000, easing: Easing.linear });
      fOp.value = withDelay(420, withTiming(1, { duration: 380, easing: E_OUT }));
      fScale.value = withDelay(420, withTiming(1, { duration: 600, easing: E_SETTLE }));
      fGlow.value = withDelay(
        420,
        withSequence(
          withTiming(0.6, { duration: 180, easing: E_OUT }),
          withTiming(0.22, { duration: 520, easing: E_INOUT })
        )
      );
      burst.value = withDelay(500, withTiming(1, { duration: 1000, easing: Easing.linear }));
      shapes.value = withDelay(560, withTiming(1, { duration: 1150, easing: Easing.linear }));
      greet.value = withDelay(760, withTiming(1, { duration: 380, easing: E_OUT }));
      if (isLong) {
        label.value = withDelay(1300, withTiming(1, { duration: 420, easing: E_OUT }));
        shower.value = withDelay(
          1100,
          withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false)
        );
        // Le « F » et l'anneau respirent tant que l'intro dure.
        breath.value = withDelay(
          1100,
          withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true)
        );
      }
    }

    reschedule();
    const unsubscribe = onAppReady(reschedule);

    // On profite de l'intro pour décoder les sons de la première séance.
    const warm = setTimeout(() => WARM_SOUNDS.forEach(preloadSound), 700);

    return () => {
      clearTimeout(exitTimerRef.current);
      clearTimeout(warm);
      unsubscribe();
    };
  }, []);

  /* ───── styles ───── */

  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - finale.value }));
  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOp.value,
    transform: [{ scale: bgScale.value }],
  }));
  // L'aura : monte à l'arrivée, puis un éclat quand l'intro se referme.
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * (1 - finale.value) + 0.5 * 4 * finale.value * (1 - finale.value),
    transform: [{ scale: 1 + 0.06 * breath.value + 0.1 * finale.value }],
  }));
  const crownStyle = useAnimatedStyle(() => ({
    opacity: crownOp.value,
    transform: [{ rotate: `${crownRot.value}deg` }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.02 * breath.value + 0.07 * finale.value }],
  }));
  const fStyle = useAnimatedStyle(() => ({
    opacity: fOp.value,
    transform: [{ scale: fPose(fScale.value, breath.value, finale.value) }],
  }));
  const fGlowStyle = useAnimatedStyle(() => ({ opacity: fGlow.value }));
  const greetStyle = useAnimatedStyle(() => ({
    opacity: greet.value,
    transform: [{ translateY: (1 - greet.value) * 8 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: label.value * 0.75,
    transform: [{ translateY: (1 - label.value) * -8 }],
  }));

  /* ───── particules ───── */

  const dotColors = useMemo(
    () =>
      seasonal
        ? [...look.ring, ambiance.accent, ambiance.accent2]
        : [...MODE_RING, '#FFFFFF'],
    [seasonal, look.ring, ambiance?.accent, ambiance?.accent2]
  );
  const sparks = useMemo(
    () =>
      burstParticles({
        seed: `splash-sparks-${look.id}`,
        count: 18,
        minDist: S * 0.42,
        maxDist: S * 0.78,
        minSize: 4,
        maxSize: 8,
        colors: dotColors,
        spin: 0,
        delayMax: 0.3,
        alpha: 0.95,
      }),
    [look.id, S, dotColors]
  );
  const motifs = useMemo(() => {
    if (!seasonal) return [];
    const dir = ambiance.dir;
    return burstParticles({
      seed: `splash-motifs-${look.id}`,
      count: 14,
      minDist: S * 0.5,
      maxDist: S * 1.3,
      minSize: 18,
      maxSize: 30,
      kinds: ambiance.motifs,
      drift: dir === 0 ? 0 : dir > 0 ? S * 0.55 : -S * 0.55,
      spin: 140,
      delayMax: 0.3,
      alpha: 0.95,
    });
  }, [seasonal, ambiance, look.id, S]);
  const showerParts = useMemo(() => {
    if (!isLong) return [];
    if (seasonal) {
      const dir = ambiance.dir;
      return burstParticles({
        seed: `splash-shower-${look.id}`,
        count: 16,
        minDist: S * 0.45,
        maxDist: S * 1.5,
        minSize: 16,
        maxSize: 28,
        kinds: ambiance.motifs,
        drift: dir === 0 ? 0 : dir > 0 ? S * 0.7 : -S * 0.7,
        spin: 160,
        delayMax: 0.6,
        alpha: 0.9,
      });
    }
    return burstParticles({
      seed: 'splash-shower-base',
      count: 16,
      minDist: S * 0.45,
      maxDist: S * 1.4,
      minSize: 3,
      maxSize: 7,
      colors: dotColors,
      spin: 0,
      delayMax: 0.6,
      alpha: 0.9,
    });
  }, [isLong, seasonal, ambiance, look.id, S, dotColors]);

  // Petites étoiles qui scintillent autour de l'anneau (positions stables).
  const twinkles = useMemo(() => {
    const rnd = seededRandom(`twinkle-${look.id}`);
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + rnd() * 0.6;
      const r = S * (0.56 + rnd() * 0.22);
      return {
        x: S / 2 + Math.cos(a) * r,
        y: S / 2 + Math.sin(a) * r,
        size: 8 + Math.round(rnd() * 6),
        delay: 560 + i * 85 + Math.round(rnd() * 120),
        period: 520 + Math.round(rnd() * 240),
        kind: i % 3 === 0 ? 'dot' : 'star',
      };
    });
  }, [look.id, S]);

  const accent = seasonal ? ambiance.accent : '#FFFFFF';
  const glowColor = seasonal ? rgbToHex(ambiance.glow) : '#FFFFFF';
  const crownRadius = (226 / 512) * S;
  const crownBox = (crownRadius + 2) * 2;
  const auraSize = S * 1.7;
  const fGlowSize = S * 0.62;
  const ringDiameter = (204 / 512) * S * 2;

  return (
    <Animated.View style={[styles.root, rootStyle]} onLayout={handleLayout}>
      <Pressable style={StyleSheet.absoluteFill} />

      {/* Le fond : noir étoilé, ou celui de l'icône de la saison. Il s'ouvre depuis le centre. */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]} pointerEvents="none">
        <Backdrop width={size.width} height={size.height} bg={look.bg} seasonal={seasonal} />
      </Animated.View>

      <View style={[styles.stage, { width: S, height: S }]} pointerEvents="none">
        {/* Aura */}
        <Animated.View
          style={[
            styles.abs,
            { left: S / 2 - auraSize / 2, top: S / 2 - auraSize / 2, width: auraSize, height: auraSize },
            glowStyle,
          ]}
        >
          <RadialGlow size={auraSize} color={glowColor} id="splashAura" />
        </Animated.View>

        {/* Fine couronne de 120 repères */}
        <Animated.View
          style={[
            styles.abs,
            { left: S / 2 - crownBox / 2, top: S / 2 - crownBox / 2, width: crownBox, height: crownBox },
            crownStyle,
          ]}
        >
          <FineCrown radius={crownRadius} color={look.crown[0]} opacity={look.crown[1]} />
        </Animated.View>

        {/* L'anneau de 60 graduations, aux couleurs de l'icône */}
        <Animated.View style={[styles.abs, { left: 0, top: 0, width: S, height: S }, ringStyle]}>
          <LaunchRing
            size={S}
            preset="icon"
            color={look.ring}
            baseOpacity={0}
            mode={reduced ? 'static' : 'fill'}
            staticOpacity={1}
            startDelay={60}
            sweepMs={560}
            riseMs={150}
          />
        </Animated.View>

        {/* Ondes de choc */}
        {!reduced ? (
          <>
            <Shock D={ringDiameter} delay={500} color={accent} loop={false} />
            <Shock D={ringDiameter} delay={620} color={accent} loop={false} />
            {isLong ? <Shock D={ringDiameter} delay={1500} color={accent} loop /> : null}
            {isLong ? <Shock D={ringDiameter} delay={2250} color={accent} loop /> : null}
          </>
        ) : null}

        {/* Comète qui allume l'anneau, puis (version longue) étincelle qui continue d'orbiter */}
        {!reduced ? (
          <>
            <Orbiter S={S} k={k} delay={60} duration={560} loop={false} color={accent} />
            {isLong ? <Orbiter S={S} k={k} delay={1000} duration={3200} loop color={accent} /> : null}
          </>
        ) : null}

        {/* Lueur derrière le « F », puis le « F » lui-même */}
        <Animated.View
          style={[
            styles.abs,
            { left: S / 2 - fGlowSize / 2, top: S / 2 - fGlowSize / 2, width: fGlowSize, height: fGlowSize },
            fGlowStyle,
          ]}
        >
          <RadialGlow size={fGlowSize} color="#FFFFFF" id="splashFGlow" />
        </Animated.View>
        <Animated.View style={[styles.abs, { left: 0, top: 0, width: S, height: S }, fStyle]}>
          <Svg width={S} height={S} viewBox="0 0 512 512">
            <Path d={F_PATH} fill="#FFFFFF" />
          </Svg>
        </Animated.View>

        {/* Étincelles (et formes de la saison) */}
        {!reduced ? (
          <>
            <LaunchBurst progress={burst} particles={sparks} x={S / 2} y={S / 2} />
            {seasonal ? (
              <LaunchBurst
                progress={shapes}
                particles={motifs}
                x={S / 2}
                y={S / 2}
                ink="#FFFFFF"
                accent={ambiance.accent}
              />
            ) : null}
            {isLong ? (
              <LaunchBurst
                progress={shower}
                particles={showerParts}
                x={S / 2}
                y={S / 2}
                ink="#FFFFFF"
                accent={accent}
              />
            ) : null}
            {twinkles.map((t, i) => (
              <Twinkle
                key={i}
                x={t.x}
                y={t.y}
                size={t.size}
                delay={t.delay}
                period={t.period}
                loop={isLong}
                kind={t.kind}
                ink="#FFFFFF"
                accent={accent}
              />
            ))}
          </>
        ) : null}

        {/* Le petit mot de la saison, sous l'anneau */}
        {seasonal && look.greeting ? (
          <Animated.Text style={[styles.greeting, { top: S + 22, left: -60, width: S + 120 }, greetStyle]}>
            {look.greeting}
          </Animated.Text>
        ) : null}

        {/* Version longue : on dit pourquoi elle est longue */}
        {isLong ? (
          <Animated.Text style={[styles.label, { top: -46, left: -60, width: S + 120 }, labelStyle]}>
            NOUVELLE VERSION
          </Animated.Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** Le fond de l'intro : dégradé radial, points fins, bords assombris. */
const Backdrop = memo(function Backdrop({ width, height, bg, seasonal }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="splashBase" cx="50%" cy="50%" rx="75%" ry="60%" fx="50%" fy="50%">
          <Stop offset="0" stopColor={bg[0]} stopOpacity="1" />
          <Stop offset="0.6" stopColor={bg[1]} stopOpacity="1" />
          <Stop offset="1" stopColor={bg[2]} stopOpacity="1" />
        </RadialGradient>
        <Pattern id="splashDots" width="22" height="22" patternUnits="userSpaceOnUse">
          <Circle cx="11" cy="11" r="1" fill="#FFFFFF" />
        </Pattern>
        <RadialGradient id="splashVignette" cx="50%" cy="50%" rx="70%" ry="60%" fx="50%" fy="50%">
          <Stop offset="0" stopColor="#000000" stopOpacity="0" />
          <Stop offset="1" stopColor="#000000" stopOpacity={seasonal ? 0.5 : 0.85} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#splashBase)" />
      <Rect width="100%" height="100%" fill="url(#splashDots)" opacity={seasonal ? 0.08 : 0.11} />
      <Rect width="100%" height="100%" fill="url(#splashVignette)" />
    </Svg>
  );
});

/** Une onde qui s'éloigne de l'anneau (une fois, ou en boucle dans la version longue). */
const Shock = memo(function Shock({ D, delay, color, loop }) {
  const p = useSharedValue(0);

  useEffect(() => {
    const run = withTiming(1, { duration: loop ? 1500 : 760, easing: E_OUT });
    p.value = withDelay(delay, loop ? withRepeat(run, -1, false) : run);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: p.value <= 0 ? 0 : 0.55 * Math.pow(1 - p.value, 1.3),
    transform: [{ scale: 0.7 + 1.2 * p.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.abs,
        {
          left: '50%',
          top: '50%',
          marginLeft: -D / 2,
          marginTop: -D / 2,
          width: D,
          height: D,
          borderRadius: D / 2,
          borderWidth: 1.5,
          borderColor: color,
          opacity: 0,
        },
        style,
      ]}
    />
  );
});

/**
 * Une étincelle qui tourne autour de l'anneau, à hauteur de la bande des graduations, avec une
 * courte traîne. Une fois (la comète qui allume l'anneau, calée sur sa vague) ou en boucle
 * (version longue). Un seul conteneur qui tourne : une transformation.
 */
const Orbiter = memo(function Orbiter({ S, k, delay, duration, loop, color }) {
  const rot = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    const turn = withTiming(360, { duration, easing: Easing.linear });
    rot.value = withDelay(delay, loop ? withRepeat(turn, -1, false) : turn);
    op.value = withDelay(
      delay,
      loop
        ? withTiming(0.85, { duration: 300 })
        : withSequence(
            withTiming(1, { duration: 60 }),
            withDelay(duration - 140, withTiming(0, { duration: 160 }))
          )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  const dots = useMemo(() => {
    const r = (187 / 512) * S; // au milieu de la bande des graduations de l'icône
    const sizes = [11, 9, 7, 5.5, 4].map((s) => s * k);
    const alphas = [1, 0.7, 0.5, 0.32, 0.18];
    return sizes.map((s, i) => {
      const a = (-i * 5 * Math.PI) / 180;
      return {
        s,
        alpha: alphas[i],
        left: S / 2 + Math.sin(a) * r - s / 2,
        top: S / 2 - Math.cos(a) * r - s / 2,
      };
    });
  }, [S, k]);

  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: 0, top: 0, width: S, height: S }, style]}>
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
            backgroundColor: i === 0 ? '#FFFFFF' : color,
            opacity: d.alpha,
          }}
        />
      ))}
    </Animated.View>
  );
});

/** Une petite étoile qui scintille : apparaît, grandit, s'éteint. Une fois, ou en boucle. */
const Twinkle = memo(function Twinkle({ x, y, size, delay, period, loop, kind, ink, accent }) {
  const p = useSharedValue(0);

  useEffect(() => {
    const run = withTiming(1, { duration: period, easing: Easing.linear });
    p.value = withDelay(delay, loop ? withRepeat(run, -1, false) : run);
  }, []);

  const style = useAnimatedStyle(() => {
    const t = p.value;
    const kk = Math.sin(Math.PI * t); // 0 → 1 → 0
    return {
      opacity: kk,
      transform: [{ scale: 0.3 + 0.9 * kk }, { rotate: `${t * 90}deg` }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.abs,
        { left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: 0 },
        style,
      ]}
    >
      <AmbianceShape kind={kind} size={size} ink={ink} accent={accent} />
    </Animated.View>
  );
});

// Échelle du « F » : se pose, respire pendant l'attente, grossit un peu à la fermeture.
// (Fonction ordinaire appelée DANS un worklet : elle est marquée comme tel.)
function fPose(base, breath, finale) {
  'worklet';
  return base * (1 + 0.04 * breath + 0.06 * finale);
}

const styles = StyleSheet.create({
  // Écran noir pendant la lecture des réglages (même noir que le voile de _layout.js).
  waiting: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: '#000000',
  },
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Carré de S × S centré à l'écran : tout se place en coordonnées de ce carré (le centre est
  // à S / 2). Les couches plus grandes que lui (aura, ondes, étincelles) débordent librement.
  stage: {
    position: 'relative',
  },
  abs: {
    position: 'absolute',
  },
  greeting: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: fonts.sansExtraBold,
    fontSize: 12,
    letterSpacing: 5,
    color: '#FFFFFF',
  },
  label: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 5,
    color: '#FFFFFF',
  },
});
