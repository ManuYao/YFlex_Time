import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { BlurTargetView } from 'expo-blur';
import Animated from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import AppIcon from '../components/common/AppIcon';
import BadgeMedal from '../components/common/BadgeMedal';
import ModeStatsSheet from '../components/common/ModeStatsSheet';
import TrophyDetailSheet from '../components/common/TrophyDetailSheet';
import { SkeletonGroup, SkeletonBlock } from '../components/common/Skeleton';
import { TrophyRing, TrophyChips, NextTrophy, FamilySection } from '../components/screens/TrophyParts';
import { useTimers } from '../contexts/TimersContext';
import { usePremium } from '../hooks/usePremium';
import { useScreenReady } from '../hooks/useScreenReady';
import { haptic } from '../hooks/useHaptic';
import { goBackSafe } from '../lib/navigation';
import { fonts } from '../lib/fonts';
import { loadHistory } from '../lib/history';
import { loadTrophyEvaluation } from '../lib/trophyLoader';
import { TROPHY_FAMILIES } from '../lib/trophyCatalog';
import { computeProfileStats } from '../lib/profileStats';

/**
 * Page « Trophées » : tous les trophées rangés par famille (Par mode, Cumul, Régularité,
 * Touche-à-tout, Exploits, Jeux, Créateur, Progression, Saisons, Secrets). Ouverte par le
 * bouton « Voir les trophées » du Profil. Tout est calculé par lib/trophies.js à partir de
 * l'historique : rien à cocher, les trophées tombent tout seuls.
 *
 * Trois formes de trophée, sur le même anneau à 60 graduations : les PALIERS (Bronze, Argent,
 * Or), les EXPLOITS (une médaille, l'icône dit ce qu'on a fait) et les SECRETS (cachés).
 * Toucher un trophée ouvre sa fiche ; les cinq modes ouvrent leur panneau de stats, comme
 * avant.
 */
