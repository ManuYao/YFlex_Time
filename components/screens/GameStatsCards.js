import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppIcon from '../common/AppIcon';
import BarChart from '../common/BarChart';
import { fonts } from '../../lib/fonts';
import { GOLD } from '../../lib/buttonTokens';
import { withAlpha } from '../../lib/phase-colors';

const plural = (n, one, many) => (n > 1 ? many : one);

// Statistiques des jeux, page « Analyse avancée » (Premium). Les données viennent
// de lib/gameStats.js (computeGameStats, toutes les parties gardées sur le
// téléphone). Sans Premium, chaque jeu montre toujours ses propres scores dans son
// écran : ici on ne trouve que l'analyse d'ensemble.
export default function GameStatsCards({ stats }) {
  return (
    <View>
      <View style={styles.tiles}>
        <Tile icon="play" label="PARTIES" value={String(stats.plays)} caption={`${stats.activeDays} ${plural(stats.activeDays, 'jour', 'jours')} de jeu`} />
        <Tile icon="repeat" label="RÉPÉTITIONS" value={String(stats.totalReps)} caption="au total" />
        <Tile icon="medal" label="RECORDS" value={String(stats.recordsBroken)} caption={plural(stats.recordsBroken, 'battu', 'battus')} />
      </View>

      {stats.games.map((g) => (
        <View key={g.id} style={styles.cardSpaced}>
          <GameCard game={g} />
        </View>
      ))}

      {stats.plays >= 2 ? (
        <View style={styles.cardSpaced}>
          <View style={styles.card}>
            <CardHeader
              title="Parties par semaine"
              subtitle="8 dernières semaines, tous jeux confondus"
              rightLabel="FAVORI"
              rightValue={stats.favorite ? stats.favorite.label : '—'}
            />
            <BarChart
              data={stats.weeklyPlays}
              labels={stats.weeklyLabels}
              height={120}
              color={GOLD}
              dimOpacity={0.3}
              interactive
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function GameCard({ game }) {
  const { main } = game;
  const showSeries = main.series.length >= 2;
  const delta = main.delta;
  return (
    <View style={styles.card}>
      <CardHeader
        title={game.label}
        subtitle={`${main.label} · ${main.plays} ${plural(main.plays, 'partie', 'parties')}`}
        rightLabel="RECORD"
        rightValue={String(game.best.value)}
        dot={game.color}
      />
      <View style={styles.miniTiles}>
        <MiniTile label="PARTIES" value={String(game.plays)} />
        <MiniTile label="RÉPS TOTAL" value={String(game.totalReps)} />
        <MiniTile label="MOYENNE" value={String(game.avg)} />
      </View>

      {showSeries ? (
        <View style={styles.series}>
          <View style={styles.seriesHead}>
            <Text style={styles.seriesCaption}>{`TES ${main.series.length} DERNIÈRES PARTIES`}</Text>
            {delta !== null && delta !== 0 ? (
              <View style={styles.deltaChip}>
                <Text style={styles.deltaText}>{`${delta > 0 ? '+' : ''}${delta}`}</Text>
              </View>
            ) : null}
          </View>
          <BarChart data={main.series} height={84} color={game.color} dimOpacity={0.3} maxBarWidth={18} interactive />
        </View>
      ) : null}

      <View style={styles.facts}>
        <Fact icon="medal" text={game.recordsBroken > 0 ? `${game.recordsBroken} ${plural(game.recordsBroken, 'record battu', 'records battus')}` : 'Aucun record battu pour l’instant'} />
        {game.finishedPct !== null ? (
          <Fact icon="check" text={`${game.finishedPct} % de tes parties menées jusqu’au bout`} />
        ) : null}
      </View>
    </View>
  );
}

function Tile({ icon, label, value, caption }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        <AppIcon name={icon} size={14} color="#FFFFFF" opacity={0.7} />
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={styles.tileCaption} numberOfLines={1}>
        {caption}
      </Text>
    </View>
  );
}

function MiniTile({ label, value }) {
  return (
    <View style={styles.miniTile}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Fact({ icon, text }) {
  return (
    <View style={styles.fact}>
      <AppIcon name={icon} size={13} color="#FFFFFF" opacity={0.6} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

function CardHeader({ title, subtitle, rightLabel, rightValue, dot }) {
  return (
    <View style={styles.cardHead}>
      <View style={styles.cardHeadText}>
        <View style={styles.titleRow}>
          {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightValue ? (
        <View style={styles.cardHeadRight}>
          <Text style={styles.cardRightLabel}>{rightLabel}</Text>
          <Text style={styles.cardRightValue} numberOfLines={1}>
            {rightValue}
          </Text>
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
  tiles: { flexDirection: 'row', alignSelf: 'stretch', gap: 8 },
  tile: { ...CARD, flexGrow: 1, flexBasis: 0, minWidth: 0, paddingHorizontal: 12, paddingVertical: 12 },
  tileHead: { flexDirection: 'row', alignItems: 'center' },
  tileLabel: {
    flexShrink: 1,
    marginLeft: 6,
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.55)',
  },
  tileValue: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 30,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  tileCaption: {
    marginTop: 4,
    fontFamily: fonts.monoRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
  },

  card: { ...CARD, padding: 16 },
  cardSpaced: { marginTop: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardHeadText: { flexGrow: 1, flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  cardTitle: { flexShrink: 1, fontFamily: fonts.sansBold, fontSize: 14, color: '#FFFFFF' },
  cardSubtitle: {
    marginTop: 2,
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.50)',
  },
  cardHeadRight: { alignItems: 'flex-end', marginLeft: 12, maxWidth: 130 },
  cardRightLabel: {
    fontFamily: fonts.monoRegular,
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.45)',
  },
  cardRightValue: { marginTop: 2, fontFamily: fonts.monoBold, fontSize: 12, color: '#FFFFFF' },

  miniTiles: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  miniTile: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  miniLabel: {
    fontFamily: fonts.monoRegular,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.45)',
  },
  miniValue: {
    marginTop: 4,
    fontFamily: fonts.display,
    fontSize: 22,
    color: '#FFFFFF',
    includeFontPadding: false,
  },

  series: { marginBottom: 12 },
  seriesHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  seriesCaption: {
    flexGrow: 1,
    fontFamily: fonts.monoRegular,
    fontSize: 8.5,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.45)',
  },
  deltaChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: withAlpha(GOLD, 0.14),
  },
  deltaText: { fontFamily: fonts.monoBold, fontSize: 11, color: GOLD },

  facts: { gap: 6 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 12.5, color: 'rgba(255,255,255,0.7)' },
});
