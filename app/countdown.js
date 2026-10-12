import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import LaunchRing, { FineCrown, RadialGlow } from '../components/common/LaunchRing';
import LaunchBurst from '../components/common/LaunchBurst';
import useAmbiance from '../hooks/useAmbiance';
import { useTimers } from '../contexts/TimersContext';
import { buildTutorialTimer } from '../lib/tutorialShape';
import { fonts } from '../lib/fonts';
import { useLayoutLevel, useWindowSize } from '../lib/responsive';
import { LAUNCH_GLOW_REST, burstParticles, launchRingSize, rgbToHex } from '../lib/launchVisuals';
import { useHaptic } from '../hooks/useHaptic';
import { useSound } from '../hooks/useSound';

const COUNTDOWN_FROM = 3;
const E_OUT = Easing.out(Easing.cubic);
const E_INOUT = Easing.inOut(Easing.cubic);

/**
 * Décompte 3-2-1-GO. Il démarre sur l'image EXACTE où se termine la transition de lancement de
 * l'accueil (components/common/LaunchTransition.js) : même anneau de 60 graduations au même
 * centre, même taille (launchRingSize), même lueur (LAUNCH_GLOW_REST). Le changement d'écran est
 * donc invisible. Ensuite l'anneau se REMPLIT : une graduation s'allume tous les 50 ms, il est
 * plein pile au GO. Chaque seconde donne un battement de lueur et une onde qui s'éloigne de
 * l'anneau ; le GO ajoute une rafale d'étincelles, puis l'anneau s'élargit en s'effaçant pour
 * laisser la place à l'écran de séance.
 *
 * Avec une ambiance de saison : lueur et onde teintées, fine couronne de repères, formes de la
 * saison à la place des étincelles. Sans : blanc (ou noir sur un mode à texte noir).
 *
 * Tout passe par `transform` et `opacity` sur le fil d'interface. « Réduire les animations » :
 * l'anneau se remplit et les chiffres s'enchaînent en fondu, sans onde, rafale ni mouvement.
 */
