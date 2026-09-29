import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const TAU = Math.PI * 2;
// Marge pour le segment actif, dessiné plus épais que les autres.
const ACTIVE_GROW = 4;

const polar = (c, r, a) => ({ x: c + r * Math.cos(a), y: c + r * Math.sin(a) });

function arcPath(c, r, a0, a1) {
  const p0 = polar(c, r, a0);
  const p1 = polar(c, r, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
}

// data : [{ id, color (hex opaque), count }] ; children = contenu du centre.
export default function DonutChart({ data, size = 128, thickness = 14, gap = 3, activeId = null, children }) {
  const c = size / 2;
  const r = c - thickness / 2 - ACTIVE_GROW / 2 - 1;
  const visible = data.filter((d) => d.count > 0);
  const total = visible.reduce((s, d) => s + d.count, 0);
  const gapA = visible.length > 1 ? gap / r : 0;

  let cursor = -Math.PI / 2;
  const arcs = visible.map((d) => {
    const sweep = (d.count / total) * TAU;
    const a0 = cursor + gapA / 2;
    // Un arc SVG de 360° exactement ne dessine rien : on s'arrête juste avant.
    const a1 = Math.min(cursor + sweep - gapA / 2, a0 + TAU - 0.0001);
    cursor += sweep;
    return { ...d, a0, a1: Math.max(a1, a0 + 0.001) };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={thickness} fill="none" />
        {arcs.map((a) => {
          const isActive = activeId === a.id;
          const dimmed = activeId != null && !isActive;
          return (
            <Path
              key={a.id}
              d={arcPath(c, r, a.a0, a.a1)}
              stroke={a.color}
              strokeOpacity={dimmed ? 0.22 : 1}
              strokeWidth={isActive ? thickness + ACTIVE_GROW : thickness}
              strokeLinecap="butt"
              fill="none"
            />
          );
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
