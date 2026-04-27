import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import GradientBackground from '../components/common/GradientBackground';
import { useTimers } from '../contexts/TimersContext';
import { fonts } from '../lib/fonts';
import { useHaptic } from '../hooks/useHaptic';
import { useSound } from '../hooks/useSound';

const COUNTDOWN_FROM = 3;

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

  const heroDuration = formatTimerHint(timer);

  return (
    <GradientBackground colors={timer.bgColors} textMode={timer.textMode}>
      <Pressable style={styles.full} onPress={handleCancel}>
        <View style={styles.topLabel} pointerEvents="none">
          <Text style={[styles.prepLabel, { color: dimColor }]}>PRÉPARE-TOI</Text>
          <View style={[styles.bar, { backgroundColor: dimColor }]} />
        </View>

        <View style={styles.center} pointerEvents="none">
          <Text
            key={isGo ? 'go' : `n${count}`}
            style={[
              styles.heroNumber,
              {
                color: textColor,
                fontSize: isGo ? 200 : 240,
                lineHeight: isGo ? 200 : 240,
              },
            ]}
          >
            {isGo ? 'GO' : count}
          </Text>
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
  if (timer.id === 'tabata' || timer.id === 'basic') {
    const work = timer.stats.find((s) => s.key === 'work')?.value ?? 0;
    const rest = timer.stats.find((s) => s.key === 'rest')?.value ?? 0;
    const rounds = timer.stats.find((s) => s.key === 'rounds')?.value ?? 0;
    return `${rounds} × ${work}/${rest}s`;
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
