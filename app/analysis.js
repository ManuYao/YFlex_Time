import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import Button from '../components/common/Button';
import AppIcon from '../components/common/AppIcon';
import { SkeletonGroup, SkeletonBlock } from '../components/common/Skeleton';
import { AdvancedCards } from '../components/screens/ProfileAnalytics';
import GameStatsCards from '../components/screens/GameStatsCards';
import FoldGroup from '../components/common/FoldGroup';
import { useTimers } from '../contexts/TimersContext';
import { usePremium } from '../hooks/usePremium';
import { useScreenReady } from '../hooks/useScreenReady';
import { haptic } from '../hooks/useHaptic';
import { goBackSafe } from '../lib/navigation';
import { fonts } from '../lib/fonts';
import { GOLD } from '../lib/buttonTokens';
import { computeProfileStats } from '../lib/profileStats';
import { loadHistory } from '../lib/history';
import { computeGameStats } from '../lib/gameStats';
import { loadScores } from '../lib/gameScores';
import { loadPyramidScores } from '../lib/gamePyramidScores';
import { loadComboScores } from '../lib/gameComboStore';

// Couleur du grand groupe « Tes jeux » : celle du chef d'orchestre, le premier jeu.
const GAMES_ACCENT = '#4DD8E8';

// Dernière valeur d'une série comparée à la meilleure (0 à 1) : la période en cours
// face à ton meilleur résultat. Sert seulement à remplir l'anneau décoratif.
function ratioToBest(series) {
  const best = Math.max(0, ...series);
  if (best <= 0) return 0;
  return Math.min(1, series[series.length - 1] / best);
}

/**
 * Page « Analyse avancée » : les statistiques détaillées rangées en deux grands
 * groupes pliés au départ (« Tes séances » : temps, formats, régularité ; « Tes
 * jeux »), chacun contenant de petits groupes qui se déplient à leur tour. Ouverte
 * par « Voir plus » dans le Profil. Réservée à Premium, comme l'aperçu du
 * Profil : sans Premium la page n'affiche que l'invitation (le Profil n'y mène pas
 * non plus). Les jeux gardent leurs propres scores, visibles par tout le monde
 * dans leur écran : seule l'analyse d'ensemble est ici.
 */
