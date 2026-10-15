import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SkeletonGroup, SkeletonBlock } from '../common/Skeleton';
import { ROUND_SIZE } from '../../lib/buttonTokens';

/**
 * Squelette du constructeur MIX : barre du haut, titre et durée, frise des
 * blocs, quelques lignes de blocs et la barre d'actions du bas, aux mêmes
 * marges que le vrai écran. Montré pendant que le constructeur (liste
 * déplaçable, feuilles) se monte, pour que l'ouverture d'un aperçu ne fige
 * plus l'écran sur du vide.
 */
export default function MixBuilderSkeleton() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SkeletonGroup style={styles.flex}>
        <View style={styles.topBar}>
          <SkeletonBlock width={ROUND_SIZE.nav} height={ROUND_SIZE.nav} radius={ROUND_SIZE.nav / 2} />
          <SkeletonBlock width={120} height={12} radius={6} />
          <SkeletonBlock width={ROUND_SIZE.nav} height={ROUND_SIZE.nav} radius={ROUND_SIZE.nav / 2} />
        </View>

        <View style={styles.body}>
          <View style={styles.hero}>
            <View style={styles.heroLeft}>
              <SkeletonBlock width={60} height={10} radius={5} />
              <SkeletonBlock width="70%" height={26} radius={8} />
              <SkeletonBlock width={90} height={11} radius={5} />
            </View>
            <View style={styles.heroRight}>
              <SkeletonBlock width={70} height={10} radius={5} />
              <SkeletonBlock width={96} height={30} radius={8} />
            </View>
          </View>

          <SkeletonBlock height={8} radius={4} style={styles.timeline} />

          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonBlock key={i} height={76} radius={20} style={styles.row} />
          ))}
        </View>

        <View style={styles.bottom}>
          <SkeletonBlock height={56} radius={28} />
        </View>
      </SkeletonGroup>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 12,
  },
  heroLeft: { flex: 1, gap: 10 },
  heroRight: { alignItems: 'flex-end', gap: 10 },
  timeline: { marginBottom: 24 },
  row: { marginBottom: 10 },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
});
