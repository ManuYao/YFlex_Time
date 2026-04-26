import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

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
        params: {
          timerId: timer.id,
          elapsed: realElapsed,
        },
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

  return (
    <GradientBackground colors={timer.bgColors} textMode={timer.textMode}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TopBar
          tokens={t}
          name={timer.name}
          tag={ctaLabel}
          roundLabel={state.roundLabel}
          onReturn={handleReturn}
          progress={state.totalProgress}
        />

        <View style={styles.center}>
          <View style={styles.ringWrap}>
            <TickRing
              progress={state.ringProgress}
              size={320}
              colorActive={t.ringActive}
              colorInactive={t.ringInactive}
            />
            <View style={styles.ringCenter} pointerEvents="none">
              <Text style={[styles.phaseLabel, { color: t.tertiary }]}>
                {state.phaseLabel}
              </Text>
              <Text style={[styles.bigTime, { color: t.primary }]}>
                {formatDuration(secondsLeftWhole)}
              </Text>
              <Text style={[styles.restantLabel, { color: t.tertiary }]}>
                RESTANT
              </Text>
            </View>
          </View>

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
    </GradientBackground>
  );
}

function TopBar({ tokens, name, tag, roundLabel, onReturn, progress }) {
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
          <Text style={[styles.topTag, { color: tokens.primary }]}>{tag}</Text>
        </View>

        <View style={styles.topRight}>
          <Text style={[styles.topRoundLabel, { color: tokens.tertiary }]}>
            TOUR
          </Text>
          <Text style={[styles.topRoundValue, { color: tokens.primary }]}>
            {roundLabel}
          </Text>
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
          const bg = isCurrent
            ? tokens.primary
            : isDone
            ? 'transparent'
            : tokens.chipBg;
          const border = isCurrent
            ? tokens.primary
            : isDone
            ? tokens.chipDone
            : tokens.chipBorder;
          const color = isCurrent
            ? currentTextColor
            : isDone
            ? tokens.chipDone
            : tokens.chipText;
          return (
            <View
              key={i}
              style={[
                styles.phaseChip,
                {
                  backgroundColor: bg,
                  borderColor: border,
                },
              ]}
            >
              <Text style={[styles.phaseText, { color }]}>{p.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
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
