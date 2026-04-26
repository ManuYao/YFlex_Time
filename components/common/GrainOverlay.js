import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Svg, { Defs, Filter, FeTurbulence, FeColorMatrix, Rect } from 'react-native-svg';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function GrainOverlay({ tint = '#FFFFFF', opacity = 0.06 }) {
  const r = parseInt(tint.slice(1, 3), 16) / 255;
  const g = parseInt(tint.slice(3, 5), 16) / 255;
  const b = parseInt(tint.slice(5, 7), 16) / 255;

  return (
    <Svg
      width={SCREEN_W}
      height={SCREEN_H}
      style={[StyleSheet.absoluteFillObject, { opacity }]}
      pointerEvents="none"
    >
      <Defs>
        <Filter id="grain" x="0" y="0" width="100%" height="100%">
          <FeTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" />
          <FeColorMatrix
            type="matrix"
            values={`0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 1 0`}
          />
        </Filter>
      </Defs>
      <Rect width={SCREEN_W} height={SCREEN_H} fill={tint} filter="url(#grain)" />
    </Svg>
  );
}