import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import GradientBackground from '../components/common/GradientBackground';
import TickRing from '../components/common/TickRing';
import { loadHistory } from '../lib/history';
import { formatDuration } from '../lib/formatters';
import { fonts } from '../lib/fonts';

export default function SessionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [session, setSession] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadHistory().then((list) => {
      if (cancelled) return;
      setSession(list.find((s) => s.id === id) || null);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!session) {
    return (
      <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
        <SafeAreaView style={styles.safe}>
          <Text style={styles.fallback}>Séance introuvable</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const dateLabel = formatDateLabel(new Date(session.date));
  const restValue = session.restTotal > 0 ? formatDuration(session.restTotal) : '—';
  const workValue = formatDuration(session.workTotal || 0);
  const roundsLabel =
    session.totalRounds && session.completedRounds != null
      ? `${session.completedRounds}/${session.totalRounds}`
      : '∞';

  return (
    <GradientBackground
      colors={[session.color || '#FFFFFF', '#0A0A0A', '#000000']}
      textMode="light"
      ambient
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path
                d="M9 2L3 7l6 5"
                stroke="#FFFFFF"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <Text style={styles.topTitle}>Détail séance</Text>
          <View style={styles.iconBtnGhost} />
        </View>

        <View style={styles.body}>
          <View style={styles.badge}>
            <View style={[styles.badgeDot, { backgroundColor: session.color }]} />
            <Text style={[styles.badgeName, { color: session.color }]}>{session.name}</Text>
            <Text style={styles.badgeDate}>· {dateLabel}</Text>
          </View>

          <View style={styles.ringWrap}>
            <TickRing
              progress={1}
              size={240}
              colorActive={session.color || '#FFFFFF'}
              colorInactive="rgba(255,255,255,0.12)"
            />
            <View style={styles.ringCenter} pointerEvents="none">
              <Text style={styles.durationLabel}>DURÉE TOTALE</Text>
              <Text style={styles.durationValue}>
                {formatDuration(session.durationSeconds || 0)}
              </Text>
              <View style={styles.intensityRow}>
                <View style={[styles.intensityBar, { backgroundColor: session.color }]} />
                <Text style={[styles.intensityText, { color: session.color }]}>
                  {session.intensity || '—'}
                </Text>
                <View style={[styles.intensityBar, { backgroundColor: session.color }]} />
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatCell label="TOURS" value={roundsLabel} color="#FFFFFF" />
            <StatCell label="TRAVAIL" value={workValue} color="#1FC777" />
            <StatCell label="REPOS" value={restValue} color="#4A90FF" />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.btnSecondary,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.btnSecondaryText}>Historique</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              router.replace({
                pathname: '/countdown',
                params: { timerId: session.timerId },
              })
            }
            style={({ pressed }) => [
              styles.btnPrimary,
              { backgroundColor: session.color, shadowColor: session.color },
              pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path d="M3 2l7 4-7 4V2z" fill="#FFFFFF" />
            </Svg>
            <Text style={styles.btnPrimaryText}>Refaire la séance</Text>
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
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} · ${hh}:${mm}`;
};

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnGhost: { width: 40, height: 40 },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.4,
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
    marginBottom: 16,
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

  ringWrap: {
    width: 240,
    height: 240,
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
    fontSize: 50,
    letterSpacing: -2,
    lineHeight: 50,
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
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  fallback: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },
});