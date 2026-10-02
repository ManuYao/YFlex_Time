import React from 'react';
import { View, StyleSheet } from 'react-native';

import { SkeletonGroup, SkeletonBlock } from '../common/Skeleton';

const AVATAR = 96;
// Hauteurs des barres de l'histogramme factice : inégales exprès, un histogramme
// aux barres toutes pareilles ressemble à une règle, pas à un graphique.
const BARS = [58, 84, 46, 112, 76, 128, 66, 96];

/**
 * Squelette du Hub Profil.
 *
 * Les hauteurs ci-dessous sont celles du VRAI contenu, relevées dans les styles
 * de ProfileHeader, ProfileAccount, ProfileAnalytics et ProfileMixShare (carte
 * « Se connecter » 91 + 20, disciplines 21 + 54, tuiles 102, carte Activité 260,
 * aperçu Premium 230…). Un squelette « à peu près » fait SAUTER la page quand le
 * vrai contenu le remplace : les sections se retrouvent 40 ou 50 px plus haut ou
 * plus bas. Si une de ces mises en page change, la mettre à jour ici aussi.
 *
 * `showAccount` : la carte « Se connecter » n'existe que quand personne n'est
 * connecté ; sans elle la page commence plus haut.
 */
export default function ProfileSkeleton({ showAccount = true }) {
  return (
    <SkeletonGroup style={styles.root}>
      {/* ── Identité : avatar, pseudo, pastilles, ancienneté ── */}
      <View style={styles.identityRow}>
        <SkeletonBlock width={AVATAR} height={AVATAR} radius={AVATAR / 2} />
        <View style={styles.identityText}>
          <SkeletonBlock width={150} height={26} radius={8} />
          <View style={styles.chips}>
            <SkeletonBlock width={72} height={25} radius={13} />
            <SkeletonBlock width={58} height={25} radius={13} />
          </View>
          <SkeletonBlock width={120} height={11} radius={6} />
        </View>
      </View>

      {/* ── Carte « Se connecter » (sans compte seulement) ── */}
      {showAccount && <SkeletonBlock height={91} radius={18} style={styles.account} />}

      {/* ── Disciplines ── */}
      <View style={styles.disciplines}>
        <View style={styles.titleSlot}>
          <SkeletonBlock width={80} height={10} radius={5} />
        </View>
        <View style={styles.tags}>
          <SkeletonBlock height={54} radius={16} style={styles.tag} />
          <SkeletonBlock height={54} radius={16} style={styles.tag} />
          <SkeletonBlock width={40} height={40} radius={20} />
        </View>
      </View>

      {/* ── Régularité : trois tuiles ── */}
      <View style={styles.section}>
        <View style={styles.titleSlot}>
          <SkeletonBlock width={90} height={10} radius={5} />
        </View>
        <View style={styles.tiles}>
          <SkeletonBlock height={102} radius={18} style={styles.tile} />
          <SkeletonBlock height={102} radius={18} style={styles.tile} />
          <SkeletonBlock height={102} radius={18} style={styles.tile} />
        </View>
      </View>

      {/* ── Activité : volume sur 8 semaines ── */}
      <View style={styles.section}>
        <View style={styles.titleSlot}>
          <SkeletonBlock width={70} height={10} radius={5} />
        </View>
        <View style={styles.activityCard}>
          <View style={styles.cardHead}>
            <View style={styles.cardHeadText}>
              <SkeletonBlock width={130} height={15} radius={7} />
              <SkeletonBlock width={100} height={11} radius={6} />
            </View>
            <SkeletonBlock width={64} height={30} radius={8} />
          </View>
          <View style={styles.bars}>
            {BARS.map((h, i) => (
              <SkeletonBlock key={i} width={`${100 / BARS.length - 3}%`} height={h} radius={6} />
            ))}
          </View>
          <SkeletonBlock width={96} height={30} radius={15} style={styles.more} />
        </View>
      </View>

      {/* ── Analyse avancée : l'aperçu ── */}
      <View style={styles.section}>
        <View style={styles.titleSlot}>
          <SkeletonBlock width={120} height={10} radius={5} />
        </View>
        <SkeletonBlock height={230} radius={18} />
      </View>

      {/* ── Mix : deux rangées ── */}
      <View style={styles.section}>
        <View style={styles.titleSlot}>
          <SkeletonBlock width={34} height={10} radius={5} />
        </View>
        <View style={styles.card}>
          {[0, 1].map((i) => (
            <View key={i} style={[styles.navRow, i > 0 && styles.navRowDivider]}>
              <SkeletonBlock width={38} height={38} radius={12} />
              <View style={styles.navText}>
                <SkeletonBlock width={120} height={15} radius={7} />
                <SkeletonBlock width="85%" height={11} radius={6} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Trophées : cinq modes, trois médailles chacun ── */}
      <View style={styles.section}>
        <View style={styles.titleSlot}>
          <SkeletonBlock width={64} height={10} radius={5} />
        </View>
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
      </View>
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
    gap: 18,
    height: AVATAR,
    marginBottom: 20,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
  },
  account: {
    marginBottom: 20,
  },
  disciplines: {
    marginBottom: 24,
  },
  // Même hauteur que le titre de section réel (10 px de texte + 8 de marge).
  titleSlot: {
    height: 21,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    flex: 1,
    width: undefined,
  },
  section: {
    marginBottom: 24,
  },
  tiles: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    width: undefined,
  },
  activityCard: {
    height: 260,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    height: 34,
    marginBottom: 14,
  },
  cardHeadText: {
    gap: 4,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
  },
  more: {
    alignSelf: 'center',
    marginTop: 8,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
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
});
