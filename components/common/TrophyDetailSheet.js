import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BottomSheet from './BottomSheet';
import Button from './Button';
import AppIcon from './AppIcon';
import { TIER_PALETTE } from './BadgeMedal';
import { TrophyStateMedal } from './TrophyMedal';
import { fonts } from '../../lib/fonts';
import { GOLD } from '../../lib/buttonTokens';
import { haptic } from '../../hooks/useHaptic';
import { formatDuration, formatMonths, formatProgress, formatRemaining } from '../../lib/trophyCatalog';
import { formatShortDate } from '../../lib/trophies';

const WHITE = '#FFFFFF';

// Le but d'un palier en quelques caractères (« 2 h », « 10 », « 3 mois »).
const thresholdText = (def, threshold) =>
  def.unit === 'time' ? formatDuration(threshold) : def.unit === 'months' ? formatMonths(threshold) : String(threshold);

/**
 * Fiche d'un trophée (page Trophées, touche sur une médaille) : ce qu'il demande, où on en
 * est, et — pour un trophée à paliers — les trois paliers côte à côte. `state` vient de
 * lib/trophies.js ; `tierIndex` = le palier sur lequel on a appuyé (sinon le prochain).
 *
 * La zone « Récompenses » est volontairement un état vide : les déblocages (sons, thèmes) sont
 * prévus mais rien ne les implémente encore. Mieux vaut une place réservée qu'une liste
 * inventée que l'app ne saurait pas tenir.
 */
export default function TrophyDetailSheet({ screenH, state, tierIndex = null, isPremium = false, onClose }) {
  const def = state.def;
  const isTier = state.kind === 'tier';
  const hidden = state.kind === 'secret' && !state.unlocked;
  const now = Date.now();

  let focus = 0;
  if (isTier) {
    focus = tierIndex != null ? tierIndex : state.nextTier ? state.tiers.indexOf(state.nextTier) : state.tiers.length - 1;
    focus = Math.max(0, Math.min(state.tiers.length - 1, focus));
  }
  const tier = isTier ? state.tiers[focus] : null;
  const palette = isTier ? TIER_PALETTE[tier.key] : null;

  const colors = def.colors || [WHITE];
  const main = isTier ? palette.hi : colors.length > 1 ? WHITE : colors[0];

  // En-tête : le nom et l'état en une phrase.
  let headTitle;
  let headSub;
  let headStatus;
  if (isTier) {
    headTitle = tier.label;
    headSub = def.name;
    headStatus = tier.unlocked
      ? `Obtenu${tier.at ? ` · ${formatShortDate(tier.at, now)}` : ''}`
      : formatRemaining(def, tier.threshold - state.value);
  } else {
    headTitle = hidden ? '???' : def.name.toUpperCase();
    headSub = hidden ? 'Trophée secret' : def.desc;
    headStatus = state.unlocked
      ? `Obtenu${state.at ? ` · ${formatShortDate(state.at, now)}` : ''}`
      : state.hasProgress
        ? `${state.value} / ${state.target}`
        : hidden
          ? 'À trouver'
          : 'À faire';
  }

  const paragraph = hidden
    ? 'Un trophée secret : aucun indice. Il se dévoile tout seul quand tu le trouves.'
    : def.detail;

  // Barre de progression : un palier, ou un exploit qui avance.
  const showBar = isTier || (state.hasProgress && !state.unlocked);
  const barPct = Math.round((isTier ? tier.progress : state.progress) * 100);
  const barCount = isTier
    ? formatProgress(def, Math.min(state.value, tier.threshold), tier.threshold)
    : `${state.value} / ${state.target}`;
  const barLabel = isTier && tier.unlocked ? 'OBJECTIF ATTEINT' : 'PROGRESSION';

  const premiumNote = !!def.premium && !isPremium && !state.unlocked;

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={140}>
      {({ close }) => (
        <>
          <ScrollView
            style={{ maxHeight: Math.round(screenH * 0.74) }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={styles.head}>
              <TrophyStateMedal state={state} tierIndex={focus} size={86} />
              <View style={styles.headText}>
                <Text
                  style={[styles.headTitle, { color: isTier ? (tier.unlocked ? main : 'rgba(255,255,255,0.75)') : state.unlocked ? main : 'rgba(255,255,255,0.75)' }]}
                  numberOfLines={2}
                >
                  {headTitle}
                </Text>
                {isTier ? (
                  <View style={styles.modeRow}>
                    <View style={[styles.dot, { backgroundColor: def.color || WHITE }]} />
                    <Text style={styles.mode} numberOfLines={1}>{headSub.toUpperCase()}</Text>
                  </View>
                ) : (
                  <Text style={styles.sub} numberOfLines={2}>{headSub}</Text>
                )}
                <Text style={styles.status}>{headStatus}</Text>
              </View>
            </View>

            <Text style={styles.paragraph}>{paragraph}</Text>

            {premiumNote ? (
              <View style={styles.premiumRow}>
                <AppIcon name="crown" size={16} color={GOLD} />
                <Text style={styles.premiumText}>Ce trophée passe par une fonction Premium : le conseil de charge.</Text>
              </View>
            ) : null}

            {showBar ? (
              <View style={styles.progressBlock}>
                <View style={styles.progressHead}>
                  <Text style={styles.progressLabel}>{barLabel}</Text>
                  <Text style={[styles.progressCount, { color: main }]}>{barCount}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${barPct}%`, backgroundColor: main }]} />
                </View>
              </View>
            ) : null}

            {isTier ? (
              <>
                <Text style={styles.sectionLabel}>LES 3 PALIERS</Text>
                <View style={styles.tiersRow}>
                  {state.tiers.map((t, i) => {
                    const p = TIER_PALETTE[t.key];
                    const current = i === focus;
                    const firstLocked = state.nextTier === t;
                    const status = t.unlocked
                      ? `OBTENU${t.at ? ` · ${formatShortDate(t.at, now)}` : ''}`
                      : firstLocked
                        ? `EN COURS · ${Math.round(t.progress * 100)} %`
                        : 'À VENIR';
                    return (
                      <View
                        key={t.key}
                        style={[
                          styles.tierCard,
                          current && { backgroundColor: `${p.hi}12`, borderColor: `${p.hi}59` },
                        ]}
                      >
                        <TrophyStateMedal state={state} tierIndex={i} size={52} />
                        <Text style={[styles.tierName, { color: p.hi }]}>{t.label}</Text>
                        <Text style={styles.tierGoal}>{thresholdText(def, t.threshold)}</Text>
                        <Text
                          style={[styles.tierStatus, t.unlocked && { color: p.hi }]}
                          numberOfLines={2}
                        >
                          {status}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}

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
          </ScrollView>

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
    marginBottom: 16,
  },
  headText: { flex: 1, minWidth: 0 },
  headTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: 1,
    includeFontPadding: false,
  },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  mode: {
    flexShrink: 1,
    fontFamily: fonts.sansExtraBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#FFFFFF',
  },
  sub: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
  },
  status: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 5,
  },

  paragraph: {
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 18,
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(240,201,84,0.35)',
    backgroundColor: 'rgba(240,201,84,0.08)',
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  premiumText: {
    flex: 1,
    fontFamily: fonts.sansSemibold,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.8)',
  },

  progressBlock: { marginBottom: 22 },
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
  tiersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  tierCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tierName: {
    fontFamily: fonts.display,
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: 0.8,
    marginTop: 6,
    includeFontPadding: false,
  },
  tierGoal: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  tierStatus: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 4,
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
    marginBottom: 20,
  },
  rewardText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.58)',
  },
});
