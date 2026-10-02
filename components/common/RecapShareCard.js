import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import TickRing from './TickRing';
import AppIcon from './AppIcon';
import QrSlot from './QrSlot';
import { TIER_PALETTE } from './BadgeMedal';
import { TIMERS } from '../../lib/timers-config';
import { WEEK_DAY_LETTERS } from '../../lib/shareRecap';
import { fonts } from '../../lib/fonts';

const withAlpha = (hex, a) => {
  const h = String(hex || '#FFFFFF').replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const TIER_ORDER = ['bronze', 'argent', 'or'];

/**
 * Carte « statut du joueur » au format Story 9:16 : le bilan de la semaine ou du
 * mois (séances, temps, jours actifs, répartition par mode), les trophées, le
 * pseudo — et l'emplacement réservé au futur QR code.
 *
 * Fond sombre + texte blanc quel que soit le mode : la couleur du mode le plus
 * pratiqué ne sert qu'à teinter une lueur en haut, jamais au texte (un jaune de
 * TABATA derrière du blanc serait illisible). Toutes les tailles dérivent de
 * `cardW` (la carte fait 16/9 de sa largeur), donc rien ne déborde, quelle que
 * soit la hauteur disponible dans la feuille.
 *
 * Props : recap (lib/shareRecap computeRecap), trophies (computeTrophyTally),
 * identity { pseudo, initials }, cardW, cardH.
 */
export default function RecapShareCard({ recap, trophies, identity, cardW, cardH }) {
  const top = recap.topMode ? TIMERS.find((t) => t.id === recap.topMode.id) : null;
  const accent = top?.color ?? '#FFFFFF';
  const W = cardW;
  const pad = W * 0.07;
  const ring = Math.round(W * 0.46);
  const countSize = Math.min(ring * 0.34, (ring - 52) * 0.5);
  const progress = recap.totalDays ? recap.activeDays / recap.totalDays : 0;
  const isWeek = recap.period === 'week';
  const totalModeCount = recap.modes.reduce((n, m) => n + m.count, 0);
  const deltaText =
    recap.deltaPct == null
      ? null
      : `${recap.deltaPct > 0 ? '+' : ''}${recap.deltaPct} % vs ${isWeek ? 'sem. préc.' : 'mois préc.'}`;

  const stat = (label, value) => (
    <View style={styles.statCell}>
      <Text
        style={[styles.statValue, { fontSize: W * 0.075, lineHeight: Math.ceil(W * 0.075 * 1.2) }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, { fontSize: W * 0.034 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  return (
    <View style={[styles.cardShadow, { width: W, height: cardH }]}>
      <View style={styles.card}>
        {/* Lueur du mode le plus pratiqué, en haut seulement. */}
        <LinearGradient
          colors={[withAlpha(accent, 0.38), withAlpha(accent, 0)]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.glow, { height: cardH * 0.55 }]}
          pointerEvents="none"
        />

        <View style={[styles.body, { padding: pad, paddingBottom: pad * 0.6 }]}>
          {/* ── En-tête + identité ── */}
          <View>
            <View style={styles.headRow}>
              <AppIcon name={top?.id ?? 'trophies'} size={W * 0.09} color="#FFFFFF" />
              <View style={styles.headText}>
                <Text style={[styles.eyebrow, { fontSize: W * 0.04 }]} numberOfLines={1}>
                  {recap.title}
                </Text>
                <Text style={[styles.period, { fontSize: W * 0.05 }]} numberOfLines={1}>
                  {recap.label}
                </Text>
              </View>
            </View>
            <View style={[styles.idRow, { marginTop: W * 0.035 }]}>
              <View
                style={[
                  styles.avatar,
                  { width: W * 0.1, height: W * 0.1, borderRadius: W * 0.05, borderColor: withAlpha(accent, 0.8) },
                ]}
              >
                <Text style={[styles.avatarText, { fontSize: W * 0.045 }]} numberOfLines={1}>
                  {identity.initials}
                </Text>
              </View>
              <Text style={[styles.pseudo, { fontSize: W * 0.06 }]} numberOfLines={1}>
                {identity.pseudo}
              </Text>
              {recap.streak > 1 && (
                <View style={styles.streak}>
                  <AppIcon name="flame" size={W * 0.05} color="#FFFFFF" />
                  <Text style={[styles.streakText, { fontSize: W * 0.04 }]}>{recap.streak} J</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Cœur du bilan : l'anneau = jours actifs sur la période ── */}
          <View style={styles.hero}>
            <View style={{ width: ring, height: ring }}>
              <TickRing
                progress={progress}
                size={ring}
                colorActive="#FFFFFF"
                colorInactive="rgba(255,255,255,0.22)"
                animateIn
              />
              <View style={styles.ringCenter} pointerEvents="none">
                <Text
                  style={[styles.count, { fontSize: countSize, lineHeight: Math.ceil(countSize * 1.2) }]}
                  numberOfLines={1}
                >
                  {recap.sessionCount}
                </Text>
                <Text style={[styles.countLabel, { fontSize: Math.max(7, countSize * 0.3) }]} numberOfLines={1}>
                  {recap.sessionCount > 1 ? 'SÉANCES' : 'SÉANCE'}
                </Text>
              </View>
            </View>
            {isWeek ? (
              <View style={[styles.dots, { marginTop: W * 0.02, gap: W * 0.025 }]}>
                {recap.days.map((d, i) => (
                  <View key={i} style={styles.dotCol}>
                    <View
                      style={[
                        styles.dot,
                        {
                          width: W * 0.052,
                          height: W * 0.052,
                          borderRadius: W * 0.026,
                          backgroundColor: d.active ? '#FFFFFF' : 'rgba(255,255,255,0.14)',
                          borderColor: d.today ? '#FFFFFF' : 'transparent',
                        },
                      ]}
                    />
                    <Text style={[styles.dotLetter, { fontSize: W * 0.03 }]}>{WEEK_DAY_LETTERS[i]}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {deltaText && (
              <Text style={[styles.delta, { fontSize: W * 0.036, marginTop: W * 0.015 }]} numberOfLines={1}>
                {deltaText}
              </Text>
            )}
          </View>

          {/* ── Chiffres clés ── */}
          <View style={[styles.stats, { paddingVertical: W * 0.025 }]}>
            {stat('TEMPS', recap.timeLabel)}
            <View style={styles.statSep} />
            {stat('JOURS ACTIFS', `${recap.activeDays}/${recap.totalDays}`)}
            <View style={styles.statSep} />
            {stat('EFFORT', recap.tensionShort)}
          </View>

          {/* ── Répartition par mode + trophées ── */}
          <View>
            <View style={[styles.modeBar, { height: W * 0.022 }]}>
              {totalModeCount === 0 ? (
                <View style={styles.modeEmpty} />
              ) : (
                recap.modes.map((m) => (
                  <View key={m.id} style={{ flex: m.count, backgroundColor: m.color }} />
                ))
              )}
            </View>
            <View style={[styles.legend, { marginTop: W * 0.02 }]}>
              {recap.modes.slice(0, 3).map((m) => (
                <View key={m.id} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                  <Text style={[styles.legendText, { fontSize: W * 0.036 }]} numberOfLines={1}>
                    {m.name} {m.count}
                  </Text>
                </View>
              ))}
            </View>
            <View style={[styles.trophyRow, { marginTop: W * 0.03 }]}>
              <AppIcon name="trophies" size={W * 0.06} color="#FFFFFF" />
              <Text style={[styles.trophyText, { fontSize: W * 0.045 }]}>
                {trophies.unlocked}
                <Text style={styles.trophyTotal}>/{trophies.total}</Text>
              </Text>
              <View style={styles.tiers}>
                {TIER_ORDER.map((key) => (
                  <View key={key} style={styles.tier}>
                    <View style={[styles.tierDot, { backgroundColor: TIER_PALETTE[key].hi }]} />
                    <Text style={[styles.tierText, { fontSize: W * 0.036 }]}>{trophies[key]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ── Pied : marque + emplacement du futur QR code ── */}
        <View style={[styles.footer, { paddingVertical: W * 0.035, paddingHorizontal: pad }]}>
          <View>
            <Text
              style={[
                styles.wordmark,
                { fontSize: W * 0.07, lineHeight: Math.ceil(W * 0.07 * 1.2), letterSpacing: W * 0.012 },
              ]}
            >
              FLEX TIMER
            </Text>
            <Text style={[styles.tagline, { fontSize: W * 0.034 }]} numberOfLines={1}>
              Chrono sportif
            </Text>
          </View>
          <QrSlot size={W * 0.17} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    alignSelf: 'center',
    borderRadius: 22,
    backgroundColor: '#0A0A0A',
    boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
  },
  card: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  glow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headText: {
    marginLeft: 8,
    flexShrink: 1,
  },
  eyebrow: {
    fontFamily: fonts.monoBold,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.80)',
  },
  period: {
    fontFamily: fonts.sansSemibold,
    color: 'rgba(255,255,255,0.60)',
    marginTop: 1,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
  },
  avatarText: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  pseudo: {
    flexShrink: 1,
    fontFamily: fonts.sansExtraBold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  streakText: {
    fontFamily: fonts.monoBold,
    color: '#FFFFFF',
  },
  hero: {
    alignItems: 'center',
  },
  // Centré dans un CERCLE : marge en pourcentage, overflow hidden en garde-fou.
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: '18%',
    overflow: 'hidden',
  },
  count: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlign: 'center',
  },
  countLabel: {
    fontFamily: fonts.monoBold,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.65)',
  },
  dots: {
    flexDirection: 'row',
  },
  dotCol: {
    alignItems: 'center',
    gap: 2,
  },
  dot: {
    borderWidth: 1.5,
  },
  dotLetter: {
    fontFamily: fonts.monoBold,
    color: 'rgba(255,255,255,0.45)',
  },
  delta: {
    fontFamily: fonts.monoBold,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.70)',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statValue: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  statLabel: {
    fontFamily: fonts.monoBold,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.50)',
  },
  statSep: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  modeBar: {
    flexDirection: 'row',
    borderRadius: 999,
    overflow: 'hidden',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  modeEmpty: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: fonts.monoBold,
    color: 'rgba(255,255,255,0.75)',
  },
  trophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trophyText: {
    fontFamily: fonts.monoBold,
    color: '#FFFFFF',
  },
  trophyTotal: {
    color: 'rgba(255,255,255,0.45)',
  },
  tiers: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  tierDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  tierText: {
    fontFamily: fonts.monoBold,
    color: 'rgba(255,255,255,0.80)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  wordmark: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  tagline: {
    fontFamily: fonts.sansMedium,
    color: 'rgba(255,255,255,0.50)',
  },
});
