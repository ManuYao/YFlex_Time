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
import { useTimers } from '../contexts/TimersContext';
import { usePremium } from '../hooks/usePremium';
import { useScreenReady } from '../hooks/useScreenReady';
import { haptic } from '../hooks/useHaptic';
import { goBackSafe } from '../lib/navigation';
import { fonts } from '../lib/fonts';
import { GOLD } from '../lib/buttonTokens';
import { computeProfileStats } from '../lib/profileStats';
import { loadHistory } from '../lib/history';

/**
 * Page « Analyse avancée » : les statistiques détaillées (temps sous tension,
 * formats, temps par format, comparatif mensuel, rythme), ouverte par « Voir
 * plus » dans le Profil. Réservée à Premium, comme l'aperçu du Profil : sans
 * Premium la page n'affiche que l'invitation (le Profil n'y mène pas non plus).
 */
export default function Analysis() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { timers } = useTimers();
  const { isPremium, loaded: premiumLoaded } = usePremium();

  const [sessions, setSessions] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const { ready, skeletonGone, contentStyle, skeletonStyle } = useScreenReady({
    dataReady: dataLoaded,
    softReady: premiumLoaded,
  });

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        const hist = await loadHistory();
        if (cancelled) return;
        setSessions(hist);
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
                <Animated.View style={contentStyle}>
                  {isPremium ? (
                    stats.hasData ? (
                      <AdvancedCards stats={stats} />
                    ) : (
                      <Text style={styles.empty}>
                        Dès ta première séance, ces analyses se remplissent toutes seules.
                      </Text>
                    )
                  ) : (
                    <View style={styles.locked}>
                      <Text style={styles.lockedText}>
                        L’analyse avancée fait partie de Premium : temps sous tension, formats, comparatif mensuel…
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
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
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
