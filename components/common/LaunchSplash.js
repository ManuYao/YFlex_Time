import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
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
import useArmed from '../../hooks/useArmed';
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
 * C'est l'emblème de l'icône qui s'allume puis TOURNE COMME UNE PIÈCE : l'anneau de 60
 * graduations s'allume en blanc (une comète le parcourt), puis l'emblème fait deux tours sur son
 * axe vertical, en perspective — il passe de profil comme une ligne lumineuse, se rouvre — pendant
 * que les graduations prennent leurs couleurs en vague, et le « F » d'Anton se révèle dans le
 * dernier tour avant de se poser, face à nous. Une onde, des étincelles et (avec une saison) des
 * formes de la saison marquent l'atterrissage. Puis l'emblème TIENT : une vraie pause pour lire
 * le « F » et le nom, avant que l'intro ne se referme en faisant demi-tour sur elle-même.
 *
 * DEUX durées, calées sur le son :
 *   - courte (~3,2 s) : un seul son, `intro` ;
 *   - longue (après une mise à jour, quand les sons sont actifs) : `intro` puis `introNew`. Le
 *     début est le même, puis l'intro continue de pétiller (ondes, orbite, pluie de particules,
 *     « NOUVELLE VERSION ») et ne se referme QUE quand le dernier son est fini : si la seconde
 *     mélodie est raccourcie un jour, l'intro se raccourcit toute seule.
 * Dans les deux cas elle attend aussi que l'écran derrière (accueil) soit prêt
 * (lib/appReady.js), dans la limite de la patience prévue. Le moment de la fermeture est décidé
 * par `splashExitAt` (lib/launchVisuals.js, testé).
 *
 * PRÉCHARGEMENT : tout l'arbre (anneaux, particules, lueurs) est monté et dessiné dans son état
 * de départ AVANT que l'horloge, le son ne démarrent (hooks/useArmed.js) : le gel du montage ne
 * mange jamais les premières images de l'animation.
 *
 * AVEC UNE AMBIANCE DE SAISON : le fond reprend celui de l'icône de la saison, les graduations
 * des fêtes prennent les couleurs de la fête (les saisons gardent les quatre couleurs des modes),
 * des formes de la saison jaillissent, un petit mot s'écrit sous l'anneau. SANS ambiance (réglage
 * « Aucune ») : fond noir étoilé, quatre couleurs, étincelles blanches et colorées.
 *
 * Légèreté : `transform` et `opacity` sur le fil d'interface, rien d'animé en mise en page. Avec
 * « réduire les animations » : l'anneau coloré et le « F » apparaissent en fondu, sans rotation.
 */

const INITIAL = Dimensions.get('window');
const EXIT_MS = 420;

const E_OUT = Easing.out(Easing.cubic);
const E_INOUT = Easing.inOut(Easing.cubic);
const E_SETTLE = Easing.bezier(0.2, 0.9, 0.3, 1.12); // se pose avec un très léger dépassement
// La rotation démarre doucement, file, puis ralentit longuement jusqu'à se poser (pas de coup).
const E_SPIN = Easing.bezier(0.35, 0, 0.12, 1);

// Calendrier (ms depuis l'armement).
const IGNITE_AT = 60; // le blanc s'allume en comète
const IGNITE_SWEEP = 480;
const SPIN_AT = 500; // l'emblème se met à tourner
const SPIN_MS = 1350; // deux tours (720°), qui finissent face à nous
const WIPE_AT = 850; // les couleurs arrivent, en vague, pendant la rotation
const WIPE_SWEEP = 650;
const LAND_AT = 1500; // il se pose : onde, étincelles
const MARK_AT = 1650; // nom, puis petit mot de la saison
const GREET_AT = 1800;
const SUSTAIN_AT = 2300; // version longue : on continue de pétiller

// Perspective de la rotation, en multiple du côté de l'emblème (plus grand = plus plat).
const PERSPECTIVE_K = 3;

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

