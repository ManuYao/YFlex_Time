import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import PressTap from '../common/PressTap';
import AppIcon from '../common/AppIcon';
import { TIER_PALETTE } from '../common/BadgeMedal';
import { TrophyStateMedal } from '../common/TrophyMedal';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { buildTickPaths, orEmpty, ringSegments } from '../../lib/medalGeometry';
import { formatLeft } from '../../lib/trophyCatalog';
import { formatShortDate } from '../../lib/trophies';
import { BADGE_TIERS } from '../../lib/badges';

// Briques d'affichage des trophées, partagées par la page Trophées (app/trophies.js) et la
// carte du Profil (components/screens/ProfileTrophies.js). Elles ne lisent rien : tout vient
// de l'évaluation (lib/trophies.js).

const WHITE = '#FFFFFF';
const RING_COLORS = [TIER_PALETTE.bronze.hi, TIER_PALETTE.argent.hi, TIER_PALETTE.or.hi, WHITE];

// La couleur qui représente un exploit (celle du mode, du jeu… ; le blanc si l'anneau en a plusieurs).
export const mainColorOf = (def) => {
  const colors = def.colors || (def.color ? [def.color] : [WHITE]);
  return colors.length > 1 ? WHITE : colors[0];
};

/* ───────────────────────── Anneau des trophées gagnés ───────────────────────── */

/**
 * Le grand anneau à 60 graduations : chaque graduation allumée prend la couleur de ce qui a
 * été gagné (bronze, argent, or, exploits et secrets). Au centre, le nombre de trophées.
 */
export const TrophyRing = React.memo(function TrophyRing({ size = 84, counts, total, unlocked, big = false }) {
  const bands = useMemo(
    () => ringSegments([counts.bronze, counts.argent, counts.or, counts.unique.got + counts.secret.got], total),
    [counts, total]
  );
  const c = size / 2;
  const outer = size / 2 - size * 0.033;
  const ticks = useMemo(() => buildTickPaths({ c, outer, ring: size, bands }), [c, outer, size, bands]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Path d={orEmpty(ticks.off.minor)} fill="none" stroke={WHITE} strokeOpacity={0.24} strokeWidth={size * 0.015} strokeLinecap="round" />
        <Path d={orEmpty(ticks.off.major)} fill="none" stroke={WHITE} strokeOpacity={0.45} strokeWidth={size * 0.025} strokeLinecap="round" />
        {ticks.lit.map((band, i) => (
          <React.Fragment key={i}>
            <Path d={orEmpty(band.minor)} fill="none" stroke={RING_COLORS[i]} strokeWidth={size * 0.015} strokeLinecap="round" />
            <Path d={orEmpty(band.major)} fill="none" stroke={RING_COLORS[i]} strokeWidth={size * 0.025} strokeLinecap="round" />
          </React.Fragment>
        ))}
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={[styles.ringValue, big ? styles.ringValueBig : styles.ringValueSmall]}>{unlocked}</Text>
        {big ? <Text style={styles.ringCaption}>SUR {total} TROPHÉES</Text> : null}
      </View>
    </View>
  );
});

/* ───────────────────────── Pastilles de décompte ───────────────────────── */

function Chip({ dotStyle, n, label }) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, dotStyle]} />
      <Text style={styles.chipN}>{n}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

// Version serrée (carte du Profil) : un point et un chiffre, sans fond ni cadre.
function MiniCount({ dotStyle, n, label }) {
  return (
    <View style={styles.miniCount}>
      <View style={[styles.chipDot, dotStyle]} />
      <Text style={styles.miniN}>{n}</Text>
      {label ? <Text style={styles.miniLabel}>{label}</Text> : null}
    </View>
  );
}

