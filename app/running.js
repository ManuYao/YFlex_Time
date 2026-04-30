import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import TickRing from '../components/common/TickRing';
import LongPressButton from '../components/common/LongPressButton';
import { useTimers } from '../contexts/TimersContext';
import { computeState, skipToNextPhaseElapsed } from '../lib/timer-engine';
import { getTokens } from '../lib/tokens';
import { fonts } from '../lib/fonts';
import { formatDuration } from '../lib/formatters';
import { useTimer } from '../hooks/useTimer';
import { useHaptic } from '../hooks/useHaptic';
import { useWakeLock } from '../hooks/useWakeLock';
import { useSound } from '../hooks/useSound';

const easeImpact = Easing.bezier(0.22, 1, 0.36, 1);
const springEnergetic = { stiffness: 380, damping: 22, mass: 1 };

export default function Running() {
  const router = useRouter();
  const { timerId } = useLocalSearchParams();
  const haptic = useHaptic();
  const sound = useSound();
  const { timers } = useTimers();

  const timer = timers.find((t) => t.id === timerId) ?? timers[0];
  const t = getTokens(timer.textMode);

  const {
    secondsElapsed,
    isPaused,
    pause,
    resume,
    seek,
  } = useTimer({ autoStart: true });

  useWakeLock(true);

  const state = computeState(timer, secondsElapsed) ?? fallbackState();
  const lastPhaseRef = useRef(state.phaseLabel);
  const navigatedRef = useRef(false);
  const skippedRef = useRef(0);

  useEffect(() => {
    if (state.phaseLabel !== lastPhaseRef.current) {
      lastPhaseRef.current = state.phaseLabel;
      if (!state.isComplete) {
        haptic.medium();
        sound.playPhase();
      }
    }
  }, [state.phaseLabel, state.isComplete]);

  useEffect(() => {
    if (state.isComplete && !navigatedRef.current) {
      navigatedRef.current = true;
      haptic.success();
      sound.playComplete();
      setTimeout(() => haptic.success(), 220);
      const realElapsed = Math.max(
        0,
        Math.floor(state.totalSecondsTarget - skippedRef.current)
      );
      router.replace({
        pathname: '/end-session',
        params: { timerId: timer.id, elapsed: realElapsed },
      });
    }
  }, [state.isComplete]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const handleReturn = () => {
    haptic.warning();
    router.replace({ pathname: '/home', params: { lastTimerId: timer.id } });
  };

  const handleReset = () => {
    haptic.warning();
    navigatedRef.current = false;
    lastPhaseRef.current = '';
    skippedRef.current = 0;
    if (isPaused) resume();
    seek(0);
  };

  const handlePauseToggle = () => {
    haptic.medium();
    if (isPaused) resume();
    else pause();
  };

  const handleSkip = () => {
    skippedRef.current += state.phaseSecondsLeft;
    const next = skipToNextPhaseElapsed(timer, secondsElapsed);
    seek(next);
    haptic.medium();
  };

  const secondsLeftWhole = Math.ceil(state.phaseSecondsLeft);
  const ctaLabel = isPaused ? 'EN PAUSE' : 'EN COURS';

  // Pulse ambiant — overlay LinearGradient timer.bgColors, opacity 0→0.15→0 cycle 2s
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }
    return () => cancelAnimation(pulseOpacity);
  }, [isPaused]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  // Ring breathing — scale [1, 1.012, 1] cycle 1s quand running
  const ringScale = useSharedValue(1);
  useEffect(() => {
    if (isPaused) {
      cancelAnimation(ringScale);
      ringScale.value = withTiming(1, { duration: 300 });
    } else {
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.012, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }
    return () => cancelAnimation(ringScale);
  }, [isPaused]);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  // Phase label + time transition à chaque phase change
  const phaseY = useSharedValue(0);
  const phaseOpacity = useSharedValue(1);
  const timeScale = useSharedValue(1);
  const timeOpacity = useSharedValue(1);
  useEffect(() => {
    phaseY.value = 8;
    phaseOpacity.value = 0;
    phaseY.value = withDelay(100, withTiming(0, { duration: 300, easing: easeImpact }));
    phaseOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));

    timeScale.value = 0.7;
    timeOpacity.value = 0;
    timeScale.value = withSpring(1, springEnergetic);
    timeOpacity.value = withTiming(1, { duration: 300 });
  }, [state.phaseLabel]);
  const phaseLabelStyle = useAnimatedStyle(() => ({
    opacity: phaseOpacity.value,
    transform: [{ translateY: phaseY.value }],
  }));
  const timeStyle = useAnimatedStyle(() => ({
    opacity: timeOpacity.value,
    transform: [{ scale: timeScale.value }],
  }));

  return (
    <GradientBackground colors={timer.bgColors} textMode={timer.textMode}>
      {/* Pulse ambiant */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, pulseStyle]}
      >
        <LinearGradient
          colors={timer.bgColors}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TopBar
          tokens={t}
          name={timer.name}
          tag={ctaLabel}
          roundLabel={state.roundLabel}
          onReturn={handleReturn}
          progress={state.totalProgress}
          isPaused={isPaused}
        />

        <View style={styles.center}>
          <Animated.View style={[styles.ringWrap, ringStyle]}>
            <TickRing
              progress={state.ringProgress}
              size={320}
              colorActive={t.ringActive}
              colorInactive={t.ringInactive}
            />
            <View style={styles.ringCenter} pointerEvents="none">
              <Animated.Text
                style={[
                  styles.phaseLabel,
                  { color: t.tertiary },
                  state.phaseLabel.length > 16 && { fontSize: 9, letterSpacing: 2.5 },
                  phaseLabelStyle,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {state.phaseLabel}
              </Animated.Text>
              <Animated.Text style={[styles.bigTime, { color: t.primary }, timeStyle]}>
                {formatDuration(secondsLeftWhole)}
              </Animated.Text>
              <Text style={[styles.restantLabel, { color: t.tertiary }]}>RESTANT</Text>
            </View>
          </Animated.View>

          <PhasesPills phases={state.phasesList} timer={timer} tokens={t} />
        </View>

        <BottomControls
          tokens={t}
          isPaused={isPaused}
          onReset={handleReset}
          onPauseToggle={handlePauseToggle}
          onSkip={handleSkip}
        />
      </SafeAreaView>

      {isPaused && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          pointerEvents="none"
          style={StyleSheet.absoluteFillObject}
        >
          <BlurView
            intensity={8}
            tint="dark"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'rgba(0,0,0,0.15)' },
            ]}
          />
        </Animated.View>
      )}
    </GradientBackground>
  );
}

