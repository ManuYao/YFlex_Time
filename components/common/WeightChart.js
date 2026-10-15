import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { fonts } from '../../lib/fonts';
import { formatKg, formatWeightDate } from '../../lib/bodyWeightShape';

const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 10;
// Écart minimal affiché sur l'axe vertical : une courbe presque plate (stable)
// reste plate au lieu de grossir un écart de 100 grammes.
const MIN_SPAN_KG = 1;

/**
 * Courbe d'évolution du poids : un point par pesée, placés selon la DATE (deux
 * pesées espacées de dix jours sont plus éloignées que deux pesées de la
 * veille), le dernier point en évidence. Dessinée en SVG maison (pas de
 * bibliothèque de graphiques). Les textes sont des `<Text>` React Native posés
 * par-dessus : jamais de `<Text>` SVG avec les polices maison.
 *
 * `entries` : { id, at, kg }, du plus ancien au plus récent.
 */
export default function WeightChart({ entries, height = 130, color = '#FFFFFF' }) {
  const [width, setWidth] = useState(0);
  const n = entries.length;

  const kgs = entries.map((e) => e.kg);
  const lo = Math.min(...kgs);
  const hi = Math.max(...kgs);
  const mid = (lo + hi) / 2;
  const span = Math.max(MIN_SPAN_KG, hi - lo);
  const yMin = mid - span / 2;
  const t0 = entries[0].at;
  const t1 = entries[n - 1].at;
  const tSpan = Math.max(1, t1 - t0);

  const plotW = Math.max(0, width - PAD_X * 2);
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const points = entries.map((e) => ({
    x: PAD_X + (n === 1 ? plotW / 2 : ((e.at - t0) / tSpan) * plotW),
    y: PAD_TOP + plotH - ((e.kg - yMin) / span) * plotH,
  }));

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area =
    points.length > 1
      ? `${line} L${points[n - 1].x.toFixed(1)} ${height - PAD_BOTTOM} L${points[0].x.toFixed(1)} ${height - PAD_BOTTOM} Z`
      : '';
  const last = points[n - 1];

  return (
    <View
      style={{ height: height + 20 }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w !== width) setWidth(w);
      }}
    >
      {width > 0 ? (
        <>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.22} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {/* Repères horizontaux discrets : haut et bas de la plage. */}
            <Path
              d={`M${PAD_X} ${PAD_TOP} H${width - PAD_X} M${PAD_X} ${PAD_TOP + plotH} H${width - PAD_X}`}
              stroke="#FFFFFF"
              strokeOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="3 5"
            />
            {area ? <Path d={area} fill="url(#weightArea)" /> : null}
            {points.length > 1 ? (
              <Path d={line} stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            ) : null}
            {points.slice(0, -1).map((p, i) => (
              <Circle key={entries[i].id} cx={p.x} cy={p.y} r={2.6} fill={color} fillOpacity={0.55} />
            ))}
            <Circle cx={last.x} cy={last.y} r={8} fill={color} fillOpacity={0.18} />
            <Circle cx={last.x} cy={last.y} r={4.2} fill={color} />
          </Svg>

          <Text style={[styles.scale, { top: 0 }]}>{`${formatKg(hi)} kg`}</Text>
          <Text style={[styles.scale, { top: height - PAD_BOTTOM - 12 }]}>{`${formatKg(lo)} kg`}</Text>
          <View style={styles.dates}>
            <Text style={styles.date}>{formatWeightDate(entries[0].at)}</Text>
            {n > 1 ? <Text style={styles.date}>{formatWeightDate(entries[n - 1].at)}</Text> : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scale: {
    position: 'absolute',
    left: PAD_X,
    fontFamily: fonts.monoRegular,
    fontSize: 9,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.42)',
    includeFontPadding: false,
  },
  dates: {
    position: 'absolute',
    left: PAD_X,
    right: PAD_X,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  date: {
    fontFamily: fonts.monoRegular,
    fontSize: 9,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.42)',
    includeFontPadding: false,
  },
});