export default function Trophies() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { timers } = useTimers();
  const { isPremium, loaded: premiumLoaded } = usePremium();
  const blurTargetRef = useRef(null);

  const [data, setData] = useState(null); // { evaluation, sessions, now }
  const [detail, setDetail] = useState(null); // { state, tierIndex }
  const [modeId, setModeId] = useState(null);

  const { ready, skeletonGone, contentStyle, skeletonStyle } = useScreenReady({
    dataReady: !!data,
    softReady: premiumLoaded,
  });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const sessions = await loadHistory();
        const evaluation = await loadTrophyEvaluation({ sessions });
        if (!cancelled) setData({ evaluation, sessions, now: Date.now() });
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Les trophées rangés par famille (calcul léger, seulement quand les données changent).
  const sections = useMemo(() => {
    if (!data) return [];
    return TROPHY_FAMILIES.map((family) => ({
      family,
      states: data.evaluation.list.filter((s) => s.def.family === family.id),
    })).filter((s) => s.states.length > 0);
  }, [data]);

  // Les cinq modes gardent leur panneau de stats (séances, temps, « Comment ça marche ? »).
  const modeStats = useMemo(
    () => (modeId && data ? computeProfileStats(data.sessions, timers) : null),
    [modeId, data, timers]
  );
  const modeTimer = modeId ? timers.find((t) => t.id === modeId) : null;

  const open = useCallback((state, tierIndex) => {
    if (state.def.mode) {
      setModeId(state.def.mode);
      return;
    }
    setDetail({ state, tierIndex: tierIndex ?? null });
  }, []);

  const evaluation = data?.evaluation;
  const complete = !!evaluation && evaluation.unlockedCount >= evaluation.total;

  return (
    <View style={styles.root}>
      <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill}>
        <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
          <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.topBar}>
              <IconButton icon="back" haptic={haptic.light} onPress={() => goBackSafe(router)} accessibilityLabel="Retour" />
              <View style={styles.titleWrap}>
                <AppIcon name="trophies" size={16} />
                <Text style={styles.topTitle}>Trophées</Text>
              </View>
              <View style={styles.topSpacer} />
            </View>

            <View style={styles.body}>
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={ready}
              >
                {ready && evaluation && (
                  <Animated.View style={contentStyle}>
                    <View style={styles.hero}>
                      <TrophyRing
                        size={220}
                        big
                        counts={evaluation.counts}
                        total={evaluation.total}
                        unlocked={evaluation.unlockedCount}
                      />
                      <View style={styles.chipsWrap}>
                        <TrophyChips counts={evaluation.counts} />
                      </View>
                    </View>

                    {evaluation.next && !complete ? (
                      <NextTrophy state={evaluation.next} onPress={open} />
                    ) : null}
                    {complete ? (
                      <View style={styles.completeCard}>
                        <BadgeMedal tier="or" size={64} value={evaluation.total} />
                        <View style={styles.completeText}>
                          <Text style={styles.completeKicker}>COLLECTION COMPLÈTE</Text>
                          <Text style={styles.completeTitle}>Tous les trophées sont à toi.</Text>
                          <Text style={styles.completeSub}>Les secrets aussi.</Text>
                        </View>
                      </View>
                    ) : null}

                    {sections.map(({ family, states }) => (
                      <FamilySection key={family.id} family={family} states={states} onOpen={open} now={data.now} />
                    ))}

                  </Animated.View>
                )}
              </ScrollView>

              {/* Squelette par-dessus, il s'efface en fondu puis se retire. */}
              {!skeletonGone && (
                <Animated.View style={[styles.skeletonLayer, skeletonStyle]} pointerEvents="none">
                  <SkeletonGroup style={styles.skeleton}>
                    <View style={styles.skeletonHero}>
                      <SkeletonBlock width={220} height={220} radius={110} />
                    </View>
                    <SkeletonBlock height={110} radius={18} style={styles.skeletonGap} />
                    <SkeletonBlock height={230} radius={18} style={styles.skeletonGap} />
                    <SkeletonBlock height={230} radius={18} style={styles.skeletonGap} />
                  </SkeletonGroup>
                </Animated.View>
              )}
            </View>
          </View>
        </GradientBackground>
      </BlurTargetView>

      {/* Feuilles hors SafeAreaView : elles ajoutent elles-mêmes la zone sûre du bas. */}
      {detail && (
        <TrophyDetailSheet
          screenH={screenH}
          state={detail.state}
          tierIndex={detail.tierIndex}
          isPremium={isPremium}
          onClose={() => setDetail(null)}
        />
      )}
      {modeTimer && modeStats && (
        <ModeStatsSheet
          timer={modeTimer}
          stats={{
            count: modeStats.badgeCounts?.[modeTimer.id] ?? 0,
            totalSeconds: modeStats.modeSeconds?.[modeTimer.id] ?? 0,
            timeLabel: modeStats.modeTimeLabels?.[modeTimer.id] ?? '0min',
          }}
          screenH={screenH}
          blurTargetRef={blurTargetRef}
          onClose={() => setModeId(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  // Même largeur que le bouton retour : le titre reste centré.
  topSpacer: { width: 44 },
  body: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },

  hero: { alignItems: 'center', paddingTop: 4, marginBottom: 20 },
  chipsWrap: { marginTop: 16 },

  completeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginBottom: 28,
    borderRadius: 18,
    backgroundColor: 'rgba(247,215,120,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(247,215,120,0.35)',
  },
  completeText: { flex: 1, minWidth: 0 },
  completeKicker: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 1.6, color: '#F7D778' },
  completeTitle: { fontFamily: fonts.sansExtraBold, fontSize: 16, color: '#FFFFFF', marginTop: 3 },
  completeSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },

  footnote: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    paddingHorizontal: 12,
    marginTop: 8,
  },

  skeletonLayer: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  skeleton: { paddingHorizontal: 20 },
  skeletonHero: { alignItems: 'center', paddingTop: 4 },
  skeletonGap: { marginTop: 16 },
});