export default function Countdown() {
  const router = useRouter();
  const { timerId, tutorial } = useLocalSearchParams();
  const haptic = useHaptic();
  const sound = useSound();
  const { timers } = useTimers();
  const reduced = useReducedMotion();
  const { ambiance } = useAmbiance();

  // Chrono de test du tutoriel (lib/tutorialShape.js) : le vrai décompte, mais
  // sur un BASIC aux réglages du test. Rien n'est enregistré nulle part.
  const isTutorial = tutorial === '1';
  const baseTimer = timers.find((t) => t.id === timerId) ?? timers[0];
  const timer = useMemo(
    () => (isTutorial ? buildTutorialTimer(baseTimer) : baseTimer),
    [isTutorial, baseTimer]
  );

  useEffect(() => {
    ['countdown1', 'countdown2', 'countdown3', 'go'].forEach(sound.preload);
  }, []);
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [isGo, setIsGo] = useState(false);

  useEffect(() => {
    haptic.medium();
    // count 3/2/1 -> bips 1/2/3 : les fichiers sont nommes dans l'ordre de
    // lecture, pas d'apres le chiffre affiche.
    sound.playCountdown(COUNTDOWN_FROM - count + 1);
    if (count > 1) {
      const id = setTimeout(() => setCount((c) => c - 1), 1000);
      return () => clearTimeout(id);
    }
    if (count === 1) {
      const id = setTimeout(() => setIsGo(true), 1000);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [count]);

  useEffect(() => {
    if (!isGo) return undefined;
    haptic.success();
    sound.playGo();
    // Le quota gratuit n'est PAS consommé ici : il l'est 40 s après le début
    // réel du chrono (app/running.js).
    // 850ms : le temps que l'anneau plein s'élargisse et s'efface (visuels ci-dessous), puis le
    // fondu de la pile prend le relais vers l'écran de séance.
    const id = setTimeout(() => {
      router.replace({
        pathname: '/running',
        params: { timerId: timer.id, ...(isTutorial ? { tutorial: '1' } : {}) },
      });
    }, 850);
    return () => clearTimeout(id);
  }, [isGo]);

  const handleCancel = () => {
    if (isGo) return;
    haptic.warning();
    if (isTutorial) {
      // Annuler le décompte du test ramène au tour, pas à l'accueil.
      router.replace({ pathname: '/tutorial', params: { step: 'menu' } });
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: '/home', params: { lastTimerId: timer.id } });
    }
  };

  // (V) Mise en page réduite — voir lib/responsive.js. Les 80 dp de marge
  // haute/basse sont du confort : ils passent en premier quand la fenêtre
  // est courte, avant de toucher au chiffre lui-même.
  const level = useLayoutLevel();
  const isReduced = level === 'mini' || level === 'compact';

  const isDark = timer.textMode === 'dark';
  const textColor = isDark ? '#0A0A0A' : '#FFFFFF';
  const dimColor = isDark ? 'rgba(10,10,10,0.65)' : 'rgba(255,255,255,0.75)';
  const mutedColor = isDark ? 'rgba(10,10,10,0.45)' : 'rgba(255,255,255,0.55)';

  const heroDuration = formatTimerHint(timer);

  /* ───── l'anneau, au même endroit que dans la transition ───── */

  const { width: W, height: H } = useWindowSize();
  const R = launchRingSize(W, H);
  const cx = W / 2;
  const cy = H / 2;
  const glowSize = R * 1.9;
  const accent = ambiance ? ambiance.accent : textColor;
  const glowColor = ambiance ? rgbToHex(ambiance.glow) : '#FFFFFF';
  const crownRadius = R / 2 + 8;
  const crownBox = (crownRadius + 2) * 2;
  const digitSize = Math.round(R * 0.68);
  const goSize = Math.round(R * 0.5);

  const glow = useSharedValue(LAUNCH_GLOW_REST);
  const pulse = useSharedValue(0);
  const rippleMax = useSharedValue(0.5);
  const rippleAlpha = useSharedValue(0.4);
  const goFlash = useSharedValue(0);
  const exitP = useSharedValue(0);
  const labelsOp = useSharedValue(0);
  const crownOp = useSharedValue(0);
  const crownRot = useSharedValue(0);
  const burst = useSharedValue(0);

  // Les repères du haut et du bas apparaissent en fondu : la transition n'en avait pas.
  useEffect(() => {
    labelsOp.value = withTiming(1, { duration: 450, easing: E_OUT });
    if (ambiance && !reduced) {
      crownOp.value = withDelay(150, withTiming(1, { duration: 500, easing: E_OUT }));
      crownRot.value = withTiming(110, { duration: 4200, easing: Easing.linear });
    }
  }, []);

  // Un battement à chaque seconde (et plus fort au GO) : la lueur monte et redescend, une onde
  // s'éloigne de l'anneau.
  useEffect(() => {
    if (reduced) return;
    rippleMax.value = isGo ? 1.0 : 0.5;
    rippleAlpha.value = isGo ? 0.6 : 0.4;
    pulse.value = 0;
    pulse.value = withTiming(1, { duration: isGo ? 1000 : 900, easing: E_OUT });
    glow.value = withSequence(
      withTiming(isGo ? 0.75 : 0.46, { duration: 140, easing: E_OUT }),
      withTiming(LAUNCH_GLOW_REST, { duration: isGo ? 700 : 760, easing: E_INOUT })
    );
  }, [count, isGo]);

  // GO : l'anneau plein respire, des étincelles jaillissent, puis tout s'élargit en s'effaçant.
  useEffect(() => {
    if (!isGo) return;
    if (!reduced) {
      goFlash.value = withSequence(
        withTiming(1, { duration: 200, easing: E_OUT }),
        withTiming(0, { duration: 420, easing: E_INOUT })
      );
      burst.value = withTiming(1, { duration: 900, easing: Easing.linear });
    }
    exitP.value = withDelay(reduced ? 450 : 520, withTiming(1, { duration: 300, easing: E_INOUT }));
  }, [isGo]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: rippleAlpha.value * Math.pow(1 - pulse.value, 1.4),
    transform: [{ scale: 1 + rippleMax.value * pulse.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - exitP.value,
    transform: [{ scale: 1 + 0.05 * goFlash.value + 0.12 * exitP.value }],
  }));
  const crownStyle = useAnimatedStyle(() => ({
    opacity: crownOp.value * (1 - exitP.value),
    transform: [{ rotate: `${crownRot.value}deg` }],
  }));
  const labelsStyle = useAnimatedStyle(() => ({ opacity: labelsOp.value }));

  const particles = useMemo(() => {
    if (reduced) return [];
    if (ambiance) {
      const dir = ambiance.dir;
      return burstParticles({
        seed: `go-${ambiance.id}`,
        count: 14,
        minDist: R * 0.55,
        maxDist: R * 1.05,
        minSize: 16,
        maxSize: 26,
        kinds: ambiance.motifs,
        drift: dir === 0 ? 0 : dir > 0 ? R * 0.45 : -R * 0.45,
        spin: 140,
        delayMax: 0.25,
        alpha: 0.95,
      });
    }
    return burstParticles({
      seed: `go-${timer.id}`,
      count: 12,
      minDist: R * 0.55,
      maxDist: R * 1.0,
      minSize: 3,
      maxSize: 6,
      colors: [textColor],
      spin: 0,
      delayMax: 0.25,
      alpha: 0.85,
    });
  }, [reduced, ambiance, R, textColor, timer.id]);

  return (
    <GradientBackground colors={timer.bgColors} textMode={timer.textMode}>
      {/* Lueur ronde derrière l'anneau */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.abs,
          { left: cx - glowSize / 2, top: cy - glowSize / 2, width: glowSize, height: glowSize },
          glowStyle,
        ]}
      >
        <RadialGlow size={glowSize} color={glowColor} id="launchGlowCountdown" />
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

      {/* Onde qui s'éloigne de l'anneau à chaque seconde */}
      {!reduced ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.abs,
            {
              left: cx - (R - 40) / 2,
              top: cy - (R - 40) / 2,
              width: R - 40,
              height: R - 40,
              borderRadius: (R - 40) / 2,
              borderWidth: 2,
              borderColor: accent,
            },
            rippleStyle,
          ]}
        />
      ) : null}

      {/* L'anneau de 60 graduations, qui se remplit jusqu'au GO */}
      <Animated.View
        pointerEvents="none"
        style={[styles.abs, { left: cx - R / 2, top: cy - R / 2, width: R, height: R }, ringStyle]}
      >
        <LaunchRing
          size={R}
          color={textColor}
          mode="fill"
          startDelay={120}
          sweepMs={2650}
          riseMs={170}
        />
      </Animated.View>

      {/* Étincelles du GO */}
      {!reduced ? (
        <LaunchBurst progress={burst} particles={particles} x={cx} y={cy} ink={textColor} accent={accent} />
      ) : null}

      {/* Le chiffre, au centre de l'anneau */}
      <View style={styles.heroLayer} pointerEvents="none">
        <HeroDigit
          key={isGo ? 'GO' : `c-${count}`}
          value={isGo ? 'GO' : count}
          color={textColor}
          isGo={isGo}
          size={isGo ? goSize : digitSize}
          exit={exitP}
          reduced={reduced}
        />
      </View>

      <Pressable style={[styles.full, isReduced && styles.fullReduced]} onPress={handleCancel}>
        <Animated.View style={[styles.topLabel, labelsStyle]} pointerEvents="none">
          <Text style={[styles.prepLabel, { color: dimColor }]}>PRÉPARE-TOI</Text>
          <View style={[styles.bar, { backgroundColor: dimColor }]} />
        </Animated.View>

        <View style={styles.center} pointerEvents="none" />

        <Animated.View style={[styles.bottomLabel, labelsStyle]} pointerEvents="none">
          <View style={[styles.bar, { backgroundColor: dimColor }]} />
          <Text style={[styles.timerHint, { color: dimColor }]}>
            {isTutorial ? 'TEST · ' : ''}{timer.name} · {heroDuration}
          </Text>
          <Text style={[styles.cancelHint, { color: mutedColor }]}>
            Appuie pour annuler
          </Text>
        </Animated.View>
      </Pressable>
    </GradientBackground>
  );
}

