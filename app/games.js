import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import PressTap from '../components/common/PressTap';
import AppIcon from '../components/common/AppIcon';
import { haptic } from '../hooks/useHaptic';
import { fonts } from '../lib/fonts';
import { goBackSafe } from '../lib/navigation';
import { EXERCISES, bestScore } from '../lib/gameCount';
import { loadScores } from '../lib/gameScores';
import { loadPyramidScores } from '../lib/gamePyramidScores';

/**
 * Menu › Jeux. Une carte par jeu ; d'autres arriveront (autres exercices).
 */
export default function Games() {
  const router = useRouter();
  const [scores, setScores] = useState(null);
  const [pyramidScores, setPyramidScores] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadScores().then((list) => {
        if (!cancelled) setScores(list);
      });
      loadPyramidScores().then((list) => {
        if (!cancelled) setPyramidScores(list);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const best = scores ? Math.max(0, ...Object.keys(EXERCISES).map((id) => bestScore(scores, id))) : 0;
  // Les pyramides n'ont pas de record unique (chaque format et sommet a le sien) :
  // la carte montre le plus gros total de répétitions d'une partie.
  const pyramidBest = pyramidScores ? Math.max(0, ...pyramidScores.map((s) => s.total)) : 0;

  return (
    <GradientBackground colors={['#0F4252', '#0A2A35', '#04121A']} ambient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <IconButton
            icon="back"
            halo="left"
            haptic={haptic.light}
            onPress={() => goBackSafe(router)}
            accessibilityLabel="Retour"
          />
          <Text style={styles.topTitle}>Jeux</Text>
          <View style={styles.topSpacer} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <PressTap
            onPress={() => {
              haptic.light();
              router.push('/game-count');
            }}
            tapScale={0.98}
            accessibilityLabel="Ouvrir Le chef d’orchestre"
            style={styles.card}
          >
            <View style={styles.cardIcon}>
              <AppIcon name="voice" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTag}>POIDS DU CORPS</Text>
            <Text style={styles.cardTitle}>Le chef d’orchestre</Text>
            <Text style={styles.cardText}>
              Une voix compte. Quand elle se tait, tu t’arrêtes. Quand elle reprend, tu reprends. Qui lâche
              en premier ?
            </Text>
            <Text style={styles.cardBest}>
              {scores === null ? ' ' : best > 0 ? `Ton record : ${best}` : 'Pas encore de record'}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </PressTap>

          <PressTap
            onPress={() => {
              haptic.light();
              router.push('/game-pyramid');
            }}
            tapScale={0.98}
            accessibilityLabel="Ouvrir La pyramide"
            style={[styles.card, styles.cardWarm]}
          >
            <View style={[styles.cardIcon, styles.cardIconWarm]}>
              <AppIcon name="blocks" size={26} color="#FFFFFF" />
            </View>
            <Text style={[styles.cardTag, styles.cardTagWarm]}>POIDS DU CORPS</Text>
            <Text style={styles.cardTitle}>La pyramide</Text>
            <Text style={styles.cardText}>
              Des séries qui montent, qui descendent, ou les deux. La voix compte, tu te reposes entre
              chaque. Jusqu’où iras-tu ?
            </Text>
            <Text style={styles.cardBest}>
              {pyramidScores === null
                ? ' '
                : pyramidBest > 0
                  ? `Meilleure partie : ${pyramidBest} répétitions`
                  : 'Pas encore de record'}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </PressTap>

          <Text style={styles.soon}>D’autres jeux arrivent bientôt.</Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
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
  topSpacer: { width: 44 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  card: {
    padding: 22,
    borderRadius: 28,
    backgroundColor: 'rgba(77,216,232,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(77,216,232,0.28)',
  },
  // La pyramide a sa propre teinte (orange), comme son écran de jeu.
  cardWarm: {
    backgroundColor: 'rgba(255,154,77,0.08)',
    borderColor: 'rgba(255,154,77,0.3)',
  },
  cardIconWarm: {
    backgroundColor: 'rgba(255,154,77,0.16)',
    borderColor: 'rgba(255,154,77,0.4)',
  },
  cardTagWarm: { color: '#FF9A4D' },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(77,216,232,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(77,216,232,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTag: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.6,
    color: '#4DD8E8',
  },
  cardTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    marginTop: 4,
  },
  cardText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    paddingRight: 24,
  },
  cardBest: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 14,
  },
  chevron: {
    position: 'absolute',
    right: 18,
    bottom: 14,
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: 'rgba(255,255,255,0.45)',
  },
  soon: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 6,
  },
});
