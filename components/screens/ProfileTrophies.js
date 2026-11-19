import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Button from '../common/Button';
import { TrophyRing, TrophyChips, NextTrophy, RecentTrophies } from './TrophyParts';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

/**
 * Section « Trophées » du Profil : un résumé (anneau, décompte, « le prochain », « derniers
 * gagnés ») et le bouton qui ouvre la page de tous les trophées. Le détail de chaque trophée
 * vit sur cette page (app/trophies.js) : le Profil reste léger.
 *
 * `evaluation` vient de lib/trophyLoader.js ; null tant qu'elle n'est pas lue.
 */
export default function ProfileTrophies({ evaluation, onOpenAll, onOpenTrophy }) {
  if (!evaluation) return null;
  const { counts, total, unlockedCount, next } = evaluation;
  const now = Date.now();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Trophées</Text>
      <Text style={styles.sectionHint}>Ils tombent tout seuls, au fil de tes séances.</Text>
      <View style={styles.card}>
        <View style={styles.head}>
          <TrophyRing size={84} counts={counts} total={total} unlocked={unlockedCount} />
          <View style={styles.headText}>
            <Text style={styles.headTitle}>Trophées débloqués</Text>
            <Text style={styles.headSub}>
              {unlockedCount} sur {total} au total
            </Text>
            <View style={styles.chipsWrap}>
              <TrophyChips counts={counts} compact />
            </View>
          </View>
        </View>

        {next ? <NextTrophy state={next} compact onPress={onOpenTrophy} /> : null}

        {evaluation.recent.length > 0 ? (
          <View style={styles.recent}>
            <Text style={styles.recentLabel}>DERNIERS GAGNÉS</Text>
            <RecentTrophies evaluation={evaluation} count={4} onPress={onOpenTrophy} now={now} />
          </View>
        ) : null}

        <View style={styles.cta}>
          <Button
            variant="glass"
            size="md"
            fullWidth
            icon="arrow"
            iconPosition="right"
            label={`Voir les ${total} trophées`}
            haptic={haptic.light}
            onPress={onOpenAll}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  headText: { flex: 1, minWidth: 0 },
  headTitle: { fontFamily: fonts.sansExtraBold, fontSize: 15, lineHeight: 19, color: '#FFFFFF' },
  headSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  chipsWrap: { marginTop: 8 },
  recent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  recentLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 10,
  },
  cta: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
});
