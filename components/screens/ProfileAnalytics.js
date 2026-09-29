import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import AppIcon from '../common/AppIcon';
import Button from '../common/Button';
import PressTap from '../common/PressTap';
import BarChart from '../common/BarChart';
import HeatmapGrid from '../common/HeatmapGrid';
import DonutChart from '../common/DonutChart';
import { fonts } from '../../lib/fonts';
import { GOLD } from '../../lib/buttonTokens';
import { withAlpha } from '../../lib/phase-colors';
import { haptic } from '../../hooks/useHaptic';
import { HEATMAP_DAY_LABELS } from '../../lib/profileMock';

// Blanc unique : l'échelle de chaleur multicolore a été jugée trop
// chargée par l'utilisateur (29/09/2026).
const VOLUME_COLOR = '#FFFFFF';

// Fondu de l'aperçu verrouillé : net en haut, fond noir en bas, avec des
// paliers intermédiaires pour éviter une barre visible.
const FADE_COLORS = [
  'rgba(0,0,0,0)',
  'rgba(0,0,0,0.25)',
  'rgba(0,0,0,0.6)',
  'rgba(0,0,0,0.88)',
  'rgba(0,0,0,1)',
];
const FADE_LOCATIONS = [0, 0.3, 0.55, 0.8, 1];

const average = (list) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : 0);

