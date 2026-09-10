import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import { useTimers } from '../contexts/TimersContext';
import { fonts } from '../lib/fonts';
import { useHaptic } from '../hooks/useHaptic';
import { useSound } from '../hooks/useSound';

const COUNTDOWN_FROM = 3;
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
    // 850ms : laisse l'overshoot du GO se terminer (400+400ms) puis Stack fade prend le relais
    const id = setTimeout(() => {
      router.replace({ pathname: '/running', params: { timerId: timer.id } });
    }, 850);
    return () => clearTimeout(id);
  }, [isGo]);

  const handleCancel = () => {
    if (isGo) return;
    haptic.warning();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: '/home', params: { lastTimerId: timer.id } });
    }
  };

  const isDark = timer.textMode === 'dark';
  const textColor = isDark ? '#0A0A0A' : '#FFFFFF';
  const dimColor = isDark ? 'rgba(10,10,10,0.65)' : 'rgba(255,255,255,0.75)';
  const mutedColor = isDark ? 'rgba(10,10,10,0.45)' : 'rgba(255,255,255,0.55)';
  const waveColor = timer.color;

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


  return (
    <GradientBackground colors={timer.bgColors} textMode={timer.textMode}>
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
          <HeroDigit
            key={isGo ? 'GO' : `c-${count}`}
            value={isGo ? 'GO' : count}
            color={textColor}
            isGo={isGo}
          />
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

function HeroDigit({ value, color, isGo }) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.3, { duration: 400, easing: easeOvershoot }),
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View exiting={FadeOut.duration(280)}>
      <Animated.Text
        style={[
          styles.heroNumber,
          {
            color,
            fontSize: isGo ? 200 : 240,
            lineHeight: isGo ? 200 : 240,
          },
          aStyle,
        ]}
      >
        {value}
      </Animated.Text>
    </Animated.View>
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
