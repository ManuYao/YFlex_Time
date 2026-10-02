import React from 'react';
import { View, StyleSheet } from 'react-native';

import { SkeletonGroup, SkeletonBlock } from '../common/Skeleton';

const AVATAR = 96;
// Hauteurs des barres de l'histogramme factice : inégales exprès, un histogramme
// aux barres toutes pareilles ressemble à une règle, pas à un graphique.
const BARS = [34, 52, 28, 64, 46, 72, 40, 58];

/**
 * Squelette du Hub Profil : mêmes blocs, mêmes marges et mêmes hauteurs
 * approximatives que le vrai contenu (ProfileHeader, ProfileAnalytics,
 * ProfileMixShare, ProfileGamification), pour que le passage au contenu réel
 * ne fasse pas sauter la page. Affiché pendant le chargement des données et
 * pendant l'animation d'ouverture de l'écran.
 */
export default function ProfileSkeleton() {
  return (
    <SkeletonGroup style={styles.root}>
      {/* ── Identité : avatar, pseudo, pastilles, ancienneté ── */}
      <View style={styles.identityRow}>
        <SkeletonBlock width={AVATAR} height={AVATAR} radius={AVATAR / 2} />
        <View style={styles.identityText}>
          <SkeletonBlock width={150} height={22} radius={8} />
          <View style={styles.chips}>
            <SkeletonBlock width={72} height={24} radius={12} />
            <SkeletonBlock width={58} height={24} radius={12} />
          </View>
          <SkeletonBlock width={120} height={11} radius={6} />
        </View>
      </View>

      {/* ── Carte de connexion / disciplines ── */}
      <SkeletonBlock height={64} radius={18} style={styles.account} />
      <View style={styles.tags}>
        <SkeletonBlock width={96} height={30} radius={15} />
        <SkeletonBlock width={84} height={30} radius={15} />
        <SkeletonBlock width={30} height={30} radius={15} />
      </View>

      {/* ── Régularité : trois tuiles ── */}
      <SkeletonBlock width={90} height={10} radius={5} style={styles.title} />
      <View style={styles.tiles}>
        <SkeletonBlock height={92} radius={16} style={styles.tile} />
        <SkeletonBlock height={92} radius={16} style={styles.tile} />
        <SkeletonBlock height={92} radius={16} style={styles.tile} />
      </View>

      {/* ── Activité : histogramme ── */}
      <SkeletonBlock width={70} height={10} radius={5} style={styles.title} />
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <SkeletonBlock width={110} height={14} radius={7} />
          <SkeletonBlock width={54} height={14} radius={7} />
        </View>
        <View style={styles.bars}>
          {BARS.map((h, i) => (
            <SkeletonBlock key={i} width={`${100 / BARS.length - 3}%`} height={h} radius={6} />
          ))}
        </View>
      </View>

      {/* ── Mix : deux rangées ── */}
      <SkeletonBlock width={34} height={10} radius={5} style={styles.title} />
      <View style={styles.card}>
        {[0, 1].map((i) => (
          <View key={i} style={[styles.navRow, i > 0 && styles.navRowDivider]}>
            <SkeletonBlock width={40} height={40} radius={12} />
            <View style={styles.navText}>
              <SkeletonBlock width={120} height={14} radius={7} />
              <SkeletonBlock width="85%" height={11} radius={6} />
            </View>
          </View>
        ))}
      </View>

      {/* ── Trophées : cinq modes, trois médailles chacun ── */}
      <SkeletonBlock width={64} height={10} radius={5} style={styles.title} />
      <View style={styles.card}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.trophyRow, i > 0 && styles.navRowDivider]}>
            <SkeletonBlock width={34} height={34} radius={17} />
            <View style={styles.navText}>
              <SkeletonBlock width={70} height={13} radius={7} />
              <SkeletonBlock width={110} height={9} radius={5} />
            </View>
            <View style={styles.medals}>
              <SkeletonBlock width={38} height={38} radius={19} />
              <SkeletonBlock width={38} height={38} radius={19} />
              <SkeletonBlock width={38} height={38} radius={19} />
            </View>
          </View>
        ))}
      </View>

      <SkeletonBlock height={56} radius={28} style={styles.cta} />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  identityText: {
    flex: 1,
    marginLeft: 18,
    gap: 10,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  account: {
    marginBottom: 14,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  title: {
    marginBottom: 10,
    marginLeft: 4,
  },
  tiles: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  tile: {
    flex: 1,
    width: undefined,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  navRowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  navText: {
    flex: 1,
    gap: 8,
  },
  trophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  medals: {
    flexDirection: 'row',
    gap: 3,
  },
  cta: {
    marginBottom: 24,
  },
});
