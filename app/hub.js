import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import PressTap from '../components/common/PressTap';
import AppIcon from '../components/common/AppIcon';
import TickRing from '../components/common/TickRing';
import { SkeletonGroup, SkeletonBlock } from '../components/common/Skeleton';
import { MIX_COLOR } from '../components/common/MixPill';
import { useTimers } from '../contexts/TimersContext';
import { haptic } from '../hooks/useHaptic';
import { fonts } from '../lib/fonts';
import { D, slideInY } from '../lib/animations';
import { loadHistory, computeTotals, computeStreak } from '../lib/history';
import { loadPlanning, todayKey } from '../lib/planning';
import { getBlockType, getBlockDuration, getMixTotalDuration, hasEstimatedDuration } from '../lib/mix-blocks';
import { formatMixClock } from '../lib/formatters';

// Dégradé du MIX, repris tel quel de lib/timers-config.js (via le contexte) :
// la carte du hub est « un MIX » avant d'être un lien.
const FALLBACK_MIX_BG = ['#9575FF', '#4B2FC9', '#1A0D52'];

/**
 * Hub — le menu global, ouvert par le bouton en haut à gauche de l'accueil
 * (v16.2.0). Il remplace l'accès direct à l'historique : trois portes, chacune
 * ouvre sa propre page avec un bouton Retour.
 *
 *   Mix et Partage  — la grande carte. Le MIX est le point névralgique de l'app
 *                      (≠ le chrono de base) : c'est ce qui porte le freemium,
 *                      le partage entre utilisateurs et coachs.
 *   Mon historique  — les séances faites.
 *   Mon planning    — la semaine à venir.
 */
