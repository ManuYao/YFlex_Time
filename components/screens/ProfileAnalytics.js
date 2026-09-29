import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

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
import {
  HEATMAP_DAY_LABELS,
  MOCK_FORMAT_BREAKDOWN,
  MOCK_HEATMAP_WEEKS,
  MOCK_MONTHLY_COMPARISON,
  MOCK_MONTHLY_LABELS,
  MOCK_REGULARITY,
  MOCK_TIME_UNDER_TENSION,
  MOCK_WEEKLY_LABELS,
  MOCK_WEEKLY_VOLUME,
} from '../../lib/profileMock';

// Échelle de chaleur du volume hebdomadaire : les teintes de la flamme de
// série (StreakFlame), qui se colore déjà quand la série grandit — même
// langage, aucune couleur inventée. Seuils en séances par semaine.
const HEAT_STEPS = [
  { min: 7, color: '#FF5454', label: '7+' },
  { min: 5, color: '#FF7A1A', label: '5-6' },
  { min: 3, color: '#FFC933', label: '3-4' },
  { min: 0, color: '#FFFFFF', label: '0-2' },
];
const volumeHeatColor = (v) => HEAT_STEPS.find((s) => v >= s.min).color;

function HeatLegend() {
  return (
    <View style={styles.heatLegend}>
      {[...HEAT_STEPS].reverse().map((s) => (
        <View key={s.label} style={styles.heatLegendItem}>
          <View style={[styles.heatLegendDot, { backgroundColor: s.color }]} />
          <Text style={styles.heatLegendText}>{s.label}</Text>
        </View>
      ))}
      <Text style={styles.heatLegendUnit}>séances / sem.</Text>
    </View>
  );
}

const LOCKED_OPACITY = 0.3;

const average = (list) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : 0);