/** Bronze, Argent, Or, exploits, secrets : combien de chaque. */
export const TrophyChips = React.memo(function TrophyChips({ counts, compact = false }) {
  const c = counts;
  if (compact) {
    return (
      <View style={styles.miniRow}>
        <MiniCount dotStyle={{ backgroundColor: TIER_PALETTE.bronze.hi }} n={c.bronze} />
        <MiniCount dotStyle={{ backgroundColor: TIER_PALETTE.argent.hi }} n={c.argent} />
        <MiniCount dotStyle={{ backgroundColor: TIER_PALETTE.or.hi }} n={c.or} />
        <MiniCount dotStyle={styles.dotUnique} n={c.unique.got} label={c.unique.got > 1 ? 'exploits' : 'exploit'} />
        <MiniCount dotStyle={styles.dotSecret} n={c.secret.got} label={c.secret.got > 1 ? 'secrets' : 'secret'} />
      </View>
    );
  }
  return (
    <View style={styles.chips}>
      <Chip dotStyle={{ backgroundColor: TIER_PALETTE.bronze.hi }} n={c.bronze} label="Bronze" />
      <Chip dotStyle={{ backgroundColor: TIER_PALETTE.argent.hi }} n={c.argent} label="Argent" />
      <Chip dotStyle={{ backgroundColor: TIER_PALETTE.or.hi }} n={c.or} label="Or" />
      <Chip dotStyle={styles.dotUnique} n={`${c.unique.got} sur ${c.unique.total}`} label="exploits" />
      <Chip dotStyle={styles.dotSecret} n={`${c.secret.got} sur ${c.secret.total}`} label="secrets" />
    </View>
  );
});

/* ───────────────────────── Rangée d'un trophée à paliers ───────────────────────── */

// Une ligne = le trophée, ses 3 médailles (en couleur = gagné, cadenas = pas encore) et, tant
// qu'il reste un palier, UN seul court texte : « encore 30 séances ». Rien d'autre : la
// médaille visée affiche son objectif, le texte dit ce qu'il manque.
export const TierRow = React.memo(function TierRow({ state, divider = false, onPress }) {
  const def = state.def;
  const next = state.nextTier;
  return (
    <PressTap
      tapScale={0.98}
      onHapticIn={haptic.light}
      onPress={() => onPress?.(state)}
      accessibilityLabel={`Trophée ${def.name}`}
      style={[styles.rowWrap, divider && styles.rowDivider]}
    >
      <View style={styles.row}>
        <View style={[styles.dial, { backgroundColor: `${def.color}26` }]}>
          <AppIcon name={def.icon} size={20} color={def.color} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowName} numberOfLines={1}>
            {def.name}
          </Text>
          {def.desc ? (
            <Text style={styles.rowDesc} numberOfLines={2}>
              {def.desc}
            </Text>
          ) : null}
        </View>
        <View style={styles.medals}>
          {state.tiers.map((_, i) => (
            <TrophyStateMedal key={i} state={state} tierIndex={i} size={38} />
          ))}
        </View>
        <AppIcon name="arrow" size={12} opacity={0.3} style={styles.chevron} />
      </View>
      {next ? (
        <Text style={[styles.rowSummary, { color: `${TIER_PALETTE[next.key].hi}E6` }]} numberOfLines={1}>
          {formatLeft(def, next.threshold - state.value)}
        </Text>
      ) : null}
    </PressTap>
  );
});

/* ───────────────────────── Tuile d'un exploit / d'un secret ───────────────────────── */

export const UniqueTile = React.memo(function UniqueTile({ state, onPress, now }) {
  const def = state.def;
  const main = mainColorOf(def);
  // Une seule ligne de plus, et seulement si elle apprend quelque chose : la date d'obtention
  // (« 17 nov. »), ou l'avancement d'un exploit en cours (« 2 sur 3 »). Le cadenas dit déjà « pas
  // encore », inutile de l'écrire.
  let caption = '';
  let captionColor = 'rgba(255,255,255,0.55)';
  if (state.unlocked) {
    caption = formatShortDate(state.at, now);
    captionColor = main;
  } else if (state.hasProgress && state.value > 0) {
    caption = `${state.value} sur ${state.target}`;
  }
  return (
    <PressTap
      tapScale={0.96}
      onHapticIn={haptic.light}
      onPress={() => onPress?.(state)}
      accessibilityLabel={`${def.name}, ${def.desc}`}
      containerStyle={styles.cell}
      style={styles.tile}
    >
      <TrophyStateMedal state={state} size={64} />
      <View style={styles.tileTexts}>
        <Text style={styles.tileName} numberOfLines={2}>
          {def.name}
        </Text>
        <Text style={styles.tileDesc} numberOfLines={3}>
          {def.desc}
        </Text>
      </View>
      {caption ? (
        <Text style={[styles.tileCaption, { color: captionColor }]} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </PressTap>
  );
});

export const SecretTile = React.memo(function SecretTile({ state, onPress, now }) {
  const def = state.def;
  const found = state.unlocked;
  const date = found ? formatShortDate(state.at, now) : '';
  return (
    <PressTap
      tapScale={0.96}
      onHapticIn={haptic.light}
      onPress={() => onPress?.(state)}
      accessibilityLabel={found ? `${def.name}, ${def.desc}` : 'Trophée secret, pas encore trouvé'}
      containerStyle={styles.cell}
      style={styles.tile}
    >
      <TrophyStateMedal state={state} size={56} />
      <View style={styles.tileTexts}>
        <Text style={styles.tileName} numberOfLines={2}>
          {found ? def.name : '???'}
        </Text>
        {found ? (
          <Text style={styles.tileDescSmall} numberOfLines={2}>
            {def.desc}
          </Text>
        ) : null}
      </View>
      {found && date ? (
        <Text style={[styles.tileCaption, { color: WHITE }]} numberOfLines={1}>
          {date}
        </Text>
      ) : null}
    </PressTap>
  );
});

// Cases d'une grille régulière : `perRow` colonnes égales, la dernière rangée complétée de vides.
function Grid({ items, perRow, render, divider }) {
  const rows = [];
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow));
  return (
    <View style={[styles.grid, divider && styles.gridDivider]}>
      {rows.map((row, r) => (
        <View key={r} style={styles.gridRow}>
          {row.map((item) => (
            <React.Fragment key={item.id}>{render(item)}</React.Fragment>
          ))}
          {Array.from({ length: perRow - row.length }).map((_, k) => (
            <View key={`pad-${k}`} style={styles.cell} />
          ))}
        </View>
      ))}
    </View>
  );
}

