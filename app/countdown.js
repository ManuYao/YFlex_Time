import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import { useTimers } from '../contexts/TimersContext';
import { fonts } from '../lib/fonts';
import { useHaptic } from '../hooks/useHaptic';
import { useSound } from '../hooks/useSound';

const COUNTDOWN_FROM = 3;
const TICK_RING_SIZE = 500;
const TICK_COUNT = 60;
const easeOvershoot = Easing.bezier(0.22, 1.5, 0.36, 1);

export default function Countdown() {
  const router = useRouter();
  const { timerId } = useLocalSearchParams();
  const haptic = useHaptic();
  const sound = useSound();
  const { timers } = useTimers();

  const timer = timers.find((t) => t.id === timerId) ?? timers[0];
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [isGo, setIsGo] = useState(false);

  useEffect(() => {
    haptic.medium();
    sound.playTick();
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
    sound.playComplete();
    const id = setTimeout(() => {
      router.replace({ pathname: '/running', params: { timerId: timer.id } });
    }, 600);
    return () => clearTimeout(id);
  }, [isGo]);

  const handleCancel = () => {
    if (isGo) return;
    haptic.warning();
    router.back();
  };

  const isDark = timer.textMode === 'dark';
  const textColor = isDark ? '#0A0A0A' : '#FFFFFF';
  const dimColor = isDark ? 'rgba(10,10,10,0.65)' : 'rgba(255,255,255,0.75)';
  const mutedColor = isDark ? 'rgba(10,10,10,0.45)' : 'rgba(255,255,255,0.55)';
  const tickColor = isDark ? 'rgba(10,10,10,0.55)' : 'rgba(255,255,255,0.85)';
  const waveColor = isGo ? (isDark ? '#0A0A0A' : '#FFFFFF') : timer.color;

  const heroDuration = formatTimerHint(timer);

  // Onde radiale par tick (key sur count + isGo)
  const waveScale = useSharedValue(0);
  const waveOpacity = useSharedValue(0);
  useEffect(() => {
    waveScale.value = 0;
    waveOpacity.value = 0.6;
    waveScale.value = withTiming(5, { duration: 1000, easing: Easing.out(Easing.cubic) });
    waveOpacity.value = withTiming(0, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [count, isGo]);
  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: waveScale.value }],
    opacity: waveOpacity.value,
  }));

  // Ticks rotatifs décoratifs (rotation infinie 10s linear, opacity 0→0.4 à mount)
  const rotation = useSharedValue(0);
  const ticksOpacity = useSharedValue(0);
  useEffect(() => {
    ticksOpacity.value = withTiming(0.4, { duration: 1000 });
    rotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1
    );
    return () => cancelAnimation(rotation);
  }, []);
  const rotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    opacity: ticksOpacity.value,
  }));

  // Hero number scale 0.3 → 1.3 → 1 (overshoot) + opacity 0→1 à chaque tick
  const heroScale = useSharedValue(0.3);
  const heroOpacity = useSharedValue(0);
  useEffect(() => {
    heroScale.value = 0.3;
    heroOpacity.value = 0;
    heroScale.value = withSequence(
      withTiming(1.3, { duration: 400, easing: easeOvershoot }),
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    heroOpacity.value = withTiming(1, { duration: 400 });
  }, [count, isGo]);
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
    opacity: heroOpacity.value,
  }));

  return (
    <GradientBackground colors={timer.bgColors} textMode={timer.textMode}>
      {/* Ticks rotatifs en background */}
      <Animated.View pointerEvents="none" style={[styles.ticksLayer, rotStyle]}>
        <Svg width={TICK_RING_SIZE} height={TICK_RING_SIZE} viewBox={`0 0 ${TICK_RING_SIZE} ${TICK_RING_SIZE}`}>
          {Array.from({ length: TICK_COUNT }).map((_, i) => {
            const angle = (i / TICK_COUNT) * Math.PI * 2;
            const r1 = TICK_RING_SIZE / 2 - 10;
            const r2 = TICK_RING_SIZE / 2;
            const cx = TICK_RING_SIZE / 2;
            const cy = TICK_RING_SIZE / 2;
            return (
              <Line
                key={i}
                x1={cx + Math.cos(angle) * r1}
                y1={cy + Math.sin(angle) * r1}
                x2={cx + Math.cos(angle) * r2}
                y2={cy + Math.sin(angle) * r2}
                stroke={tickColor}
                strokeWidth={i % 5 === 0 ? 2 : 1}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      </Animated.View>

      {/* Onde radiale */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wave,
          { borderColor: waveColor, shadowColor: waveColor },
          waveStyle,
        ]}
      />

      <Pressable style={styles.full} onPress={handleCancel}>
        <View style={styles.topLabel} pointerEvents="none">
          <Text style={[styles.prepLabel, { color: dimColor }]}>PRÉPARE-TOI</Text>
          <View style={[styles.bar, { backgroundColor: dimColor }]} />
        </View>

        <View style={styles.center} pointerEvents="none">
          <Animated.Text
            style={[
              styles.heroNumber,
              {
                color: textColor,
                fontSize: isGo ? 200 : 240,
                lineHeight: isGo ? 200 : 240,
                textShadowColor: waveColor,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 60,
              },
              heroStyle,
            ]}
          >
            {isGo ? 'GO' : count}
          </Animated.Text>
        </View>

        <View style={styles.bottomLabel} pointerEvents="none">
          <View style={[styles.bar, { backgroundColor: dimColor }]} />
          <Text style={[styles.timerHint, { color: dimColor }]}>
            {timer.name} · {heroDuration}
          </Text>
          <Text style={[styles.cancelHint, { color: mutedColor }]}>
            Appuie pour annuler
          </Text>
        </View>
      </Pressable>
    </GradientBackground>
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
  full: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
  },
  ticksLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 240,
    height: 240,
    marginTop: -120,
    marginLeft: -120,
    borderRadius: 120,
    borderWidth: 3,
    shadowOpacity: 0.8,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNumber: {
    fontFamily: fonts.display,
    letterSpacing: -10,
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