export default function ProfileAnalytics({ stats, isPremium, onGoPremium }) {
  const locked = !isPremium;

  const [showMore, setShowMore] = useState(false);
  const r = stats;
  const weeklyAvg = average(stats.weeklyVolume).toFixed(1).replace('.', ',');
  const allDays = stats.heatmapWeeks.flat();
  const activeDays = allDays.filter((v) => v > 0).length;
  const totalDays = allDays.length;

  return (
    <View style={styles.root}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RÉGULARITÉ</Text>
        <View style={styles.tiles}>
          <MetricTile icon="flame" label="STREAK" value={String(r.streak)} unit="j" caption={`record ${r.bestStreak} j`} />
          <MetricTile icon="sessions" label="SÉANCES" value={String(r.sessionCount)} caption="au total" />
          <MetricTile icon="clock" label="TEMPS" value={r.timeLabel} caption="cumulé" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIVITÉ</Text>
        {/* Le volume reste en tête ; la grille de régularité se déplie sous
            « Voir plus » pour garder le bloc compact. */}
        <View style={styles.card}>
          <CardHeader
            title="Volume de séances"
            subtitle="8 dernières semaines"
            rightLabel="MOY."
            rightValue={`${weeklyAvg}/sem.`}
          />
          <BarChart
            data={stats.weeklyVolume}
            labels={stats.weeklyLabels}
            height={140}
            color={VOLUME_COLOR}
            dimOpacity={0.5}
            interactive
          />

          {showMore ? (
            <Animated.View entering={FadeIn.duration(260)} style={styles.moreBlock}>
              <CardHeader
                title="Calendrier d'entraînement"
                subtitle="Une case = un jour · plus c'est clair, plus tu t'es entraîné"
                rightLabel="JOURS ACTIFS"
                rightValue={`${activeDays}/${totalDays}`}
              />
              <HeatmapGrid weeks={stats.heatmapWeeks} dayLabels={HEATMAP_DAY_LABELS} />
            </Animated.View>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            icon={showMore ? 'close' : 'plus'}
            label={showMore ? 'Voir moins' : 'Voir plus'}
            haptic={haptic.light}
            onPress={() => setShowMore((v) => !v)}
            style={styles.moreBtn}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.premiumHead}>
          <AppIcon name="crown" size={12} color={GOLD} />
          <Text style={[styles.sectionTitle, styles.premiumTitle]}>ANALYSE AVANCÉE</Text>
        </View>

        {locked ? (
          <View>
            {/* Aperçu : les premières cartes se voient nettement, puis tout
                s'estompe progressivement vers le fond. Pas de vrai flou
                (BlurView fait ressortir du banding, voir GrainOverlay) : un
                fondu vers le noir donne le même effet « il y a la suite ». */}
            <PressTap onPress={onGoPremium} tapScale={0.99} accessibilityLabel="Débloquer l'analyse avancée">
              <View style={styles.teaser} pointerEvents="none">
                <PremiumContent stats={stats} preview />
                <LinearGradient
                  colors={FADE_COLORS}
                  locations={FADE_LOCATIONS}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            </PressTap>
            <View style={styles.teaserCta}>
              <Button
                variant="glass"
                size="sm"
                icon="crown"
                label="Voir toute l'analyse avancée"
                onPress={onGoPremium}
                haptic={haptic.medium}
              />
            </View>
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(320)}>
            <PremiumContent stats={stats} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function PremiumContent({ stats, preview = false }) {
  const tut = stats.tension;
  const monthlyAvg = Math.round(average(stats.monthlyCounts));
  const [showMore, setShowMore] = useState(false);
  const deltaLabel = tut.deltaPct === null ? '—' : `${tut.deltaPct > 0 ? '+' : ''}${tut.deltaPct} %`;

  const tensionCard = (
    <View style={styles.card}>
      <CardHeader title="Temps sous tension" subtitle="Effort réel, repos exclus · ce mois" />
      <View style={styles.tutRow}>
        <View style={styles.tutLeft}>
          <Text style={styles.tutValue} numberOfLines={1}>
            {tut.label}
          </Text>
          <View style={styles.deltaRow}>
            <View style={styles.deltaChip}>
              <Text style={styles.deltaText}>{deltaLabel}</Text>
            </View>
            <Text style={styles.deltaCaption}>vs mois dernier</Text>
          </View>
        </View>
        <View style={styles.tutBars}>
          <BarChart data={tut.weekly} height={52} color={GOLD} showValue={false} maxBarWidth={14} dimOpacity={0.3} />
          <Text style={styles.tutBarsCaption}>4 SEM.</Text>
        </View>
      </View>
    </View>
  );
  const formatsCard = (
    <View style={styles.card}>
      <CardHeader title="Répartition des formats" subtitle="Toutes tes séances" />
      <FormatBreakdown data={stats.formatBreakdown} />
    </View>
  );
  const monthlyCard = (
    <View style={styles.card}>
      <CardHeader
        title="Comparatif mensuel"
        subtitle="6 derniers mois"
        rightLabel="MOY."
        rightValue={`${monthlyAvg}/mois`}
      />
      <BarChart
        data={stats.monthlyCounts}
        labels={stats.monthlyLabels}
        height={140}
        color={GOLD}
        dimOpacity={0.3}
        interactive
      />
    </View>
  );

  // Aperçu verrouillé : toujours le MÊME bloc (jamais au hasard), sinon un
  // non-Premium pourrait relancer l'écran pour voir tour à tour toutes les stats.
  if (preview) return <View>{tensionCard}</View>;

  return (
    <View>
      {tensionCard}

      {showMore ? (
        <Animated.View entering={FadeIn.duration(260)}>
          <View style={styles.cardSpaced}>{formatsCard}</View>
          <View style={styles.cardSpaced}>{monthlyCard}</View>
        </Animated.View>
      ) : null}

      <Button
        variant="ghost"
        size="sm"
        icon={showMore ? 'close' : 'plus'}
        label={showMore ? 'Voir moins' : 'Voir plus'}
        haptic={haptic.light}
        onPress={() => setShowMore((v) => !v)}
        style={styles.premiumMoreBtn}
      />
    </View>
  );
}

function FormatBreakdown({ data }) {
  const [activeId, setActiveId] = useState(null);
  const total = data.reduce((s, f) => s + f.count, 0);
  const pct = (count) => (total > 0 ? Math.round((count / total) * 100) : 0);
  const active = data.find((f) => f.id === activeId);

  const toggle = (id) => {
    haptic.selection();
    setActiveId((cur) => (cur === id ? null : id));
  };

  return (
    <View style={styles.donutRow}>
      <DonutChart data={data} activeId={activeId}>
        <Text style={styles.donutValue}>{active ? active.count : total}</Text>
        <Text style={styles.donutCaption} numberOfLines={1}>
          {active ? `${active.label} · ${pct(active.count)} %` : 'SÉANCES'}
        </Text>
      </DonutChart>
      <View style={styles.legend}>
        {data.map((f) => {
          const dimmed = activeId != null && activeId !== f.id;
          return (
            <PressTap key={f.id} onPress={() => toggle(f.id)} tapScale={0.97} accessibilityLabel={f.label}>
              <View style={[styles.legendRow, dimmed && styles.legendRowDimmed]}>
                <View style={[styles.legendDot, { backgroundColor: f.color }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {f.label}
                </Text>
                <Text style={styles.legendCount}>{f.count}</Text>
                <Text style={styles.legendPct}>{`${pct(f.count)} %`}</Text>
              </View>
            </PressTap>
          );
        })}
      </View>
    </View>
  );
}

function MetricTile({ icon, label, value, unit, caption }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        <AppIcon name={icon} size={14} color="#FFFFFF" opacity={0.7} />
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.tileValueRow}>
        <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {value}
        </Text>
        {unit ? <Text style={styles.tileUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.tileCaption} numberOfLines={1}>
        {caption}
      </Text>
    </View>
  );
}

function CardHeader({ title, subtitle, rightLabel, rightValue }) {
  return (
    <View style={styles.cardHead}>
      <View style={styles.cardHeadText}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightValue ? (
        <View style={styles.cardHeadRight}>
          <Text style={styles.cardRightLabel}>{rightLabel}</Text>
          <Text style={styles.cardRightValue}>{rightValue}</Text>
        </View>
      ) : null}
    </View>
  );
}

const CARD = {
  backgroundColor: 'rgba(255,255,255,0.04)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.10)',
  borderRadius: 18,
};

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  tiles: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 8,
  },
  tile: {
    ...CARD,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tileHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileLabel: {
    flexShrink: 1,
    marginLeft: 6,
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.55)',
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  tileValue: {
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 30,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  tileUnit: {
    marginLeft: 3,
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  tileCaption: {
    marginTop: 4,
    fontFamily: fonts.monoRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
  },

  card: {
    ...CARD,
    padding: 16,
  },
  cardSpaced: {
    marginTop: 10,
  },
  premiumMoreBtn: {
    alignSelf: 'center',
    marginTop: 6,
  },
  moreBlock: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  moreBtn: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: -6,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardHeadText: {
    flexGrow: 1,
    flexShrink: 1,
  },
  cardTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  cardSubtitle: {
    marginTop: 2,
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.50)',
  },
  cardHeadRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  cardRightLabel: {
    fontFamily: fonts.monoRegular,
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.45)',
  },
  cardRightValue: {
    marginTop: 2,
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  premiumHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 4,
    minHeight: 22,
  },
  premiumTitle: {
    color: GOLD,
    marginBottom: 0,
    paddingHorizontal: 0,
    marginLeft: 6,
  },

  teaser: {
    maxHeight: 230,
    overflow: 'hidden',
    borderRadius: 18,
  },
  teaserCta: {
    alignItems: 'center',
    marginTop: -34,
  },

  tutRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tutLeft: {
    flexGrow: 1,
    flexShrink: 1,
  },
  tutValue: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  deltaChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: withAlpha(GOLD, 0.14),
  },
  deltaText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: GOLD,
  },
  deltaCaption: {
    marginLeft: 8,
    fontFamily: fonts.monoRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
  },
  tutBars: {
    width: 104,
    marginLeft: 12,
  },
  tutBarsCaption: {
    marginTop: 5,
    textAlign: 'center',
    fontFamily: fonts.monoRegular,
    fontSize: 8.5,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.40)',
  },

  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donutValue: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  donutCaption: {
    marginTop: 2,
    maxWidth: 84,
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.55)',
  },
  legend: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    marginLeft: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  legendRowDimmed: {
    opacity: 0.4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    flexGrow: 1,
    flexShrink: 1,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  legendCount: {
    marginLeft: 8,
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  legendPct: {
    width: 40,
    textAlign: 'right',
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
  },
});