/**
 * Le chiffre (ou « GO »). Il entre en grandissant doucement et en fondu, tient sa seconde, puis
 * s'efface juste avant le chiffre suivant : une respiration par seconde, sans chevauchement ni
 * rebond. Le « GO » ne s'efface pas de lui-même : il part avec l'anneau (`exit`).
 */
function HeroDigit({ value, color, isGo, size, exit, reduced }) {
  const inP = useSharedValue(0);
  const outP = useSharedValue(0);

  useEffect(() => {
    inP.value = withTiming(1, { duration: reduced ? 200 : 520, easing: E_OUT });
    if (!isGo) outP.value = withDelay(700, withTiming(1, { duration: 280, easing: Easing.in(Easing.quad) }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, inP.value * 2.2) * (1 - outP.value) * (1 - exit.value),
    transform: reduced
      ? []
      : [{ scale: (0.86 + 0.14 * inP.value) * (1 + 0.08 * outP.value + 0.1 * exit.value) }],
  }));

  return (
    <Animated.Text
      style={[
        styles.heroNumber,
        { color, fontSize: size, lineHeight: size, letterSpacing: -Math.round(size * 0.04) },
        style,
      ]}
    >
      {value}
    </Animated.Text>
  );
}

const formatTimerHint = (timer) => {
  if (timer.id === 'amrap') {
    const v = timer.stats.find((s) => s.key === 'duration')?.value ?? 0;
    return `${v} min`;
  }
  if (timer.id === 'emom') {
    const interval = timer.stats.find((s) => s.key === 'interval')?.value ?? 0;
    const rounds = timer.stats.find((s) => s.key === 'rounds')?.value ?? 0;
    return `${rounds} × ${interval}s`;
  }
  if (timer.id === 'tabata') {
    const work = timer.stats.find((s) => s.key === 'work')?.value ?? 0;
    const rest = timer.stats.find((s) => s.key === 'rest')?.value ?? 0;
    const rounds = timer.stats.find((s) => s.key === 'rounds')?.value ?? 0;
    return `${rounds} × ${work}/${rest}s`;
  }
  if (timer.id === 'basic') {
    const rest = timer.stats.find((s) => s.key === 'rest')?.value ?? 0;
    const rounds = timer.stats.find((s) => s.key === 'rounds')?.value ?? 0;
    return `${rounds} × ${rest}s repos`;
  }
  if (timer.id === 'mix') {
    const blocks = timer._mix?.blocks?.length ?? 0;
    const total = timer.stats.find((s) => s.key === 'duration')?.value ?? '00:00';
    return `${blocks} blocs · ${total}`;
  }
  return '';
};

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
  // Le chiffre est centré sur le centre de l'écran, comme l'anneau (pas sur la zone entre les
  // deux repères, qui est un peu décalée).
  heroLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
  },
  // (V) Mise en page réduite — voir lib/responsive.js
  fullReduced: {
    paddingVertical: 20,
  },
  topLabel: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 24,
  },
  prepLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 5.5,
  },
  bar: {
    width: 40,
    height: 2,
    borderRadius: 1,
  },
  center: {
    flex: 1,
  },
  heroNumber: {
    fontFamily: fonts.display,
    includeFontPadding: false,
    textAlign: 'center',
  },
  bottomLabel: {
    alignItems: 'center',
    gap: 10,
    paddingBottom: 24,
  },
  timerHint: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 4,
  },
  cancelHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    marginTop: 4,
  },
});
