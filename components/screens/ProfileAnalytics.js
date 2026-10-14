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

// `weightSlot` : la section « POIDS » (gratuite), posée entre l'activité et
// l'analyse avancée. `onOpenAnalysis` : ouvre la page dédiée (app/analysis.js).
export default function ProfileAnalytics({ stats, isPremium, onGoPremium, onOpenAnalysis, weightSlot = null }) {
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

      {weightSlot}

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
            <LockedList sessionCount={stats.sessionCount} />
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
            <PremiumContent stats={stats} onOpenAnalysis={onOpenAnalysis} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// Ce que la personne débloquerait avec SES séances : une phrase qui parle de
// ses données (jamais de chiffres inventés) puis les trois analyses cachées.
const LOCKED_ITEMS = [
  { icon: 'clock', title: 'Temps sous tension', caption: 'Ton effort réel, repos exclus' },
  { icon: 'sessions', title: 'Répartition des formats', caption: 'Ce que tu fais vraiment le plus' },
  { icon: 'calendar', title: 'Comparatif mensuel', caption: 'Tu progresses ? Mois contre mois' },
];

function LockedList({ sessionCount }) {
  const n = sessionCount || 0;
  const lead =
    n > 0
      ? `Tes ${n} séance${n > 1 ? 's' : ''} contiennent déjà de quoi les calculer.`
      : 'Dès ta première séance, ces analyses se remplissent toutes seules.';
  return (
    <View style={styles.lockedWrap}>
      <Text style={styles.lockedLead}>{lead}</Text>
      {LOCKED_ITEMS.map((item) => (
        <View key={item.title} style={styles.lockedRow}>
          <View style={styles.lockedIcon}>
            <AppIcon name={item.icon} size={14} color={GOLD} />
          </View>
          <View style={styles.lockedText}>
            <Text style={styles.lockedTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.lockedCaption} numberOfLines={1}>
              {item.caption}
            </Text>
          </View>
          <AppIcon name="lock" size={13} color="rgba(255,255,255,0.45)" />
        </View>
      ))}
    </View>
  );
}

// Aperçu verrouillé : la forme est visible, pas les chiffres (ils se gagnent).
function TensionCard({ stats, preview = false }) {
  const tut = stats.tension;
  const deltaLabel = tut.deltaPct === null ? '—' : `${tut.deltaPct > 0 ? '+' : ''}${tut.deltaPct} %`;
  const shown = (text) => (preview ? String(text).replace(/\d/g, '•') : text);
  return (
    <View style={styles.card}>
      <CardHeader title="Temps sous tension" subtitle="Effort réel, repos exclus · ce mois" />
      <View style={styles.tutRow}>
        <View style={styles.tutLeft}>
          <Text style={styles.tutValue} numberOfLines={1}>
            {shown(tut.label)}
          </Text>
          <View style={styles.deltaRow}>
            <View style={styles.deltaChip}>
              <Text style={styles.deltaText}>{shown(deltaLabel)}</Text>
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
}

function FormatsCard({ stats }) {
  return (
    <View style={styles.card}>
      <CardHeader title="Répartition des formats" subtitle="Toutes tes séances" />
      <FormatBreakdown data={stats.formatBreakdown} />
    </View>
  );
}

function MonthlyCard({ stats }) {
  const monthlyAvg = Math.round(average(stats.monthlyCounts));
  return (
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
}

// Temps passé dans chaque mode : une barre par format, la plus longue pleine.
function TimePerFormatCard({ stats }) {
  const rows = (stats.modeTimes || []).filter((m) => m.seconds > 0);
  const max = Math.max(1, ...rows.map((m) => m.seconds));
  return (
    <View style={styles.card}>
      <CardHeader title="Temps par format" subtitle="Durée totale passée dans chaque mode" />
      {rows.length === 0 ? (
        <Text style={styles.emptyNote}>Pas encore de séance : ce détail se remplit tout seul.</Text>
      ) : (
        rows.map((m) => (
          <View key={m.id} style={styles.timeRow}>
            <View style={styles.timeHead}>
              <View style={[styles.legendDot, { backgroundColor: m.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {m.label}
              </Text>
              <Text style={styles.legendCount}>{m.timeLabel}</Text>
            </View>
            <View style={styles.timeTrack}>
              <View style={[styles.timeFill, { width: `${Math.max(3, (m.seconds / max) * 100)}%`, backgroundColor: m.color }]} />
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const WEEKDAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const WEEKDAY_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const shortDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s >= 3600) return `${Math.floor(s / 3600)}h${String(Math.round((s % 3600) / 60)).padStart(2, '0')}`;
  return `${Math.max(1, Math.round(s / 60))} min`;
};

// Rythme : durée moyenne, plus longue séance, jour de la semaine préféré.
function RhythmCard({ stats }) {
  const r = stats.rhythm;
  const fav = r.favoriteWeekday;
  return (
    <View style={styles.card}>
      <CardHeader
        title="Ton rythme"
        subtitle={fav === null ? 'Le jour préféré apparaît après quelques séances' : `Tu t’entraînes surtout le ${WEEKDAY_NAMES[fav]}`}
      />
      <View style={styles.rhythmTiles}>
        <View style={styles.rhythmTile}>
          <Text style={styles.rhythmLabel}>SÉANCE MOY.</Text>
          <Text style={styles.rhythmValue}>{r.avgSeconds > 0 ? shortDuration(r.avgSeconds) : '—'}</Text>
        </View>
        <View style={styles.rhythmTile}>
          <Text style={styles.rhythmLabel}>PLUS LONGUE</Text>
          <Text style={styles.rhythmValue}>{r.longestSeconds > 0 ? shortDuration(r.longestSeconds) : '—'}</Text>
        </View>
        <View style={styles.rhythmTile}>
          <Text style={styles.rhythmLabel}>RECORD STREAK</Text>
          <Text style={styles.rhythmValue}>{`${stats.bestStreak} j`}</Text>
        </View>
      </View>
      <BarChart
        data={r.weekdayCounts}
        labels={WEEKDAY_SHORT}
        height={110}
        color={GOLD}
        dimOpacity={0.3}
        interactive
        showValue
      />
    </View>
  );
}

// Toutes les cartes de la page « Analyse avancée » (app/analysis.js).
export function AdvancedCards({ stats }) {
  return (
    <View>
      <TensionCard stats={stats} />
      <View style={styles.cardSpaced}>
        <FormatsCard stats={stats} />
      </View>
      <View style={styles.cardSpaced}>
        <TimePerFormatCard stats={stats} />
      </View>
      <View style={styles.cardSpaced}>
        <MonthlyCard stats={stats} />
      </View>
      <View style={styles.cardSpaced}>
        <RhythmCard stats={stats} />
      </View>
    </View>
  );
}

function PremiumContent({ stats, preview = false, onOpenAnalysis }) {
  // Aperçu verrouillé : toujours le MÊME bloc (jamais au hasard), sinon un
  // non-Premium pourrait relancer l'écran pour voir tour à tour toutes les stats.
  if (preview) return <View><TensionCard stats={stats} preview /></View>;

  return (
    <View>
      <TensionCard stats={stats} />
      {/* Le reste (formats, temps par format, mois, rythme) vit sur sa page. */}
      <Button
        variant="ghost"
        size="sm"
        icon="arrow"
        iconPosition="right"
        label="Voir plus"
        haptic={haptic.light}
        onPress={onOpenAnalysis}
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
    marginTop: 14,
  },
  lockedWrap: {
    marginTop: 10,
    gap: 8,
  },
  lockedLead: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 2,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  lockedIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,201,84,0.14)',
  },
  lockedText: {
    flex: 1,
  },
  lockedTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  lockedCaption: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
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

  emptyNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.55)',
  },
  timeRow: {
    marginTop: 4,
    paddingVertical: 6,
  },
  timeHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  timeFill: {
    height: '100%',
    borderRadius: 3,
  },
  rhythmTiles: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  rhythmTile: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rhythmLabel: {
    fontFamily: fonts.monoRegular,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.45)',
  },
  rhythmValue: {
    marginTop: 4,
    fontFamily: fonts.display,
    fontSize: 22,
    color: '#FFFFFF',
    includeFontPadding: false,
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
