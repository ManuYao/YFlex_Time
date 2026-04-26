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
  const grainOpacity = 0.06;
  const vignetteAlpha = isDark ? 0.35 : 0.55;
  const scrimColor = isDark ? '255,255,255' : '0,0,0';
  const scrimAlpha = isDark ? 0.35 : 0.4;

  return (
    <View style={styles.root}>
      {/* Background — radial gradient (matches maquette `radial-gradient(ellipse at 50% 40%, ...)`) */}
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill} pointerEvents="none">
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

      {/* Vignette — radial dark edges (only on full mode) */}
      {!ambient && (
        <Svg
          width={SCREEN_W}
          height={SCREEN_H}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="vig" cx="50%" cy="40%" rx="65%" ry="65%" fx="50%" fy="40%">
              <Stop offset="0.35" stopColor="#000000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000000" stopOpacity={vignetteAlpha} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#vig)" />
        </Svg>
      )}

      {/* Center scrim — light/dark radial pop near top center (only on full mode) */}
      {!ambient && (
        <Svg
          width={SCREEN_W}
          height={SCREEN_H}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="scrim" cx="50%" cy="32%" rx="35%" ry="35%" fx="50%" fy="32%">
              <Stop
                offset="0"
                stopColor={`rgb(${scrimColor})`}
                stopOpacity={scrimAlpha}
              />
              <Stop offset="1" stopColor={`rgb(${scrimColor})`} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#scrim)" opacity={0.25} />
        </Svg>
      )}

      {children}

      {grain && <GrainOverlay tint={grainTint} opacity={grainOpacity} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
});