export default function Hub() {
  const router = useRouter();
  const { timers, currentMix, library } = useTimers();
  // `null` tant que rien n'est lu : les tuiles montrent un petit squelette au lieu
  // d'afficher « Aucune séance » / « Rien de prévu » une fraction de seconde.
  const [sessions, setSessions] = useState(null);
  const [planning, setPlanning] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadHistory().then((list) => {
        if (!cancelled) setSessions(list.filter((s) => !s.pendingDelete));
      });
      loadPlanning().then((p) => {
        if (!cancelled) setPlanning(p);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const mixTimer = timers.find((t) => t.id === 'mix');
  const mixBg = mixTimer?.bgColors ?? FALLBACK_MIX_BG;

  const historySummary = useMemo(() => {
    if (sessions === null) return null;
    if (sessions.length === 0) return 'Aucune séance pour l\'instant';
    const { count, timeLabel } = computeTotals(sessions);
    const streak = computeStreak(sessions);
    const base = `${count} séance${count > 1 ? 's' : ''} · ${timeLabel}`;
    return streak >= 2 ? `${base} · ${streak} jours de suite` : base;
  }, [sessions]);

  const planningSummary = useMemo(() => {
    if (planning === null) return null;
    const blocks = planning?.[todayKey()]?.blocks ?? [];
    if (blocks.length === 0) return 'Rien de prévu aujourd\'hui';
    return `Aujourd'hui · ${blocks.length} bloc${blocks.length > 1 ? 's' : ''}`;
  }, [planning]);

  const blocks = currentMix?.blocks ?? [];
  const hasMix = blocks.length > 0;
  const totalSec = hasMix ? getMixTotalDuration(blocks) : 0;

  const go = (route) => {
    haptic.light();
    router.push(route);
  };

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>MENU</Text>
        </View>

        <View style={styles.topBar}>
          <IconButton
            icon="back"
            haptic={haptic.light}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          />
          <Text style={styles.topTitle}>Menu</Text>
          <IconButton
            icon="gear"
            haptic={haptic.light}
            onPress={() => router.push('/settings')}
            accessibilityLabel="Réglages"
          />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Mix et Partage : la grande carte ── */}
          <Animated.View entering={slideInY(24, D.big, 0)}>
            <PressTap
              onPress={() => go('/mix-hub')}
              tapScale={0.98}
              accessibilityLabel="Ouvrir Mix et Partage"
              style={styles.mixCard}
            >
              <LinearGradient
                colors={mixBg}
                locations={[0, 0.5, 1]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* L'anneau à graduations, signature de l'app, en filigrane. */}
              <View style={styles.mixRing} pointerEvents="none">
                <TickRing
                  progress={0.75}
                  size={240}
                  colorActive="rgba(255,255,255,0.30)"
                  colorInactive="rgba(255,255,255,0.10)"
                />
              </View>

              <View style={styles.mixTop}>
                <View style={styles.mixBadge}>
                  <AppIcon name="mix" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.mixTag}>LE CŒUR DE L'APP</Text>
              </View>

              <Text style={styles.mixTitle}>MIX ET{'\n'}PARTAGE</Text>
              <Text style={styles.mixText}>
                Compose tes séances, partage-les avec tes amis, retrouve celles de ton coach.
              </Text>

              {hasMix ? (
                <View style={styles.mixCurrent}>
                  <View style={styles.timeline}>
                    {blocks.map((b) => {
                      const type = getBlockType(b.type);
                      return (
                        <View
                          key={b.id}
                          style={[
                            styles.timelineSeg,
                            {
                              flex: Math.max(0.001, getBlockDuration(b)) / Math.max(1, totalSec),
                              backgroundColor: type?.color || '#FFFFFF',
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <Text style={styles.mixCurrentText} numberOfLines={1}>
                    {currentMix?.name || 'Mon mix'} · {blocks.length} bloc{blocks.length > 1 ? 's' : ''} ·{' '}
                    {hasEstimatedDuration(blocks) ? '~' : ''}
                    {formatMixClock(totalSec)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.mixCurrentText}>Aucun mix pour l'instant — crée le premier.</Text>
              )}

              <View style={styles.mixFoot}>
                <Text style={styles.mixFootText}>
                  {library.length} enregistré{library.length > 1 ? 's' : ''}
                </Text>
                <View style={styles.mixGo}>
                  <AppIcon name="play" size={14} color="#0A0A0A" />
                </View>
              </View>
            </PressTap>
          </Animated.View>

          {/* ── Historique et Planning : deux tuiles ── */}
          <View style={styles.tiles}>
            <Animated.View entering={slideInY(24, D.big, 90)} style={styles.tileWrap}>
              <HubTile
                icon="history"
                title="Mon historique"
                summary={historySummary}
                onPress={() => go('/history')}
              />
            </Animated.View>
            <Animated.View entering={slideInY(24, D.big, 170)} style={styles.tileWrap}>
              <HubTile
                icon="calendar"
                title="Mon planning"
                summary={planningSummary}
                onPress={() => go({ pathname: '/history', params: { page: 'planning' } })}
              />
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function HubTile({ icon, title, summary, onPress }) {
  return (
    <PressTap
      onPress={onPress}
      tapScale={0.97}
      accessibilityLabel={title}
      containerStyle={styles.tileContainer}
      style={styles.tile}
    >
      <View style={styles.tileIcon}>
        <AppIcon name={icon} size={26} color="#FFFFFF" />
      </View>
      <Text style={styles.tileTitle} numberOfLines={2}>
        {title}
      </Text>
      {summary == null ? (
        <SkeletonGroup style={styles.tileSkeleton}>
          <SkeletonBlock width="92%" height={11} radius={6} />
          <SkeletonBlock width="64%" height={11} radius={6} />
        </SkeletonGroup>
      ) : (
        <Text style={styles.tileSummary} numberOfLines={3}>
          {summary}
        </Text>
      )}
      <Text style={styles.tileChevron}>›</Text>
    </PressTap>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  tileSkeleton: {
    gap: 6,
    paddingTop: 4,
  },
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
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },

  // Carte MIX — overflow hidden pour que le filigrane de l'anneau soit
  // découpé aux coins arrondis.
  mixCard: {
    borderRadius: 28,
    overflow: 'hidden',
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  mixRing: {
    position: 'absolute',
    top: -60,
    right: -70,
    opacity: 0.9,
  },
  mixTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  mixBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixTag: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.6,
    color: 'rgba(255,255,255,0.78)',
  },
  // Anton : lineHeight à ×1,18 de la taille, jamais égal (piège n°19).
  mixTitle: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: 0.5,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  mixText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 10,
    maxWidth: 270,
  },
  mixCurrent: {
    marginTop: 18,
  },
  timeline: {
    flexDirection: 'row',
    height: 5,
    gap: 2,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  timelineSeg: {
    height: 5,
    borderRadius: 2,
  },
  mixCurrentText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 4,
  },
  mixFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  mixFootText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.70)',
  },
  mixGo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tuiles : deux colonnes, qui passent l'une sous l'autre si la fenêtre est
  // étroite (minWidth) plutôt que de s'écraser.
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tileWrap: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 150,
  },
  // Les deux tuiles d'une rangée ont la même hauteur, même si l'une des deux
  // résume sur plus de lignes que l'autre.
  tileContainer: {
    flex: 1,
  },
  tile: {
    flex: 1,
    minHeight: 170,
    padding: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tileIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tileTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  tileSummary: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 6,
  },
  tileChevron: {
    position: 'absolute',
    right: 16,
    bottom: 12,
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: 'rgba(255,255,255,0.45)',
  },
});
