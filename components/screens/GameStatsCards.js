import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppIcon from '../common/AppIcon';
import BarChart from '../common/BarChart';
import FoldPanel, { FoldDivider } from '../common/FoldPanel';
import { fonts } from '../../lib/fonts';
import { GOLD } from '../../lib/buttonTokens';
import { withAlpha } from '../../lib/phase-colors';

const plural = (n, one, many) => (n > 1 ? many : one);

// Statistiques des jeux, page « Analyse avancée » (Premium). Les données viennent
// de lib/gameStats.js (computeGameStats, toutes les parties gardées sur le
// téléphone). Sans Premium, chaque jeu montre toujours ses propres scores dans son
// écran : ici on ne trouve que l'analyse d'ensemble. C'est le contenu du grand groupe
// « Tes jeux » (app/analysis.js) : un petit groupe d'ensemble (les chiffres de tous
// les jeux + leur rythme par semaine), puis un petit groupe par jeu. Tous pliés au
// départ (FoldPanel) : la personne déplie ce qu'elle veut voir.
export default function GameStatsCards({ stats }) {
  return (
    <>
      <FoldPanel
        foldable
        title="Vue d’ensemble"
        subtitle="Tous tes jeux réunis"
        summary={{ label: 'PARTIES', value: String(stats.plays) }}
      >
        <View style={styles.tiles}>
          <Tile icon="play" label="PARTIES" value={String(stats.plays)} caption={`${stats.activeDays} ${plural(stats.activeDays, 'jour', 'jours')} de jeu`} />
          <Tile icon="repeat" label="RÉPÉTITIONS" value={String(stats.totalReps)} caption="au total" />
          <Tile icon="medal" label="RECORDS" value={String(stats.recordsBroken)} caption={plural(stats.recordsBroken, 'battu', 'battus')} />
        </View>
        {stats.plays >= 2 ? (
          <>
            <FoldDivider />
            <FoldPanel
              bare
              title="Parties par semaine"
              subtitle={stats.favorite ? `8 dernières semaines · favori : ${stats.favorite.label}` : '8 dernières semaines, tous jeux confondus'}
            >
              <BarChart
                data={stats.weeklyPlays}
                labels={stats.weeklyLabels}
                height={120}
                color={GOLD}
                dimOpacity={0.3}
                interactive
              />
            </FoldPanel>
          </>
        ) : null}
      </FoldPanel>

      {stats.games.map((g) => (
        <GameCard key={g.id} game={g} />
      ))}
    </>
  );
}

function GameCard({ game }) {
  const { main } = game;
  const showSeries = main.series.length >= 2;
  const delta = main.delta;
  return (
    <FoldPanel
      foldable
      title={game.label}
      subtitle={`${main.label} · ${main.plays} ${plural(main.plays, 'partie', 'parties')}`}
      rightLabel="RECORD"
      rightValue={String(game.best.value)}
      dot={game.color}
    >
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
    </FoldPanel>
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

const styles = StyleSheet.create({
  // Dans la carte « Vue d'ensemble » : trois cases côte à côte.
  tiles: { flexDirection: 'row', alignSelf: 'stretch', gap: 8 },
  tile: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
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
