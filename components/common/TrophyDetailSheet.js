import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import AppIcon from './AppIcon';
import { TIER_PALETTE } from './BadgeMedal';
import { TrophyStateMedal } from './TrophyMedal';
import { fonts } from '../../lib/fonts';
import { GOLD } from '../../lib/buttonTokens';
import { haptic } from '../../hooks/useHaptic';
import { formatDuration, formatLeft, formatMonths, formatProgress } from '../../lib/trophyCatalog';

const WHITE = '#FFFFFF';

// Le but d'un palier en quelques caractères (« 2 h », « 10 », « 3 mois »).
const thresholdText = (def, threshold) =>
  def.unit === 'time' ? formatDuration(threshold) : def.unit === 'months' ? formatMonths(threshold) : String(threshold);

/**
 * Fiche d'un trophée (toucher une médaille). Volontairement courte : la médaille, le nom, où on en
 * est en UNE ligne, la barre, et pour un trophée à paliers les trois paliers côte à côte.
 * `state` vient de lib/trophies.js ; `tierIndex` = le palier touché (sinon le prochain).
 */
export default function TrophyDetailSheet({ screenH, state, tierIndex = null, isPremium = false, onClose }) {
  const def = state.def;
  const isTier = state.kind === 'tier';
  const hidden = state.kind === 'secret' && !state.unlocked;

  let focus = 0;
  if (isTier) {
    focus = tierIndex != null ? tierIndex : state.nextTier ? state.tiers.indexOf(state.nextTier) : state.tiers.length - 1;
    focus = Math.max(0, Math.min(state.tiers.length - 1, focus));
  }
  const tier = isTier ? state.tiers[focus] : null;

  const colors = def.colors || [WHITE];
  const main = isTier ? TIER_PALETTE[tier.key].hi : colors.length > 1 ? WHITE : colors[0];
  const done = isTier ? tier.unlocked : state.unlocked;

  // Titre, sous-titre, et la ligne d'état (une seule).
  const title = isTier ? tier.label : hidden ? '???' : def.name.toUpperCase();
  const subtitle = isTier ? def.name : hidden ? 'Trophée secret' : def.desc;
  let status = '';
  if (done) status = 'Obtenu';
  else if (isTier) status = formatLeft(def, tier.threshold - state.value);
  else if (state.hasProgress && state.value > 0) status = `${state.value} sur ${state.target}`;
  else if (hidden) status = 'Aucun indice';

  // Un texte d'explication seulement pour un trophée à paliers (ce qui est compté) : pour un exploit,
  // la description sous le nom suffit.
  const paragraph = isTier ? def.detail : null;

  const showBar = isTier || (state.hasProgress && !state.unlocked);
  const barPct = Math.round((isTier ? tier.progress : state.progress) * 100);
  const barCount = isTier
    ? formatProgress(def, Math.min(state.value, tier.threshold), tier.threshold)
    : `${state.value} sur ${state.target}`;

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
                <Text style={[styles.headTitle, { color: done ? main : 'rgba(255,255,255,0.75)' }]} numberOfLines={2}>
                  {title}
                </Text>
                <Text style={styles.sub} numberOfLines={2}>
                  {subtitle}
                </Text>
                {status ? <Text style={[styles.status, done && { color: main }]}>{status}</Text> : null}
              </View>
            </View>

            {paragraph ? <Text style={styles.paragraph}>{paragraph}</Text> : null}

            {premiumNote ? (
              <View style={styles.premiumRow}>
                <AppIcon name="crown" size={16} color={GOLD} />
                <Text style={styles.premiumText}>Passe par le conseil de charge, une fonction Premium.</Text>
              </View>
            ) : null}

            {showBar ? (
              <View style={styles.progressBlock}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${barPct}%`, backgroundColor: main }]} />
                </View>
                <Text style={[styles.progressCount, { color: main }]}>{barCount}</Text>
              </View>
            ) : null}

            {isTier ? (
              <View style={styles.tiersRow}>
                {state.tiers.map((t, i) => {
                  const p = TIER_PALETTE[t.key];
                  return (
                    <View
                      key={t.key}
                      style={[styles.tierCard, i === focus && { backgroundColor: `${p.hi}12`, borderColor: `${p.hi}59` }]}
                    >
                      <TrophyStateMedal state={state} tierIndex={i} size={52} />
                      <Text style={[styles.tierName, { color: p.hi }]}>{t.label}</Text>
                      <Text style={styles.tierGoal}>{thresholdText(def, t.threshold)}</Text>
                      <Text style={[styles.tierStatus, t.unlocked && { color: p.hi }]} numberOfLines={1}>
                        {t.unlocked ? 'OBTENU' : `${Math.round(t.progress * 100)} %`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
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
  sub: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },
  status: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 5,
  },

  paragraph: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
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
    marginBottom: 16,
  },
  premiumText: {
    flex: 1,
    fontFamily: fonts.sansSemibold,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.8)',
  },

  progressBlock: { marginBottom: 18 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
  progressCount: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    marginTop: 7,
  },

  tiersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
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
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 4,
  },
});