/* ───────────────────────── Une famille de trophées ───────────────────────── */

export const FamilySection = React.memo(function FamilySection({ family, states, onOpen, now }) {
  const tiers = states.filter((s) => s.kind === 'tier');
  const uniques = states.filter((s) => s.kind === 'unique');
  const secrets = states.filter((s) => s.kind === 'secret');
  let got = 0;
  let all = 0;
  for (const s of states) {
    if (s.kind === 'tier') {
      got += s.unlockedCount;
      all += s.tiers.length;
    } else {
      all += 1;
      if (s.unlocked) got += 1;
    }
  }
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{family.title}</Text>
        <Text style={styles.sectionCount}>
          {got} sur {all}
        </Text>
      </View>
      <View style={styles.card}>
        {tiers.map((s, i) => (
          <TierRow key={s.id} state={s} divider={i > 0} onPress={onOpen} />
        ))}
        {uniques.length > 0 && (
          <Grid
            items={uniques}
            perRow={3}
            divider={tiers.length > 0}
            render={(s) => <UniqueTile state={s} onPress={onOpen} now={now} />}
          />
        )}
        {secrets.length > 0 && (
          <Grid items={secrets} perRow={4} render={(s) => <SecretTile state={s} onPress={onOpen} now={now} />} />
        )}
      </View>
    </View>
  );
});

/* ───────────────────────── « Le prochain » ───────────────────────── */

/** Le trophée à paliers le plus proche de son prochain palier : la médaille, la barre, ce qui reste. */
export const NextTrophy = React.memo(function NextTrophy({ state, onPress, compact = false }) {
  const def = state.def;
  const tier = state.nextTier;
  const palette = TIER_PALETTE[tier.key];
  const index = state.tiers.indexOf(tier);
  const pct = `${Math.round(tier.progress * 100)}%`;
  const medal = compact ? 48 : 64;
  return (
    <PressTap
      tapScale={0.98}
      onHapticIn={haptic.light}
      onPress={() => onPress?.(state)}
      accessibilityLabel={`Le prochain trophée : ${def.name}`}
      style={[compact ? styles.nextCompact : styles.nextCard]}
    >
      <TrophyStateMedal state={state} tierIndex={index} size={medal} />
      <View style={styles.nextBody}>
        <Text style={[styles.nextKicker, { color: palette.hi }]}>LE PROCHAIN</Text>
        <Text style={compact ? styles.nextNameCompact : styles.nextName} numberOfLines={1}>
          {def.name}
        </Text>
        <View style={styles.nextBarRow}>
          <View style={styles.nextTrack}>
            <View style={[styles.nextFill, { width: pct, backgroundColor: palette.hi }]} />
          </View>
        </View>
        <Text style={styles.nextRemain} numberOfLines={1}>
          {formatLeft(def, tier.threshold - state.value)}
        </Text>
      </View>
    </PressTap>
  );
});

/* ───────────────────────── Derniers gagnés ───────────────────────── */

