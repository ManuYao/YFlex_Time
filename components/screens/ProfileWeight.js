import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Button from '../common/Button';
import IconButton from '../common/IconButton';
import WeightChart from '../common/WeightChart';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import {
  chartEntries,
  formatKg,
  formatWeightDate,
  weightTrend,
} from '../../lib/bodyWeightShape';

const RECENT_ROWS = 4;

// Hausse / baisse / maintien : un mot et une flèche (typographie), sur une même
// teinte neutre. Aucune couleur « bon / mauvais » : monter ou descendre n'est
// bon ou mauvais que selon l'objectif de chacun.
const TREND_TEXT = {
  up: (d) => `↑ +${formatKg(Math.abs(d))} kg`,
  down: (d) => `↓ −${formatKg(Math.abs(d))} kg`,
  stable: () => '= Stable',
};

/**
 * Section « POIDS » du Profil : dernier poids, tendance sur 30 jours (hausse /
 * baisse / maintien), courbe, dernières pesées. Les pesées sont locales
 * (lib/bodyWeight.js). `entries` : plus ancienne → plus récente.
 */
export default function ProfileWeight({ entries, onAdd, onRemove }) {
  const last = entries[entries.length - 1] ?? null;
  const trend = useMemo(() => weightTrend(entries), [entries]);
  const points = useMemo(() => chartEntries(entries), [entries]);
  const recent = useMemo(() => entries.slice(-RECENT_ROWS).reverse(), [entries]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>POIDS</Text>
      <View style={styles.card}>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.cardTitle}>Suivi du poids</Text>
            <Text style={styles.cardSubtitle}>
              {last ? `Dernière pesée : ${formatWeightDate(last.at).toLowerCase()}` : 'Une pesée par jour, de ton téléphone'}
            </Text>
          </View>
          <Button
            variant="glass"
            size="sm"
            icon="plus"
            label={last ? 'Ajouter' : 'Noter mon poids'}
            haptic={haptic.light}
            onPress={onAdd}
          />
        </View>

        {last ? (
          <>
            <View style={styles.valueRow}>
              <View style={styles.valueLeft}>
                <Text style={styles.value} numberOfLines={1}>
                  {formatKg(last.kg)}
                  <Text style={styles.unit}> kg</Text>
                </Text>
              </View>
              {trend.direction !== 'none' ? (
                <View style={styles.trendWrap}>
                  <View style={styles.trendChip}>
                    <Text style={styles.trendText}>{TREND_TEXT[trend.direction](trend.delta)}</Text>
                  </View>
                  <Text style={styles.trendCaption}>{`sur ${trend.days} jours`}</Text>
                </View>
              ) : null}
            </View>

            {points.length > 1 ? (
              <WeightChart entries={points} />
            ) : (
              <Text style={styles.hint}>Ajoute une deuxième pesée un autre jour pour voir ta courbe.</Text>
            )}

            <View style={styles.rows}>
              {recent.map((e) => (
                <View key={e.id} style={styles.row}>
                  <Text style={styles.rowDate}>{formatWeightDate(e.at)}</Text>
                  <Text style={styles.rowValue}>{`${formatKg(e.kg)} kg`}</Text>
                  <IconButton
                    icon="close"
                    size={28}
                    haptic={haptic.light}
                    onPress={() => onRemove(e.id)}
                    accessibilityLabel={`Supprimer la pesée du ${formatWeightDate(e.at)}`}
                  />
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.hint}>
            Note ton poids de temps en temps : tu verras ici s’il monte, descend ou reste stable.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    padding: 16,
  },
  head: { flexDirection: 'row', alignItems: 'center' },
  headText: { flexGrow: 1, flexShrink: 1, paddingRight: 8 },
  cardTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: '#FFFFFF' },
  cardSubtitle: {
    marginTop: 2,
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.50)',
  },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, marginBottom: 6 },
  valueLeft: { flexGrow: 1, flexShrink: 1 },
  value: { fontFamily: fonts.display, fontSize: 38, color: '#FFFFFF', includeFontPadding: false },
  unit: { fontFamily: fonts.sansSemibold, fontSize: 16, color: 'rgba(255,255,255,0.5)' },
  trendWrap: { alignItems: 'flex-end' },
  trendChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  trendText: { fontFamily: fonts.monoBold, fontSize: 12, color: '#FFFFFF' },
  trendCaption: {
    marginTop: 4,
    fontFamily: fonts.monoRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
  },
  hint: {
    marginTop: 14,
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.55)',
  },
  rows: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  rowDate: { flexGrow: 1, fontFamily: fonts.sansMedium, fontSize: 12.5, color: 'rgba(255,255,255,0.65)' },
  rowValue: { marginRight: 10, fontFamily: fonts.monoBold, fontSize: 12.5, color: '#FFFFFF' },
});
