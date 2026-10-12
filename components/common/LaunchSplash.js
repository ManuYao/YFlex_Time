import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import LaunchRing, { FineCrown, RadialGlow, RingHalo } from './LaunchRing';
import useArmed from '../../hooks/useArmed';
import { useSettings } from '../../contexts/SettingsContext';
import { fonts } from '../../lib/fonts';
import { playSound, playSoundSequence, preloadSound, isSoundEnabled } from '../../lib/sounds';
import { consumeUpdateSplash } from '../../lib/splash';
import { appReadyAt, onAppReady } from '../../lib/appReady';
import { splashExitAt, splashLookFor, tickGeometry } from '../../lib/launchVisuals';

/**
 * Intro de démarrage, bloquante (voir lib/splash.js pour savoir quand elle se joue).
 *
 * Volontairement CALME : notre icône, bien finie, sur un fond dessiné. Rien ne jaillit, rien ne
 * tourne, aucune étincelle. Tout apparaît en fondu doux, dans l'ordre :
 *   1. le fond se révèle (fondu sur place, JAMAIS une ouverture qui part du centre : un fond qui
 *      grandit depuis le milieu fait « porte qui s'ouvre ») ;
 *   2. l'anneau de 60 graduations s'allume dans le sens des aiguilles d'une montre, aux quatre
 *      couleurs des modes, avec son halo ;
 *   3. la fine couronne de 120 repères, puis le « F » d'Anton, se posent ;
 *   4. le nom, discret ;
 *   5. l'emblème TIENT (une vraie pause pour le lire), puis tout s'efface en fondu.
 *
 * DEUX durées, calées sur le son, MÊME dessin :
 *   - courte : un seul son (`intro`), l'emblème tient environ 1,2 s ;
 *   - longue (après une mise à jour, quand les sons sont actifs) : `intro` puis `introNew`. Le
 *     dessin est le même, l'emblème reste posé (il respire à peine) et l'intro ne se referme
 *     QUE quand le dernier son est fini : si la seconde mélodie est raccourcie un jour, l'intro
 *     se raccourcit toute seule. « NOUVELLE VERSION » s'écrit sous l'emblème.
 * Dans les deux cas elle attend aussi que l'écran derrière (accueil) soit prêt
 * (lib/appReady.js), dans la limite de la patience prévue. Le moment de la fermeture est décidé
 * par `splashExitAt` (lib/launchVisuals.js, testé).
 *
 * UN SEUL dessin pour l'instant (pas de variante par saison) : à valider avant de le décliner.
 *
 * PRÉCHARGEMENT : tout l'arbre est monté et dessiné dans son état de départ AVANT que l'horloge
 * et le son ne démarrent (hooks/useArmed.js).
 *
 * Légèreté : `opacity` et un peu de `transform` sur le fil d'interface ; les 60 graduations
 * n'animent chacune que leur opacité. Avec « réduire les animations » : tout est posé d'emblée,
 * seul le fondu de fermeture reste.
 */

const INITIAL = Dimensions.get('window');
const EXIT_MS = 560;

const E_OUT = Easing.out(Easing.cubic);
const E_SOFT = Easing.inOut(Easing.sin);

// Calendrier (ms depuis l'armement).
const BG_MS = 900; // le fond se révèle, en fondu
const RING_AT = 400; // l'anneau s'allume...
const RING_SWEEP = 1000; // ... en un tour complet
const RING_RISE = 320; // chaque graduation monte doucement
const CROWN_AT = 900; // la fine couronne
const F_AT = 1150; // le « F »
const MARK_AT = 1700; // le nom
const SUSTAIN_AT = 2400; // version longue : l'emblème respire à peine

// Le « F » d'Anton de l'icône (canevas de 512), voir design/build-icons.js.
const F_PATH =
  'M222.4 340.0L222.4 172.0L289.6 172.0L289.6 204.7L256.2 204.7L256.2 231.5L287.9 231.5L287.9 263.8L256.2 263.8L256.2 340.0Z';

// Sons à décoder pendant l'intro, pour que la première séance démarre sans latence.
const WARM_SOUNDS = ['countdown1', 'countdown2', 'countdown3', 'go', 'next1', 'next2', 'next3'];

