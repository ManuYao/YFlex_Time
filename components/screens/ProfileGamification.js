import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView, BlurTargetView } from 'expo-blur';

import PressTap from '../common/PressTap';
import AppIcon from '../common/AppIcon';
import Button from '../common/Button';
import BadgeMedal, { TIER_PALETTE } from '../common/BadgeMedal';
import { TIMERS } from '../../lib/timers-config';
import { BADGE_TIERS, getBadgeProgress } from '../../lib/badges';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { MOCK_BADGE_COUNTS, MOCK_CUSTOMIZATION } from '../../lib/profileMock';

const MEDAL_SIZE = 38;

// Maquette : les compteurs viennent de lib/profileMock.js, mais les paliers
// sont calculés par le vrai getBadgeProgress, comme dans ModeStatsSheet.
const ROWS = TIMERS.map((timer) => {
  const count = MOCK_BADGE_COUNTS[timer.id] ?? 0;
  return { timer, count, badges: getBadgeProgress(timer.id, count) };
});

function rowCaption({ count, badges }) {
  const next = badges.nextTier;
  if (!next) return 'TOUT OBTENU';
  return `${count} / ${next.threshold} · ${next.label}`;
}

export default function ProfileGamification({ onOpenModeStats, onShareSession }) {
  const customTargetRef = useRef(null);
  const unlocked = ROWS.reduce((n, r) => n + r.badges.tiers.filter((t) => t.unlocked).length, 0);
  const total = ROWS.reduce((n, r) => n + r.badges.tiers.length, 0);
  const perTier = BADGE_TIERS.map((tier) => ({
    key: tier.key,
    count: ROWS.filter((r) => r.badges.tiers.find((t) => t.key === tier.key)?.unlocked).length,
  }));

  return (
    <View>
      {/* ─── TROPHÉES ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trophées</Text>
        <View style={styles.card}>
          <View style={styles.summary}>
            <AppIcon name="trophies" size={22} />
            <View style={styles.summaryText}>
              <Text style={styles.summaryValue}>
                {unlocked}
                <Text style={styles.summaryTotal}> / {total}</Text>
              </Text>
              <Text style={styles.summaryLabel}>débloqués</Text>
            </View>
            <View style={styles.tierCounts}>
              {perTier.map((t) => (
                <View key={t.key} style={styles.tierCount}>
                  <View style={[styles.tierDot, { backgroundColor: TIER_PALETTE[t.key].hi }]} />
                  <Text style={styles.tierCountText}>{t.count}</Text>
                </View>
              ))}
            </View>
          </View>

          {ROWS.map((row, i) => {
            const { timer, badges } = row;
            const done = !badges.nextTier;
            return (
              <PressTap
                key={timer.id}
                tapScale={0.98}
                onHapticIn={haptic.light}
                onPress={() => onOpenModeStats?.(timer.id)}
                accessibilityLabel={`Trophées ${timer.name}`}
                style={[styles.row, i > 0 && styles.rowDivider]}
              >
                <View style={[styles.dial, { backgroundColor: `${timer.color}26` }]}>
                  <AppIcon name={timer.id} size={20} color={timer.color} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {timer.name}
                  </Text>
                  <Text
                    style={[styles.rowCaption, done && { color: TIER_PALETTE.or.hi }]}
                    numberOfLines={1}
                  >
                    {rowCaption(row)}
                  </Text>
                </View>
                <View style={styles.medals}>
                  {badges.tiers.map((tier) => (
                    <BadgeMedal
                      key={tier.key}
                      tier={tier.key}
                      size={MEDAL_SIZE}
                      locked={!tier.unlocked}
                      progress={tier.progress}
                      value={tier.threshold}
                    />
                  ))}
                </View>
                <AppIcon name="arrow" size={12} opacity={0.3} style={styles.chevron} />
              </PressTap>
            );
          })}
        </View>
      </View>

      {/* ─── PERSONNALISATION ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personnalisation</Text>
        <Text style={styles.sectionHint}>Des thèmes et des sons à débloquer avec tes trophées.</Text>
        {/* Contenu gardé mais flouté à fond (décision utilisateur) : on ne doit
            pas deviner ce qu'il y a dedans, mais le jour où on retire le flou,
            tout est déjà là. Le BlurView est frère de sa cible, jamais dedans. */}
        <View style={styles.blurZone}>
        <BlurTargetView ref={customTargetRef} style={styles.grid}>
          {MOCK_CUSTOMIZATION.map((item) => (
            <View key={item.id} style={[styles.card, styles.tile]}>
              <View style={styles.tileTop}>
                <View style={styles.tileIcon}>
                  <AppIcon name={item.icon} size={18} opacity={0.75} />
                </View>
                <AppIcon name="lock" size={14} opacity={0.45} />
              </View>
              <Text style={styles.tileKind}>{item.kind}</Text>
              <Text style={styles.tileLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <View style={styles.tileBottom}>
                <LinearGradient
                  colors={item.colors}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.swatch}
                />
                <View style={styles.soonChip}>
                  <Text style={styles.soonText}>BIENTÔT</Text>
                </View>
              </View>
            </View>
          ))}
        </BlurTargetView>
          <BlurView
            blurTarget={customTargetRef}
            intensity={100}
            tint="dark"
            blurMethod="dimezisBlurView"
            blurReductionFactor={4}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Voile en plus du flou : sous Android 12, expo-blur ne floute pas
              et retombe sur une simple teinte, le contenu resterait lisible. */}
          <View style={[StyleSheet.absoluteFill, styles.blurVeil]} pointerEvents="none" />
          <View style={[StyleSheet.absoluteFill, styles.blurCenter]} pointerEvents="none">
            <View style={styles.soonBadge}>
              <AppIcon name="lock" size={14} opacity={0.9} />
              <Text style={styles.soonBadgeText}>BIENTÔT</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Button
          variant="spectrum"
          size="lg"
          icon="share"
          label="Partager ma séance"
          haptic={haptic.medium}
          onPress={onShareSession}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
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
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  summaryText: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 10,
    flexShrink: 1,
  },
  summaryValue: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 29,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  summaryTotal: {
    color: 'rgba(255,255,255,0.40)',
  },
  summaryLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
    marginLeft: 8,
  },
  tierCounts: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 10,
  },
  tierCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  tierCountText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.80)',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  dial: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flexGrow: 1,
    flexShrink: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  rowName: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  rowCaption: {
    fontFamily: fonts.monoRegular,
    fontSize: 9.5,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
  },
  medals: {
    flexDirection: 'row',
    gap: 3,
  },
  chevron: {
    marginLeft: 6,
  },

  blurZone: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  blurVeil: {
    backgroundColor: 'rgba(10,10,10,0.35)',
  },
  blurCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  soonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  soonBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 2,
    color: '#FFFFFF',
  },
  // Largeur en pourcentage plutôt que flex : deux colonnes stables quelle que
  // soit la longueur des libellés.
  tile: {
    width: '48.5%',
    padding: 14,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileKind: {
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 14,
  },
  tileLabel: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 2,
  },
  tileBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  swatch: {
    width: 36,
    height: 14,
    borderRadius: 7,
  },
  soonChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  soonText: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.75)',
  },
});
