import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

import GrainOverlay from './GrainOverlay';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function GradientBackground({
  colors,
  textMode = 'light',
  ambient = false,
  grain = true,
  children,
}) {
  const isDark = textMode === 'dark';
  const grainTint = isDark ? '#000000' : '#FFFFFF';

  return (
    <View style={styles.root}>
      <Svg
        width={SCREEN_W}
        height={SCREEN_H}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          {ambient ? (
            <RadialGradient id="bg" cx="50%" cy="20%" rx="80%" ry="60%" fx="50%" fy="20%">
              <Stop offset="0" stopColor={colors[0]} stopOpacity="0.20" />
              <Stop offset="0.6" stopColor="#0A0A0A" stopOpacity="1" />
              <Stop offset="1" stopColor="#000000" stopOpacity="1" />
            </RadialGradient>
          ) : (
            <RadialGradient id="bg" cx="50%" cy="40%" rx="85%" ry="85%" fx="50%" fy="40%">
              <Stop offset="0" stopColor={colors[0]} stopOpacity="1" />
              <Stop offset="0.45" stopColor={colors[1]} stopOpacity="1" />
              <Stop offset="1" stopColor={colors[2]} stopOpacity="1" />
            </RadialGradient>
          )}
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bg)" />
      </Svg>

      {children}

      {grain && <GrainOverlay tint={grainTint} opacity={0.06} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
});