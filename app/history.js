import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import GradientBackground from '../components/common/GradientBackground';
import { TIMERS } from '../lib/timers-config';
import {
  loadHistory,
  groupByPeriod,
  computeStreak,
  computeTotals,
  formatSessionTime,
} from '../lib/history';
import { formatDuration } from '../lib/formatters';
import { fonts } from '../lib/fonts';

const FILTERS = ['TOUS', 'AMRAP', 'BASIC', 'EMOM', 'TABATA', 'MIX'];

export default function History() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('TOUS');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadHistory().then((list) => {
        if (!cancelled) setSessions(list);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const filtered =
    filter === 'TOUS'
      ? sessions
      : sessions.filter((s) => s.name === filter);

  const grouped = groupByPeriod(filtered);
  const totals = computeTotals(sessions);
  const streak = computeStreak(sessions);

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>HISTORIQUE</Text>
        </View>

        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            hitSlop={8}
          >
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

          <View style={styles.topCenter}>
            <Text style={styles.topTitle}>Mon historique</Text>
            <Text style={styles.topSubtitle}>
              {totals.count} séance{totals.count > 1 ? 's' : ''}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path
                d="M2 4h10M4 7h6M6 10h2"
                stroke="#FFFFFF"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
        </View>

        <View style={styles.heroRow}>
          <HeroStat label="SÉANCES" value={String(totals.count)} color="#FFFFFF" />
          <HeroStat label="TEMPS" value={totals.timeLabel} color="#1FC777" />
          <HeroStat label="STREAK" value={String(streak)} unit="j" color="#FFC933" />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersRow}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((f) => {
            const isActive = f === filter;
            const color = f === 'TOUS' ? '#FFFFFF' : findColor(f);
            const textDark = f === 'TABATA' || f === 'TOUS';
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? color : 'rgba(255,255,255,0.06)',
                    borderColor: isActive ? color : 'rgba(255,255,255,0.12)',
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: isActive ? (textDark ? '#0A0A0A' : '#0A0A0A') : 'rgba(255,255,255,0.8)' },
                  ]}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {grouped.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aucune séance</Text>
              <Text style={styles.emptyHint}>
                {sessions.length === 0
                  ? 'Lance ta première séance depuis le Home'
                  : 'Aucune séance dans cette catégorie'}
              </Text>
            </View>
          ) : (
            grouped.map((group) => (
              <View key={group.date} style={styles.group}>
                <Text style={styles.groupLabel}>{group.date}</Text>
                {group.items.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    onPress={() =>
                      router.push({ pathname: '/session-detail', params: { id: s.id } })
                    }
                  />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function HeroStat({ label, value, unit, color }) {
  return (
    <View style={styles.heroCard}>
      <View
        style={[styles.heroBlob, { backgroundColor: color, opacity: 0.18 }]}
        pointerEvents="none"
      />
      <Text style={styles.heroLabel}>{label}</Text>
      <View style={styles.heroValueRow}>
        <Text style={[styles.heroValue, { color }]}>{value}</Text>
        {unit && <Text style={styles.heroUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

function SessionRow({ session, onPress }) {
  const color = session.color || '#FFFFFF';
  const tag = session.intensity || '—';
  const roundsLabel =
    session.totalRounds && session.completedRounds != null
      ? `${session.completedRounds} tours`
      : '∞';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View
        style={[styles.rowBlob, { backgroundColor: color }]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.rowBadge,
          {
            backgroundColor: `${color}22`,
            borderColor: `${color}44`,
          },
        ]}
      >
        <Text style={[styles.rowBadgeText, { color }]}>
          {session.name.slice(0, 4)}
        </Text>
      </View>

      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{session.name}</Text>
        <View style={styles.rowMeta}>
          <Text style={styles.rowMetaText}>{formatSessionTime(session.date)}</Text>
          <Dot />
          <Text style={styles.rowMetaText}>{roundsLabel}</Text>
          <Dot />
          <Text style={styles.rowMetaText}>{tag}</Text>
        </View>
      </View>

      <View style={styles.rowDuration}>
        <Text style={styles.rowDurationValue}>
          {formatDuration(session.durationSeconds || 0)}
        </Text>
        <Text style={styles.rowDurationLabel}>min</Text>
      </View>

      <Svg width={8} height={12} viewBox="0 0 8 12" fill="none">
        <Path
          d="M2 2l4 4-4 4"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

function Dot() {
  return <View style={styles.metaDot} />;
}

const findColor = (name) => {
  const t = TIMERS.find((x) => x.name === name);
  return t ? t.color : '#FFFFFF';
};

const styles = StyleSheet.create({
  safe: { flex: 1 },

  statusBar: {
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.55)',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
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
  iconBtnGhost: {
    width: 40,
    height: 40,
  },
  topCenter: {
    alignItems: 'center',
  },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  topSubtitle: {
    fontFamily: fonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginTop: 4,
  },

  heroRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 20,
  },
  heroCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroBlob: {
    position: 'absolute',
    top: -24,
    right: -24,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  heroLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroValue: {
    fontFamily: fonts.display,
    fontSize: 36,
    letterSpacing: -1,
    lineHeight: 36,
    includeFontPadding: false,
  },
  heroUnit: {
    fontFamily: fonts.sansSemibold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 2,
  },

  filtersRow: {
    flexGrow: 0,
    marginBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },

  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  empty: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  emptyHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },

  group: {
    marginBottom: 24,
  },
  groupLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  rowBlob: {
    position: 'absolute',
    top: -16,
    left: -16,
    width: 64,
    height: 64,
    borderRadius: 32,
    opacity: 0.20,
  },
  rowBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  rowMetaText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.30)',
  },
  rowDuration: {
    alignItems: 'flex-end',
  },
  rowDurationValue: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  rowDurationLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 9,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.40)',
    textTransform: 'uppercase',
    marginTop: 2,
  },
});