/** Les derniers trophées gagnés (médaille, nom, date), du plus récent au plus ancien. */
export const RecentTrophies = React.memo(function RecentTrophies({ evaluation, count = 4, onPress, now }) {
  const items = evaluation.recent.slice(0, count);
  if (!items.length) return null;
  return (
    <View style={styles.recentGrid}>
      {items.map((e) => {
        const state = evaluation.byId[e.id];
        if (!state) return null;
        const tierIndex = e.tier ? BADGE_TIERS.findIndex((t) => t.key === e.tier) : 0;
        return (
          <PressTap
            key={`${e.id}-${e.tier || 'done'}`}
            tapScale={0.96}
            onHapticIn={haptic.light}
            onPress={() => onPress?.(state, tierIndex)}
            accessibilityLabel={`${state.def.name}, gagné`}
            containerStyle={styles.cell}
            style={styles.recentItem}
          >
            <TrophyStateMedal state={state} tierIndex={tierIndex} size={52} />
            <Text style={styles.recentName} numberOfLines={2}>
              {state.def.name}
            </Text>
            <Text style={styles.recentDate}>{formatShortDate(e.at, now)}</Text>
          </PressTap>
        );
      })}
      {Array.from({ length: Math.max(0, count - items.length) }).map((_, k) => (
        <View key={`pad-${k}`} style={styles.cell} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontFamily: fonts.display,
    color: WHITE,
    includeFontPadding: false,
  },
  ringValueBig: { fontSize: 88, lineHeight: 104 },
  ringValueSmall: { fontSize: 32, lineHeight: 38 },
  ringCaption: {
    marginTop: 2,
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.55)',
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  miniRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 6 },
  miniCount: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniN: { fontFamily: fonts.monoBold, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  miniLabel: { fontFamily: fonts.sansSemibold, fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  dotUnique: { borderWidth: 1.5, borderColor: WHITE },
  dotSecret: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)', borderStyle: 'dashed' },
  chipN: { fontFamily: fonts.monoBold, fontSize: 11, color: WHITE },
  chipLabel: { fontFamily: fonts.sansSemibold, fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  section: { marginBottom: 24 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
  },
  sectionCount: { fontFamily: fonts.monoBold, fontSize: 10, color: 'rgba(255,255,255,0.45)' },
  sectionHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    overflow: 'hidden',
  },

  rowWrap: { paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowSummary: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  dial: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flexGrow: 1, flexShrink: 1, marginLeft: 10, marginRight: 8 },
  rowName: { fontFamily: fonts.sansExtraBold, fontSize: 14, color: WHITE },
  rowDesc: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  rowCaption: {
    fontFamily: fonts.monoRegular,
    fontSize: 9.5,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
  },
  medals: { flexDirection: 'row', gap: 3 },
  chevron: { marginLeft: 6 },

  grid: { paddingVertical: 14, paddingHorizontal: 8, rowGap: 14 },
  gridDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  // Les tuiles d'une même rangée ont la même hauteur : leurs légendes s'alignent en bas.
  gridRow: { flexDirection: 'row', alignItems: 'stretch' },
  cell: { flex: 1 },
  tile: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  tileTexts: { flexGrow: 1, alignItems: 'center' },
  tileName: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 12.5,
    lineHeight: 15,
    color: WHITE,
    textAlign: 'center',
    marginTop: 8,
  },
  tileDesc: {
    fontFamily: fonts.sansMedium,
    fontSize: 10.5,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 3,
  },
  tileDescSmall: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    lineHeight: 13,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 2,
  },
  tileCaption: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 1,
    marginTop: 6,
    textAlign: 'center',
  },
  tileDate: {
    fontFamily: fonts.monoRegular,
    fontSize: 8.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    textAlign: 'center',
  },

  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
  },
  nextCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  nextBody: { flex: 1, minWidth: 0 },
  nextKicker: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 1.6 },
  nextName: { fontFamily: fonts.sansExtraBold, fontSize: 16, color: WHITE, marginTop: 3 },
  nextNameCompact: { fontFamily: fonts.sansExtraBold, fontSize: 14, color: WHITE, marginTop: 2 },
  nextTier: { fontFamily: fonts.sansSemibold, color: 'rgba(255,255,255,0.55)' },
  nextSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  nextBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  nextTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  nextFill: { height: 6, borderRadius: 3 },
  nextValue: { fontFamily: fonts.monoBold, fontSize: 10.5 },
  nextRemain: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 5,
  },

  recentGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  recentItem: { alignItems: 'center' },
  recentName: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    lineHeight: 13,
    color: WHITE,
    textAlign: 'center',
    marginTop: 6,
  },
  recentDate: {
    fontFamily: fonts.monoRegular,
    fontSize: 8.5,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 3,
  },
});
