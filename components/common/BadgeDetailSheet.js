import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BottomSheet from './BottomSheet';
import Button from './Button';
import BadgeMedal, { TIER_PALETTE } from './BadgeMedal';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

/**
 * Fiche d'un palier, ouverte en tapant sa médaille dans ModeStatsSheet.
 *
 * Elle porte déjà la zone « Récompenses », vide pour l'instant : les
 * déblocages (sons, thèmes) sont prévus mais rien ne les implémente encore
 * (voir MONÉTISATION). L'état vide annonce qu'il y aura quelque chose sans
 * promettre quoi — mieux vaut une place réservée qu'une liste inventée que
 * l'app ne saurait pas tenir.
 */
export default function BadgeDetailSheet({ screenH, timer, tier, sessionCount, onClose }) {
  const palette = TIER_PALETTE[tier.key] || TIER_PALETTE.bronze;
  const remaining = Math.max(0, tier.threshold - sessionCount);
  const pct = Math.round((tier.progress ?? 0) * 100);

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={140}>
      {({ close }) => (
        <>
          <View style={styles.head}>
            <BadgeMedal
              tier={tier.key}
              size={86}
              locked={!tier.unlocked}
              progress={tier.progress}
              value={tier.threshold}
            />
            <View style={styles.headText}>
              <Text style={[styles.tier, { color: tier.unlocked ? palette.hi : 'rgba(255,255,255,0.75)' }]}>
                {tier.label}
              </Text>
              <View style={styles.modeRow}>
                <View style={[styles.dot, { backgroundColor: timer.color }]} />
                <Text style={styles.mode}>{timer.name}</Text>
              </View>
              <Text style={styles.status}>
                {tier.unlocked
                  ? 'Débloqué'
                  : `Plus que ${remaining} séance${remaining > 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressHead}>
              <Text style={styles.progressLabel}>
                {tier.unlocked ? 'OBJECTIF ATTEINT' : 'PROGRESSION'}
              </Text>
              <Text style={[styles.progressCount, { color: palette.hi }]}>
                {Math.min(sessionCount, tier.threshold)} / {tier.threshold}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[styles.fill, { width: `${pct}%`, backgroundColor: palette.hi }]}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>RÉCOMPENSES</Text>
          <View style={styles.rewardBox}>
            <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
              <Path
                d="M3 7h14v10H3zM3 7l2-4h10l2 4M10 3v14"
                stroke="rgba(255,255,255,0.32)"
                strokeWidth={1.4}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </Svg>
            <Text style={styles.rewardText}>
              Bientôt : des sons et des thèmes à débloquer avec tes trophées.
            </Text>
          </View>

          <Button
            variant="glass"
            fullWidth
            label="Fermer"
            onPress={() => {
              haptic.light();
              close();
            }}
          />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
    marginBottom: 22,
  },
  headText: { flex: 1, minWidth: 0 },
  tier: {
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: 1,
    includeFontPadding: false,
  },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  mode: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#FFFFFF',
  },
  status: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 5,
  },

  progressBlock: { marginBottom: 24 },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.45)',
  },
  progressCount: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },

  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 8,
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  rewardText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.58)',
  },

});