export default function Analysis() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { timers } = useTimers();
  const { isPremium, loaded: premiumLoaded } = usePremium();

  const [sessions, setSessions] = useState([]);
  const [gameLists, setGameLists] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const { ready, skeletonGone, contentStyle, skeletonStyle } = useScreenReady({
    dataReady: dataLoaded,
    softReady: premiumLoaded,
  });

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        const [hist, count, pyramid, combo] = await Promise.all([
          loadHistory(),
          loadScores(),
          loadPyramidScores(),
          loadComboScores(),
        ]);
        if (cancelled) return;
        setSessions(hist);
        setGameLists({ count, pyramid, combo });
        setDataLoaded(true);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Ce calcul parcourt tout l'historique : seulement une fois l'écran prêt.
  const stats = useMemo(
    () => computeProfileStats(ready && isPremium ? sessions : [], timers),
    [ready, isPremium, sessions, timers]
  );
  const gameStats = useMemo(
    () => computeGameStats(ready && isPremium && gameLists ? gameLists : {}),
    [ready, isPremium, gameLists]
  );
  // Ce que montrent les grandes cartes PLIÉES (FoldGroup) : le chiffre clé, un petit
  // graphique, trois repères. Le total de séances est le même que celui de la carte
  // « Répartition des formats » : un seul chiffre partout. L'anneau en filigrane
  // compare la période en cours à la meilleure des dernières.
  const sessionsHero = useMemo(() => {
    if (!stats.hasData) return null;
    const monthly = stats.monthlyCounts;
    return {
      value: String(stats.formatBreakdown.reduce((s, f) => s + f.count, 0)),
      label: 'SÉANCES',
      ring: ratioToBest(monthly),
      bars: monthly,
      tiles: [
        { label: 'TEMPS TOTAL', value: stats.timeLabel },
        { label: 'SOUS TENSION', value: stats.tension.label },
        { label: 'RECORD STREAK', value: `${stats.bestStreak} j` },
      ],
    };
  }, [stats]);
  const gamesHero = useMemo(() => {
    if (!gameStats.hasData) return null;
    return {
      value: String(gameStats.plays),
      label: gameStats.plays > 1 ? 'PARTIES' : 'PARTIE',
      dots: gameStats.games.map((g) => g.color),
      ring: ratioToBest(gameStats.weeklyPlays),
      bars: gameStats.weeklyPlays,
      tiles: [
        { label: 'RÉPÉTITIONS', value: String(gameStats.totalReps) },
        { label: 'RECORDS', value: String(gameStats.recordsBroken) },
        { label: 'JOURS DE JEU', value: String(gameStats.activeDays) },
      ],
    };
  }, [gameStats]);

  return (
    <View style={styles.root}>
      <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
        <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.topBar}>
            <IconButton icon="back" haptic={haptic.light} onPress={() => goBackSafe(router)} accessibilityLabel="Retour" />
            <View style={styles.titleWrap}>
              <AppIcon name="crown" size={13} color={GOLD} />
              <Text style={styles.topTitle}>Analyse avancée</Text>
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
              {ready && (
                <Animated.View style={[styles.fill, contentStyle]}>
                  {isPremium ? (
                    <>
                      {stats.hasData || gameStats.hasData ? (
                        <View style={styles.groups}>
                          {stats.hasData ? (
                            <FoldGroup
                              icon="sessions"
                              title="Tes séances"
                              subtitle="Temps, formats et régularité"
                              accent={GOLD}
                              hero={sessionsHero}
                            >
                              <AdvancedCards stats={stats} />
                            </FoldGroup>
                          ) : null}
                          {gameStats.hasData ? (
                            <FoldGroup
                              icon="puzzle"
                              title="Tes jeux"
                              subtitle="Parties, records et progression"
                              accent={GAMES_ACCENT}
                              hero={gamesHero}
                            >
                              <GameStatsCards stats={gameStats} />
                            </FoldGroup>
                          ) : null}
                        </View>
                      ) : (
                        <Text style={styles.empty}>
                          Dès ta première séance ou ta première partie, ces analyses se remplissent toutes seules.
                        </Text>
                      )}
                    </>
                  ) : (
                    <View style={styles.locked}>
                      <Text style={styles.lockedText}>
                        L’analyse avancée fait partie de Premium : temps sous tension, formats, comparatif mensuel, stats de tes jeux…
                      </Text>
                      <Button
                        variant="premium"
                        icon="crown"
                        label="Voir Premium"
                        haptic={haptic.medium}
                        onPress={() => router.replace('/premium')}
                      />
                    </View>
                  )}
                </Animated.View>
              )}
            </ScrollView>

            {/* Squelette par-dessus, il s'efface en fondu puis se retire. */}
            {!skeletonGone && (
              <Animated.View style={[styles.skeletonLayer, skeletonStyle]} pointerEvents="none">
                <SkeletonGroup style={styles.skeleton}>
                  <SkeletonBlock height={150} radius={18} />
                  <SkeletonBlock height={190} radius={18} style={styles.skeletonGap} />
                  <SkeletonBlock height={190} radius={18} style={styles.skeletonGap} />
                  <SkeletonBlock height={220} radius={18} style={styles.skeletonGap} />
                </SkeletonGroup>
              </Animated.View>
            )}
          </View>
        </View>
      </GradientBackground>
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
  // flexGrow : le contenu s'étire sur toute la page, pour que les grandes cartes
  // pliées se la partagent au lieu de laisser un grand vide sous elles.
  listContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  fill: { flexGrow: 1 },
  groups: { flexGrow: 1, gap: 14 },
  skeletonLayer: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  skeleton: { paddingHorizontal: 20 },
  skeletonGap: { marginTop: 10 },
  empty: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    paddingVertical: 40,
  },
  locked: { alignItems: 'center', gap: 18, paddingVertical: 40 },
  lockedText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
});