export default function ProfileAnalytics({ isPremium, onGoPremium }) {
  const [demo, setDemo] = useState(false);
  const locked = !isPremium && !demo;
  const showDemoChrome = !isPremium && demo;

  const reveal = useSharedValue(locked ? 0 : 1);
  useEffect(() => {
    reveal.value = withTiming(locked ? 0 : 1, { duration: 320 });
  }, [locked]);
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0, 1], [LOCKED_OPACITY, 1]),
  }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: 1 - reveal.value }));

  const openDemo = () => setDemo(true);
  const closeDemo = () => {
    haptic.light();
    setDemo(false);
  };

  const [showMore, setShowMore] = useState(false);
  const r = MOCK_REGULARITY;
  const weeklyAvg = average(MOCK_WEEKLY_VOLUME).toFixed(1).replace('.', ',');
  const allDays = MOCK_HEATMAP_WEEKS.flat();
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
        {/* Décision utilisateur : le volume reste en tête et se colore avec
            l'effort (pas tout blanc pour les non-Premium) ; la grille de
            régularité se déplie sous « Voir plus » pour garder le bloc compact. */}
        <View style={styles.card}>
          <CardHeader
            title="Volume de séances"
            subtitle="8 dernières semaines · plus ça chauffe, plus tu as enchaîné"
            rightLabel="MOY."
            rightValue={`${weeklyAvg}/sem.`}
          />
          <BarChart
            data={MOCK_WEEKLY_VOLUME}
            labels={MOCK_WEEKLY_LABELS}
            height={140}
            colorFor={volumeHeatColor}
            dimOpacity={0.5}
            interactive
          />
          <HeatLegend />

          {showMore ? (
            <Animated.View entering={FadeIn.duration(260)} style={styles.moreBlock}>
              <CardHeader
                title="Calendrier d'entraînement"
                subtitle="Une case = un jour · plus c'est clair, plus tu t'es entraîné"
                rightLabel="JOURS ACTIFS"
                rightValue={`${activeDays}/${totalDays}`}
              />
              <HeatmapGrid weeks={MOCK_HEATMAP_WEEKS} dayLabels={HEATMAP_DAY_LABELS} />
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
          <View style={styles.headSpacer} />
          {showDemoChrome ? (
            <PressTap onPress={closeDemo} tapScale={0.94} accessibilityLabel="Quitter la démo">
              <View style={styles.demoChip}>
                <Text style={styles.demoChipText}>DÉMO</Text>
                <AppIcon name="close" size={10} color={GOLD} />
              </View>
            </PressTap>
          ) : null}
        </View>

        <View>
          <Animated.View style={contentStyle} pointerEvents={locked ? 'none' : 'auto'}>
            <PremiumContent />
            {showDemoChrome ? (
              <View style={styles.demoActions}>
                <Button
                  variant="glass"
                  size="sm"
                  icon="crown"
                  label="DÉBLOQUE AVEC PREMIUM"
                  onPress={onGoPremium}
                  haptic={haptic.medium}
                />
                <Button variant="ghost" size="sm" label="Quitter la démo" onPress={closeDemo} />
              </View>
            ) : null}
          </Animated.View>

          {!isPremium ? (
            <Animated.View
              style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
              pointerEvents={locked ? 'box-none' : 'none'}
            >
              <View style={styles.lockPanel}>
                <View style={styles.crownBadge}>
                  <AppIcon name="crown" size={22} color={GOLD} />
                </View>
                <Text style={styles.lockTitle}>Va plus loin dans tes stats</Text>
                <Text style={styles.lockText}>
                  Temps sous tension, formats préférés et comparatif mensuel.
                </Text>
                <Button
                  variant="glass"
                  size="sm"
                  icon="crown"
                  label="DÉBLOQUE AVEC PREMIUM"
                  onPress={onGoPremium}
                  haptic={haptic.medium}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  label="Voir la démo"
                  onPress={openDemo}
                  haptic={haptic.light}
                  style={styles.demoLink}
                />
              </View>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function PremiumContent() {
  const tut = MOCK_TIME_UNDER_TENSION;
  const monthlyAvg = Math.round(average(MOCK_MONTHLY_COMPARISON));

  return (
    <View>
      <View style={styles.card}>
        <CardHeader title="Temps sous tension" subtitle="Effort réel, repos exclus · ce mois" />
        <View style={styles.tutRow}>
          <View style={styles.tutLeft}>
            <Text style={styles.tutValue} numberOfLines={1}>
              {tut.label}
            </Text>
            <View style={styles.deltaRow}>
              <View style={styles.deltaChip}>
                <Text style={styles.deltaText}>{`${tut.deltaPct > 0 ? '+' : ''}${tut.deltaPct} %`}</Text>
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

      <View style={[styles.card, styles.cardSpaced]}>
        <CardHeader title="Répartition des formats" subtitle="Toutes tes séances" />
        <FormatBreakdown />
      </View>

      <View style={[styles.card, styles.cardSpaced]}>
        <CardHeader
          title="Comparatif mensuel"
          subtitle="6 derniers mois"
          rightLabel="MOY."
          rightValue={`${monthlyAvg}/mois`}
        />
        <BarChart
          data={MOCK_MONTHLY_COMPARISON}
          labels={MOCK_MONTHLY_LABELS}
          height={140}
          color={GOLD}
          dimOpacity={0.3}
          interactive
        />
      </View>
    </View>
  );
}

function FormatBreakdown() {
  const [activeId, setActiveId] = useState(null);
  const total = MOCK_FORMAT_BREAKDOWN.reduce((s, f) => s + f.count, 0);
  const pct = (count) => (total > 0 ? Math.round((count / total) * 100) : 0);
  const active = MOCK_FORMAT_BREAKDOWN.find((f) => f.id === activeId);

  const toggle = (id) => {
    haptic.selection();
    setActiveId((cur) => (cur === id ? null : id));
  };

  return (
    <View style={styles.donutRow}>
      <DonutChart data={MOCK_FORMAT_BREAKDOWN} activeId={activeId}>
        <Text style={styles.donutValue}>{active ? active.count : total}</Text>
        <Text style={styles.donutCaption} numberOfLines={1}>
          {active ? `${active.label} · ${pct(active.count)} %` : 'SÉANCES'}
        </Text>
      </DonutChart>
      <View style={styles.legend}>
        {MOCK_FORMAT_BREAKDOWN.map((f) => {
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
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  heatLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heatLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  heatLegendText: {
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.7)',
  },
  heatLegendUnit: {
    fontFamily: fonts.monoRegular,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.4)',
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
  headSpacer: {
    flexGrow: 1,
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withAlpha(GOLD, 0.4),
    backgroundColor: withAlpha(GOLD, 0.12),
  },
  demoChipText: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: GOLD,
    marginRight: 6,
  },
  demoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },

  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockPanel: {
    alignItems: 'center',
    maxWidth: 300,
    marginHorizontal: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withAlpha(GOLD, 0.28),
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  crownBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withAlpha(GOLD, 0.35),
    backgroundColor: withAlpha(GOLD, 0.12),
    marginBottom: 12,
  },
  lockTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 17,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  lockText: {
    marginTop: 6,
    marginBottom: 14,
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
  },
  demoLink: {
    marginTop: 4,
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