function TopBar({ tokens, name, tag, roundLabel, onReturn, progress, isPaused }) {
  const dotScale = useSharedValue(1);
  const dotOpacity = useSharedValue(0.6);
  useEffect(() => {
    if (isPaused) {
      cancelAnimation(dotScale);
      cancelAnimation(dotOpacity);
      dotScale.value = withTiming(1, { duration: 300 });
      dotOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      dotScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
      dotOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }
    return () => {
      cancelAnimation(dotScale);
      cancelAnimation(dotOpacity);
    };
  }, [isPaused]);
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotOpacity.value,
  }));

  return (
    <View style={styles.topBar}>
      <View style={styles.topRow}>
        <LongPressButton
          label="Retour"
          size={44}
          duration={2000}
          borderColor={tokens.btnBorder}
          ringColor={tokens.primary}
          labelColor={tokens.muted}
          pressedBg={tokens.chipBg}
          onComplete={onReturn}
        >
          <Text style={[styles.backArrow, { color: tokens.primary }]}>‹</Text>
        </LongPressButton>

        <View style={styles.topCenter}>
          <Text style={[styles.topName, { color: tokens.tertiary }]}>{name}</Text>
          <View style={styles.topTagRow}>
            <Animated.View
              style={[styles.statusDot, { backgroundColor: tokens.primary }, dotStyle]}
            />
            <Text style={[styles.topTag, { color: tokens.primary }]}>{tag}</Text>
          </View>
        </View>

        <View style={styles.topRight}>
          <Text style={[styles.topRoundLabel, { color: tokens.tertiary }]}>TOUR</Text>
          <Text style={[styles.topRoundValue, { color: tokens.primary }]}>{roundLabel}</Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: tokens.ringInactive }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: tokens.primary,
              width: `${Math.min(100, progress * 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

function PhasesPills({ phases, timer, tokens }) {
  if (!phases || phases.length === 0) return null;
  const isDark = timer.textMode === 'dark';
  const currentTextColor = isDark ? '#FFFFFF' : '#0A0A0A';

  return (
    <View style={styles.phasesWrap}>
      <Text style={[styles.derouleLabel, { color: tokens.muted }]}>Déroulé</Text>
      <View style={styles.phasesRow}>
        {phases.map((p, i) => {
          const isCurrent = p.status === 'current';
          const isDone = p.status === 'done';
          const bg = isCurrent ? tokens.primary : isDone ? 'transparent' : tokens.chipBg;
          const border = isCurrent ? tokens.primary : isDone ? tokens.chipDone : tokens.chipBorder;
          const color = isCurrent ? currentTextColor : isDone ? tokens.chipDone : tokens.chipText;
          return (
            <PhaseChip
              key={i}
              index={i}
              isCurrent={isCurrent}
              bg={bg}
              border={border}
              color={color}
              label={p.label}
              tokens={tokens}
            />
          );
        })}
      </View>
    </View>
  );
}

function PhaseChip({ index, isCurrent, bg, border, color, label, tokens }) {
  const entryY = useSharedValue(16);
  const entryOpacity = useSharedValue(0);
  const entryScale = useSharedValue(0.85);
  useEffect(() => {
    const delay = 350 + index * 50;
    entryY.value = withDelay(delay, withSpring(0, springEnergetic));
    entryOpacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    entryScale.value = withDelay(delay, withSpring(1, springEnergetic));
  }, []);
  const entryStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ translateY: entryY.value }, { scale: entryScale.value }],
  }));

  // Pulse ring sur le chip current
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  useEffect(() => {
    if (isCurrent) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 750, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 })
        ),
        -1
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(0, { duration: 750, easing: Easing.out(Easing.ease) })
        ),
        -1
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = 0;
    }
    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
    };
  }, [isCurrent]);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.phaseChip,
        { backgroundColor: bg, borderColor: border },
        entryStyle,
      ]}
    >
      {isCurrent && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.phaseChipPulse,
            { borderColor: tokens.primary },
            pulseStyle,
          ]}
        />
      )}
      <Text style={[styles.phaseText, { color }]}>{label}</Text>
    </Animated.View>
  );
}

function BottomControls({ tokens, isPaused, onReset, onPauseToggle, onSkip }) {
  return (
    <View style={styles.bottom}>
      <View style={styles.bottomRow}>
        <LongPressButton
          label="Reset"
          size={64}
          borderColor={tokens.btnBorder}
          ringColor={tokens.primary}
          labelColor={tokens.muted}
          pressedBg={tokens.chipBg}
          onComplete={onReset}
        >
          <Text style={[styles.bottomIcon, { color: tokens.primary }]}>↺</Text>
        </LongPressButton>

        <Pressable
          onPress={onPauseToggle}
          style={({ pressed }) => [
            styles.pauseBtn,
            {
              backgroundColor: tokens.ctaBg,
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Text style={[styles.pauseIcon, { color: tokens.ctaText }]}>
            {isPaused ? '▶' : '❚❚'}
          </Text>
        </Pressable>

        <LongPressButton
          label="Skip"
          size={64}
          borderColor={tokens.btnBorder}
          ringColor={tokens.primary}
          labelColor={tokens.muted}
          pressedBg={tokens.chipBg}
          onComplete={onSkip}
        >
          <Text style={[styles.bottomIcon, { color: tokens.primary }]}>▶▶</Text>
        </LongPressButton>
      </View>
    </View>
  );
}

const fallbackState = () => ({
  phase: '',
  phaseLabel: '—',
  phaseSecondsTotal: 0,
  phaseSecondsLeft: 0,
  currentRound: 0,
  totalRounds: 0,
  roundLabel: '—',
  totalSecondsTarget: 0,
  totalProgress: 0,
  ringProgress: 0,
  isComplete: false,
  phasesList: [],
});

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backArrow: {
    fontSize: 22,
    fontFamily: fonts.sansBold,
    marginTop: -3,
  },
  topCenter: {
    alignItems: 'center',
    paddingTop: 4,
  },
  topName: {
    fontFamily: fonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  topTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  topTag: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  topRight: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  topRoundLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  topRoundValue: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 20,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  ringWrap: {
    width: 320,
    height: 320,
    marginBottom: 32,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bigTime: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 76,
    letterSpacing: -3,
    lineHeight: 80,
    includeFontPadding: false,
  },
  restantLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 8,
  },

  phasesWrap: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  derouleLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 2.7,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  phasesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  phaseChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 40,
    alignItems: 'center',
    overflow: 'visible',
  },
  phaseChipPulse: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderWidth: 2,
    borderRadius: 999,
  },
  phaseText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    paddingTop: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  bottomIcon: {
    fontSize: 18,
    fontFamily: fonts.sansBold,
  },
  pauseBtn: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  pauseIcon: {
    fontSize: 28,
    fontFamily: fonts.sansExtraBold,
  },
});