export default function LaunchSplash({ onDone }) {
  // Les réglages (sons coupés) doivent être lus AVANT de rien jouer : sinon l'intro jouerait un
  // son que l'utilisateur a coupé. On attend donc les réglages (au plus 700 ms) puis UN rendu de
  // plus : les effets des fournisseurs (réglage des sons) ont alors tous tourné.
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
  const look = useMemo(() => splashLookFor(null), []); // UN seul dessin pour l'instant
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

  /* ───── valeurs animées ───── */

  const bgOp = useSharedValue(reduced ? 1 : 0);
  const glow = useSharedValue(reduced ? 0.1 : 0);
  const haloOp = useSharedValue(reduced ? 1 : 0);
  const crownOp = useSharedValue(reduced ? 1 : 0);
  const fOp = useSharedValue(reduced ? 1 : 0);
  const fScale = useSharedValue(reduced ? 1 : 0.955);
  const mark = useSharedValue(reduced ? 1 : 0);
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
    finale.value = withTiming(1, { duration: EXIT_MS, easing: E_SOFT }, (finished) => {
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
      bgOp.value = withTiming(1, { duration: BG_MS, easing: E_SOFT });
      glow.value = withDelay(300, withTiming(0.1, { duration: 1300, easing: E_OUT }));
      haloOp.value = withDelay(RING_AT, withTiming(1, { duration: 1100, easing: E_OUT }));
      crownOp.value = withDelay(CROWN_AT, withTiming(1, { duration: 800, easing: E_OUT }));
      fOp.value = withDelay(F_AT, withTiming(1, { duration: 750, easing: E_OUT }));
      fScale.value = withDelay(F_AT, withTiming(1, { duration: 1000, easing: E_OUT }));
      mark.value = withDelay(MARK_AT, withTiming(1, { duration: 600, easing: E_OUT }));
      if (isLong) {
        label.value = withDelay(SUSTAIN_AT, withTiming(1, { duration: 600, easing: E_OUT }));
        breath.value = withDelay(
          SUSTAIN_AT,
          withRepeat(withTiming(1, { duration: 2400, easing: E_SOFT }), -1, true)
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
  }, [armed]);

  /* ───── styles ───── */

  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - finale.value }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOp.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * (1 + 0.25 * breath.value),
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: haloOp.value * (0.85 + 0.15 * breath.value) }));
  const crownStyle = useAnimatedStyle(() => ({ opacity: crownOp.value }));
  // La lueur derrière le « F » reste très discrète : un « F » blanc sur un blob blanc ne se lirait pas.
  const fGlowStyle = useAnimatedStyle(() => ({ opacity: fOp.value * 0.2 }));
  const fStyle = useAnimatedStyle(() => ({
    opacity: fOp.value,
    transform: [{ scale: fScale.value * (1 + 0.012 * breath.value) }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.value * 0.7,
    transform: [{ translateY: (1 - mark.value) * -4 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: label.value * 0.7,
    transform: [{ translateY: (1 - label.value) * 4 }],
  }));

  const crownRadius = (226 / 512) * S;
  const crownBox = (crownRadius + 2) * 2;
  const auraSize = S * 1.9;
  const fGlowSize = S * 0.6;
  const haloBox = S * 1.5;

  return (
    <Animated.View style={[styles.root, rootStyle]} onLayout={handleLayout}>
      <Pressable style={StyleSheet.absoluteFill} />

      {/* Le fond dessiné : se révèle en fondu, sur place */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]} pointerEvents="none">
        <BackdropArt width={size.width} height={size.height} bg={look.bg} S={S} />
      </Animated.View>

      <View style={[styles.stage, { width: S, height: S }]} pointerEvents="none">
        {/* Lumière douce derrière l'emblème */}
        <Animated.View
          style={[
            styles.abs,
            { left: S / 2 - auraSize / 2, top: S / 2 - auraSize / 2, width: auraSize, height: auraSize },
            glowStyle,
          ]}
        >
          <RadialGlow size={auraSize} color="#FFFFFF" id="splashAura" />
        </Animated.View>

        {/* Halo de l'anneau */}
        <Animated.View
          style={[
            styles.abs,
            { left: S / 2 - haloBox / 2, top: S / 2 - haloBox / 2, width: haloBox, height: haloBox },
            haloStyle,
          ]}
        >
          <RingHalo size={S} color="#FFFFFF" id="splashHalo" />
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

        {/* L'anneau de 60 graduations de l'icône, aux quatre couleurs des modes */}
        <View style={[styles.abs, { left: 0, top: 0, width: S, height: S }]}>
          <LaunchRing
            size={S}
            preset="icon"
            color={look.ring}
            baseOpacity={0}
            mode={reduced ? 'static' : 'fill'}
            staticOpacity={1}
            startDelay={RING_AT}
            sweepMs={RING_SWEEP}
            riseMs={RING_RISE}
            play={armed}
          />
        </View>

        {/* Lueur derrière le « F », puis le « F » */}
        <View
          style={[
            styles.abs,
            { left: S / 2 - fGlowSize / 2, top: S / 2 - fGlowSize / 2, width: fGlowSize, height: fGlowSize },
          ]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, fGlowStyle]}>
            <RadialGlow size={fGlowSize} color="#FFFFFF" id="splashFGlow" />
          </Animated.View>
        </View>
        <Animated.View style={[styles.abs, { left: 0, top: 0, width: S, height: S }, fStyle]}>
          <Svg width={S} height={S} viewBox="0 0 512 512">
            <Path d={F_PATH} fill="#FFFFFF" />
          </Svg>
        </Animated.View>

        {/* Le nom, discret, au-dessus de l'emblème */}
        <Animated.Text style={[styles.mark, { top: -46, left: -60, width: S + 120 }, markStyle]}>
          FLEX TIMER
        </Animated.Text>

        {/* Version longue : on dit pourquoi elle est longue */}
        {isLong ? (
          <Animated.Text style={[styles.label, { top: S + 26, left: -60, width: S + 120 }, labelStyle]}>
            NOUVELLE VERSION
          </Animated.Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

/**
 * Le fond dessiné : le dégradé de l'icône (ardoise, plus claire au centre), des cercles très fins
 * concentriques autour de l'emblème, un grand anneau de graduations à peine visible dont on
 * n'aperçoit que des arcs, des points très fins (qui cassent aussi les bandes du dégradé) et des
 * bords assombris. Entièrement fixe : il se révèle en fondu et ne bouge jamais.
 */
const BackdropArt = memo(function BackdropArt({ width, height, bg, S }) {
  const cx = width / 2;
  const cy = height / 2;

  // Grand anneau fantôme : les graduations de l'anneau, à 2,1 fois sa taille, recentrées.
  const bigSize = S * 2.1;
  const big = useMemo(() => {
    const ticks = tickGeometry(bigSize, 'app');
    const dx = cx - bigSize / 2;
    const dy = cy - bigSize / 2;
    let minor = '';
    let major = '';
    ticks.forEach((t) => {
      const seg = `M${(t.x1 + dx).toFixed(1)} ${(t.y1 + dy).toFixed(1)}L${(t.x2 + dx).toFixed(1)} ${(t.y2 + dy).toFixed(1)}`;
      if (t.major) major += seg;
      else minor += seg;
    });
    return { minor, major };
  }, [bigSize, cx, cy]);

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="splashBase" cx="50%" cy="43%" rx="85%" ry="65%" fx="50%" fy="43%">
          <Stop offset="0" stopColor={bg[0]} stopOpacity="1" />
          <Stop offset="0.55" stopColor={bg[1]} stopOpacity="1" />
          <Stop offset="1" stopColor={bg[2]} stopOpacity="1" />
        </RadialGradient>
        <Pattern id="splashDots" width="22" height="22" patternUnits="userSpaceOnUse">
          <Circle cx="11" cy="11" r="1" fill="#FFFFFF" />
        </Pattern>
        <RadialGradient id="splashVignette" cx="50%" cy="45%" rx="72%" ry="62%" fx="50%" fy="45%">
          <Stop offset="0" stopColor="#000000" stopOpacity="0" />
          <Stop offset="0.6" stopColor="#000000" stopOpacity="0.12" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.62" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#splashBase)" />

      {/* Cercles très fins autour de l'emblème */}
      {[0.62, 0.9, 1.25, 1.62].map((k, i) => (
        <Circle
          key={i}
          cx={cx}
          cy={cy}
          r={S * k}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.05 - i * 0.008}
          strokeWidth={1}
        />
      ))}

      {/* Le grand anneau fantôme : on n'en voit que des arcs, en haut et en bas de l'écran */}
      <G>
        <Path d={big.minor} stroke="#FFFFFF" strokeOpacity={0.07} strokeWidth={1.5} strokeLinecap="round" fill="none" />
        <Path d={big.major} stroke="#FFFFFF" strokeOpacity={0.1} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      </G>

      <Rect width="100%" height="100%" fill="url(#splashDots)" opacity={0.05} />
      <Rect width="100%" height="100%" fill="url(#splashVignette)" />
    </Svg>
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
  // à S / 2). Les couches plus grandes que lui (aura, halo) débordent librement.
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
  label: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 5,
    color: '#FFFFFF',
  },
});
