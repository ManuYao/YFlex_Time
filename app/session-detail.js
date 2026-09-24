import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import GradientBackground from '../components/common/GradientBackground';
import TickRing from '../components/common/TickRing';
import Button from '../components/common/Button';
import IconButton from '../components/common/IconButton';
import { loadHistory } from '../lib/history';
import { formatDuration } from '../lib/formatters';
import { fonts } from '../lib/fonts';
import { BOTTOM_GAP, PAIR_GAP, ROUND_SIZE, SIDE_GAP } from '../lib/buttonTokens';
import { useUiScale, scaled } from '../lib/responsive';
import { haptic } from '../hooks/useHaptic';
import { loadCooldownMap, saveCooldownMap, getCooldownStatus, consumeLaunch } from '../lib/cooldown';
import { loadIsPremium } from '../lib/premium';

export default function SessionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [session, setSession] = useState(null);
  const ui = useUiScale();
  const ring = scaled(240, ui);
  // (V) Même correctif que /end-session : le temps au centre était figé alors
  // que l'anneau, lui, rétrécit — "00:12" repassait à la ligne dans le cercle.
  const durationSize = Math.min(50, Math.round(ring * 0.22));

  // Même contournement que end-session.js : ce bouton renvoyait direct vers
  // /countdown sans jamais passer par handleLaunch de Home.
  const handleReplay = async () => {
    const isPremium = await loadIsPremium();
    if (!isPremium) {
      const map = await loadCooldownMap();
      const status = getCooldownStatus(map, session.timerId);
      if (status.isLocked) {
        haptic.warning();
        router.replace('/premium');
        return;
      }
      await saveCooldownMap(consumeLaunch(map, session.timerId));
    }
    haptic.medium();
    router.replace({ pathname: '/countdown', params: { timerId: session.timerId } });
  };

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
          <IconButton
            icon="back"
            haptic={haptic.light}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          />
          <Text style={styles.topTitle}>Détail séance</Text>
          <View style={styles.iconBtnGhost} />
        </View>

        <View style={styles.body}>
          <View style={styles.badge}>
            <View style={[styles.badgeDot, { backgroundColor: session.color }]} />
            <Text style={[styles.badgeName, { color: session.color }]}>{session.name}</Text>
            <Text style={styles.badgeDate}>· {dateLabel}</Text>
          </View>

          <View style={[styles.ringWrap, { width: ring, height: ring, marginBottom: scaled(28, ui) }]}>
            <TickRing
              progress={1}
              size={ring}
              colorActive={session.color || '#FFFFFF'}
              colorInactive="rgba(255,255,255,0.12)"
              animateIn
            />
            <View style={styles.ringCenter} pointerEvents="none">
              <Text
                numberOfLines={1}
                style={[
                  styles.durationLabel,
                  ring < 210 && { fontSize: 9, letterSpacing: 1.4 },
                ]}
              >
                DURÉE TOTALE
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.durationValue,
                  { fontSize: durationSize, lineHeight: Math.round(durationSize * 1.1) },
                ]}
              >
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

        {/* Même rangée que la fin de séance. Couleur du texte réglée par la
            règle de contraste (accentTextOn) : noir sur TABATA, EMOM, BASIC. */}
        <View style={styles.actions}>
          <Button
            variant="glass"
            label="Historique"
            haptic={haptic.light}
            onPress={() => router.back()}
          />
          <Button
            variant="accent"
            color={session.color}
            icon="play"
            label="Refaire la séance"
            onPress={handleReplay}
            style={styles.actionMain}
          />
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
  // Même largeur que le bouton retour (ROUND_SIZE.nav) : garde le titre centré.
  iconBtnGhost: { width: ROUND_SIZE.nav, height: ROUND_SIZE.nav },
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
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    // Contenu centré dans un CERCLE : marge latérale pour ne pas toucher les
    // graduations, overflow caché pour qu'un texte trop long ne déborde pas
    // au-dessus de l'anneau.
    paddingHorizontal: '14%',
    overflow: 'hidden',
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
    gap: PAIR_GAP,
    paddingHorizontal: SIDE_GAP,
    paddingBottom: BOTTOM_GAP,
  },
  actionMain: {
    flex: 1,
  },
  fallback: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },
});