import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';

import TickRing from '../components/common/TickRing';
import GradientBackground from '../components/common/GradientBackground';
import { useTimers } from '../contexts/TimersContext';
import { computeSessionStats } from '../lib/timer-engine';
import { formatDuration } from '../lib/formatters';
import { fonts } from '../lib/fonts';

const HISTORY_KEY = 'flexTimer_history';

export default function EndSession() {
  const router = useRouter();
  const { timerId, elapsed } = useLocalSearchParams();
  const { timers } = useTimers();
  const timer = timers.find((t) => t.id === timerId);
  const elapsedNum = Number(elapsed) || 0;
  const savedRef = useRef(false);

  const stats = timer
    ? computeSessionStats(timer, elapsedNum)
    : { roundsLabel: '—', workTotal: 0, restTotal: 0, completedRounds: 0, totalRounds: 0 };

  useEffect(() => {
    if (!timer || savedRef.current) return;
    savedRef.current = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        const list = raw ? JSON.parse(raw) : [];
        list.push({
          id: Date.now().toString(),
          timerId: timer.id,
          name: timer.name,
          color: timer.color,
          intensity: timer.tag,
          durationSeconds: elapsedNum,
          completedRounds: stats.completedRounds,
          totalRounds: stats.totalRounds,
          workTotal: stats.workTotal,
          restTotal: stats.restTotal,
          date: new Date().toISOString(),
        });
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
      } catch {}
    })();
  }, []);

  if (!timer) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          <Text style={styles.bravo}>?</Text>
          <Text style={styles.subtitle}>Timer introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateLabel = formatDateLabel(new Date());
  const restValue = stats.restTotal > 0 ? formatDuration(stats.restTotal) : '—';
  const workValue = formatDuration(stats.workTotal);

  return (
    <GradientBackground
      colors={[timer.color, '#0A0A0A', '#000000']}
      textMode="light"
      ambient
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>SÉANCE TERMINÉE</Text>
        </View>

      <View style={styles.body}>
        <View style={styles.badge}>
          <View style={[styles.badgeDot, { backgroundColor: timer.color }]} />
          <Text style={[styles.badgeName, { color: timer.color }]}>
            {timer.name}
          </Text>
          <Text style={styles.badgeDate}>· {dateLabel}</Text>
        </View>

        <Text style={[styles.bravo, { textShadowColor: timer.color + '88' }]}>
          BRAVO
        </Text>
        <Text style={styles.tagline}>Tu l'as fait jusqu'au bout</Text>

        <View style={styles.ringWrap}>
          <TickRing
            progress={1}
            size={260}
            colorActive={timer.color}
            colorInactive="rgba(255,255,255,0.12)"
          />
          <View style={styles.ringCenter} pointerEvents="none">
            <Text style={styles.durationLabel}>DURÉE TOTALE</Text>
            <Text style={styles.durationValue}>{formatDuration(elapsedNum)}</Text>
            <View style={styles.intensityRow}>
              <View style={[styles.intensityBar, { backgroundColor: timer.color }]} />
              <Text style={[styles.intensityText, { color: timer.color }]}>
                {timer.tag}
              </Text>
              <View style={[styles.intensityBar, { backgroundColor: timer.color }]} />
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCell label="TOURS" value={stats.roundsLabel} color="#FFFFFF" />
          <StatCell label="TRAVAIL" value={workValue} color="#1FC777" />
          <StatCell label="REPOS" value={restValue} color="#4A90FF" />
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.replace('/home')}
          style={({ pressed }) => [
            styles.btnSecondary,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.btnSecondaryText}>Accueil</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.replace({ pathname: '/countdown', params: { timerId: timer.id } })
          }
          style={({ pressed }) => [
            styles.btnPrimary,
            { backgroundColor: timer.color, shadowColor: timer.color },
            pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
            <Path
              d="M3 2l7 4-7 4V2z"
              fill={timer.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF'}
            />
          </Svg>
          <Text
            style={[
              styles.btnPrimaryText,
              { color: timer.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF' },
            ]}
          >
            Refaire la séance
          </Text>
        </Pressable>
      </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

function StatCell({ label, value, color }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statCellLabel}>{label}</Text>
      <Text style={[styles.statCellValue, { color }]}>{value}</Text>
    </View>
  );
}

const formatDateLabel = (d) => {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Aujourd'hui · ${hh}:${mm}`;
};

const styles = StyleSheet.create({
  safe: { flex: 1 },

  statusBar: {
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.55)',
  },

  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeName: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 3.3,
  },
  badgeDate: {
    fontFamily: fonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
  },

  bravo: {
    fontFamily: fonts.display,
    fontSize: 92,
    letterSpacing: -4,
    lineHeight: 92,
    includeFontPadding: false,
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 30,
  },
  tagline: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
    letterSpacing: 3.6,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    marginBottom: 24,
  },

  ringWrap: {
    width: 260,
    height: 260,
    marginBottom: 28,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  durationValue: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 56,
    letterSpacing: -2.2,
    lineHeight: 56,
    includeFontPadding: false,
    color: '#FFFFFF',
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  intensityBar: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  intensityText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  statsGrid: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 360,
    gap: 8,
  },
  statCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
  },
  statCellLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statCellValue: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  btnSecondary: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  btnPrimary: {
    flex: 1.4,
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  btnPrimaryText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },

  subtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
  },
});