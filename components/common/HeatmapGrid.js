import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '../../lib/fonts';

const LABEL_W = 16;
const LEGEND_STEPS = [0, 1, 2, 3];

// Une seule teinte, de pâle à pleine : l'intensité se lit sans légende de couleurs.
const opacityFor = (v, max) => (v <= 0 ? 0.07 : 0.2 + 0.8 * Math.min(1, v / max));

export default function HeatmapGrid({
  weeks,
  dayLabels,
  max = 3,
  color = '#FFFFFF',
  gap = 4,
  maxCellHeight = 20,
  showLegend = true,
}) {
  const [width, setWidth] = useState(0);
  const cols = weeks.length;
  const cellW = width > 0 ? Math.max(0, (width - LABEL_W - gap * cols) / cols) : 0;
  const cellH = width > 0 ? Math.min(maxCellHeight, cellW) : maxCellHeight;
  const rows = dayLabels.length;

  return (
    <View>
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w !== width) setWidth(w);
        }}
      >
        {Array.from({ length: rows }).map((_, d) => (
          <View key={d} style={[styles.row, d > 0 && { marginTop: gap }]}>
            <Text style={styles.dayLabel}>{dayLabels[d]}</Text>
            {weeks.map((week, w) => (
              <View
                key={w}
                style={{
                  width: cellW,
                  height: cellH,
                  marginLeft: gap,
                  borderRadius: 4,
                  backgroundColor: color,
                  opacity: opacityFor(week[d] ?? 0, max),
                }}
              />
            ))}
          </View>
        ))}
      </View>

      {showLegend ? (
        <View style={styles.legend}>
          <Text style={styles.legendText}>MOINS</Text>
          {LEGEND_STEPS.map((s) => (
            <View
              key={s}
              style={[styles.legendCell, { backgroundColor: color, opacity: opacityFor((s / 3) * max, max) }]}
            />
          ))}
          <Text style={styles.legendText}>PLUS</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    width: LABEL_W,
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    includeFontPadding: false,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  legendText: {
    fontFamily: fonts.monoRegular,
    fontSize: 9,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.45)',
    marginHorizontal: 6,
    includeFontPadding: false,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginHorizontal: 2,
  },
});