// Angle ramené entre -180° et 180° (équivalent visuellement, et sans cumul au-delà d'un tour).
function norm(a) {
  'worklet';
  return ((((a + 180) % 360) + 360) % 360) - 180;
}

function SplashShow({ onDone }) {
  const reduced = useReducedMotion();
  const { ambiance } = useAmbiance();
  const look = useMemo(() => splashLookFor(ambiance?.id), [ambiance?.id]);
  const seasonal = look.seasonal && !!ambiance;
  const armed = useArmed();

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
  const perspective = S * PERSPECTIVE_K;

  /* ───── valeurs animées ───── */

  const bgOp = useSharedValue(reduced ? 1 : 0);
  const bgScale = useSharedValue(reduced ? 1 : 0.55);
  const glow = useSharedValue(reduced ? 0.3 : 0);
  const crownOp = useSharedValue(reduced ? 1 : 0);
  const crownRot = useSharedValue(0);
  // Angle de l'emblème (0 → 720°) ; en mouvement réduit il est déjà face à nous.
  const spin = useSharedValue(reduced ? 720 : 0);
  const fScale = useSharedValue(reduced ? 1 : 0.9);
  const fGlow = useSharedValue(0);
  const burst = useSharedValue(0);
  const shapes = useSharedValue(0);
  const shower = useSharedValue(0);
  const mark = useSharedValue(reduced ? 1 : 0);
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

  // Rien ne démarre avant que tout soit monté et dessiné (`armed`) : ni l'image, ni le son.
  useEffect(() => {
    if (!armed) return undefined;
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

    if (!reduced) {
      bgOp.value = withTiming(1, { duration: 450, easing: E_OUT });
      bgScale.value = withTiming(1, { duration: 650, easing: E_OUT });
      // L'aura : monte à l'allumage, retombe pendant la rotation, éclate à l'atterrissage.
      glow.value = withDelay(
        IGNITE_AT,
        withSequence(
          withTiming(0.4, { duration: 400, easing: E_OUT }),
          withTiming(0.22, { duration: 900, easing: E_INOUT }),
          withTiming(0.6, { duration: 260, easing: E_OUT }),
          withTiming(0.3, { duration: 760, easing: E_INOUT })
        )
      );
      crownOp.value = withDelay(350, withTiming(1, { duration: 450, easing: E_OUT }));
      crownRot.value = withTiming(360, { duration: 60000, easing: Easing.linear });
      spin.value = withDelay(SPIN_AT, withTiming(720, { duration: SPIN_MS, easing: E_SPIN }));
      fScale.value = withDelay(SPIN_AT + 750, withTiming(1, { duration: 700, easing: E_SETTLE }));
      fGlow.value = withDelay(
        LAND_AT - 50,
        withSequence(
          withTiming(0.65, { duration: 200, easing: E_OUT }),
          withTiming(0.22, { duration: 700, easing: E_INOUT })
        )
      );
      burst.value = withDelay(LAND_AT - 50, withTiming(1, { duration: 1100, easing: Easing.linear }));
      shapes.value = withDelay(LAND_AT, withTiming(1, { duration: 1250, easing: Easing.linear }));
      mark.value = withDelay(MARK_AT, withTiming(1, { duration: 400, easing: E_OUT }));
      greet.value = withDelay(GREET_AT, withTiming(1, { duration: 400, easing: E_OUT }));
      if (isLong) {
        label.value = withDelay(SUSTAIN_AT + 300, withTiming(1, { duration: 420, easing: E_OUT }));
        shower.value = withDelay(
          SUSTAIN_AT + 100,
          withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false)
        );
        // L'emblème respire tant que l'intro dure.
        breath.value = withDelay(
          SUSTAIN_AT,
          withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true)
        );
      }
    } else if (isLong) {
      label.value = 1;
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
  }, [armed]);

  /* ───── styles ───── */

  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - finale.value }));
  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOp.value,
    transform: [{ scale: bgScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * (1 - finale.value) + 0.5 * 4 * finale.value * (1 - finale.value),
    transform: [{ scale: 1 + 0.06 * breath.value + 0.1 * finale.value }],
  }));
  const crownStyle = useAnimatedStyle(() => ({
    opacity: crownOp.value,
    transform: [{ rotate: `${crownRot.value}deg` }],
  }));

  // L'emblème tourne comme une pièce autour de son axe vertical. À la fermeture il fait demi-tour
  // jusqu'à passer de profil (le miroir de son entrée).
  const planeStyle = useAnimatedStyle(() => {
    const a = norm(spin.value + 90 * finale.value);
    return {
      transform: [
        { perspective },
        { rotateY: `${a}deg` },
        { scale: 1 + 0.02 * breath.value },
      ],
    };
  });
  // Le « F » : tourne avec l'emblème, mais ne se montre que de face (jamais à l'envers), et sa
  // révélation suit la rotation : il apparaît pendant le dernier tour.
  const fStyle = useAnimatedStyle(() => {
    const a = norm(spin.value + 90 * finale.value);
    const facing = Math.cos((a * Math.PI) / 180) > 0.03 ? 1 : 0;
    const reveal = Math.min(1, Math.max(0, (spin.value - 400) / 280));
    return {
      opacity: reveal * facing,
      transform: [
        { perspective },
        { rotateY: `${a}deg` },
        { scale: fScale.value * (1 + 0.04 * breath.value) },
      ],
    };
  });
  const fGlowStyle = useAnimatedStyle(() => ({ opacity: fGlow.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.value * 0.75,
    transform: [{ translateY: (1 - mark.value) * -6 }],
  }));
  const greetStyle = useAnimatedStyle(() => ({
    opacity: greet.value,
    transform: [{ translateY: (1 - greet.value) * 8 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: label.value * 0.75,
    transform: [{ translateY: (1 - label.value) * 8 }],
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

  // Petites étoiles qui scintillent autour de l'emblème posé (positions stables).
  const twinkles = useMemo(() => {
    const rnd = seededRandom(`twinkle-${look.id}`);
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + rnd() * 0.6;
      const r = S * (0.56 + rnd() * 0.22);
      return {
        x: S / 2 + Math.cos(a) * r,
        y: S / 2 + Math.sin(a) * r,
        size: 8 + Math.round(rnd() * 6),
        delay: LAND_AT - 100 + i * 95 + Math.round(rnd() * 120),
        period: 520 + Math.round(rnd() * 240),
        kind: i % 3 === 0 ? 'dot' : 'star',
      };
    });
  }, [look.id, S]);

  const accent = seasonal ? ambiance.accent : '#FFFFFF';
  const glowColor = seasonal ? rgbToHex(ambiance.glow) : '#FFFFFF';
  // Les graduations « blanches » du début prennent la teinte claire de la saison (blanc pur sans).
  const whiteTone = seasonal ? look.crown[0] : '#FFFFFF';
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

        {/* Fine couronne de 120 repères : elle, ne tourne pas sur l'axe (elle reste comme un cadre) */}
        <Animated.View
          style={[
            styles.abs,
            { left: S / 2 - crownBox / 2, top: S / 2 - crownBox / 2, width: crownBox, height: crownBox },
            crownStyle,
          ]}
        >
          <FineCrown radius={crownRadius} color={look.crown[0]} opacity={look.crown[1]} />
        </Animated.View>

        {/* Ondes de choc : une au départ de la rotation, deux à l'atterrissage */}
        {!reduced ? (
          <>
            <Shock D={ringDiameter} delay={SPIN_AT + 20} color={accent} loop={false} play={armed} />
            <Shock D={ringDiameter} delay={LAND_AT - 50} color={accent} loop={false} play={armed} />
            <Shock D={ringDiameter} delay={LAND_AT + 70} color={accent} loop={false} play={armed} />
            {isLong ? <Shock D={ringDiameter} delay={SUSTAIN_AT + 200} color={accent} loop play={armed} /> : null}
            {isLong ? <Shock D={ringDiameter} delay={SUSTAIN_AT + 950} color={accent} loop play={armed} /> : null}
          </>
        ) : null}

        {/* L'EMBLÈME qui tourne : anneau blanc allumé par une comète, puis anneau de couleurs
            qui arrive en vague par-dessus (au milieu de la vague, les graduations sont pastel) */}
        <Animated.View style={[styles.abs, { left: 0, top: 0, width: S, height: S }, planeStyle]}>
          {!reduced ? (
            <LaunchRing
              size={S}
              preset="icon"
              color={whiteTone}
              baseOpacity={0}
              mode="fill"
              startDelay={IGNITE_AT}
              sweepMs={IGNITE_SWEEP}
              riseMs={140}
              play={armed}
            />
          ) : null}
          <View style={[styles.abs, { left: 0, top: 0, width: S, height: S }]}>
            <LaunchRing
              size={S}
              preset="icon"
              color={look.ring}
              baseOpacity={0}
              mode={reduced ? 'static' : 'fill'}
              staticOpacity={1}
              startDelay={WIPE_AT}
              sweepMs={WIPE_SWEEP}
              riseMs={220}
              play={armed}
            />
          </View>
          {/* Comète qui allume l'anneau, puis (version longue) étincelle qui continue d'orbiter */}
          {!reduced ? (
            <>
              <Orbiter S={S} k={k} delay={IGNITE_AT} duration={IGNITE_SWEEP} loop={false} color={accent} play={armed} />
              {isLong ? (
                <Orbiter S={S} k={k} delay={SUSTAIN_AT} duration={3200} loop color={accent} play={armed} />
              ) : null}
            </>
          ) : null}
        </Animated.View>

        {/* Lueur derrière le « F », puis le « F » lui-même (tourne avec l'emblème, de face seulement) */}
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

        {/* Étincelles (et formes de la saison) à l'atterrissage */}
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
                play={armed}
                kind={t.kind}
                ink="#FFFFFF"
                accent={accent}
              />
            ))}
          </>
        ) : null}

        {/* Le nom, au-dessus de l'emblème */}
        <Animated.Text style={[styles.mark, { top: -44, left: -60, width: S + 120 }, markStyle]}>
          FLEX TIMER
        </Animated.Text>

        {/* Le petit mot de la saison, sous l'anneau */}
        {seasonal && look.greeting ? (
          <Animated.Text style={[styles.greeting, { top: S + 22, left: -60, width: S + 120 }, greetStyle]}>
            {look.greeting}
          </Animated.Text>
        ) : null}

        {/* Version longue : on dit pourquoi elle est longue */}
        {isLong ? (
          <Animated.Text
            style={[
              styles.label,
              { top: S + (seasonal && look.greeting ? 50 : 22), left: -60, width: S + 120 },
              labelStyle,
            ]}
          >
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
const Shock = memo(function Shock({ D, delay, color, loop, play }) {
  const p = useSharedValue(0);

  useEffect(() => {
    if (!play) return;
    const run = withTiming(1, { duration: loop ? 1500 : 760, easing: E_OUT });
    p.value = withDelay(delay, loop ? withRepeat(run, -1, false) : run);
  }, [play]);

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
const Orbiter = memo(function Orbiter({ S, k, delay, duration, loop, color, play }) {
  const rot = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    if (!play) return;
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
  }, [play]);

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
const Twinkle = memo(function Twinkle({ x, y, size, delay, period, loop, kind, ink, accent, play }) {
  const p = useSharedValue(0);

  useEffect(() => {
    if (!play) return;
    const run = withTiming(1, { duration: period, easing: Easing.linear });
    p.value = withDelay(delay, loop ? withRepeat(run, -1, false) : run);
  }, [play]);

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
  mark: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 6,
    color: '#FFFFFF',
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
