import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const POINTS = 600;

const generatePoints = () => {
  let seed = 12345;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const pts = [];
  for (let i = 0; i < POINTS; i++) {
    pts.push({
      x: random() * SCREEN_W,
      y: random() * SCREEN_H,
      size: 0.5 + random() * 1.2,
      o: 0.05 + random() * 0.15,
    });
  }
  return pts;
};

const POINTS_DATA = generatePoints();

export default function GrainOverlay({ tint = '#FFFFFF', opacity = 0.06 }) {
  return (
    <Svg
      width={SCREEN_W}
      height={SCREEN_H}
      style={[StyleSheet.absoluteFillObject, { opacity }]}
      pointerEvents="none"
    >
      {POINTS_DATA.map((p, i) => (
        <Rect
          key={i}
          x={p.x}
          y={p.y}
          width={p.size}
          height={p.size}
          fill={tint}
          opacity={p.o}
        />
      ))}
    </Svg>
  );
}