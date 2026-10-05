import { View, Text, StyleSheet } from 'react-native';
import { TIMERS } from '../../lib/timers-config';
import { mixCompositionSegments, formatMixBreakdown } from '../../lib/history';
import { fonts } from '../../lib/fonts';

const COLORS = Object.fromEntries(TIMERS.map((t) => [t.id, t.color]));

// Composition d'une séance MIX en une barre : un segment par format, large
// comme son nombre d'exercices, à la couleur du mode. `detail` ajoute sous la
// barre les nombres (pastille de la couleur + chiffre + nom court).
export default function MixCompositionBar({ session, width, height = 5, detail = false }) {
  const segments = mixCompositionSegments(session);
  if (!segments) return null;
  const label = formatMixBreakdown(session) || undefined;

  return (
    <View
      style={[styles.wrap, width != null && { width }]}
      accessible
      accessibilityLabel={label}
    >
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        {segments.map((seg) => (
          <View
            key={seg.id}
            style={{
              flex: seg.count,
              minWidth: height,
              borderRadius: height / 2,
              backgroundColor: COLORS[seg.id] || '#FFFFFF',
            }}
          />
        ))}
      </View>
      {detail && (
        <View style={styles.legend}>
          {segments.map((seg) => (
            <View key={seg.id} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: COLORS[seg.id] || '#FFFFFF' }]} />
              <Text style={styles.legendText}>{`${seg.count} ${seg.name}`}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
  track: {
    flexDirection: 'row',
    gap: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
});
