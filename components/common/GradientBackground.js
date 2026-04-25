import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GrainOverlay from './GrainOverlay';

export default function GradientBackground({
  colors,
  textMode = 'light',
  grain = true,
  children,
}) {
  const vignetteColor = textMode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.55)';
  const grainTint = textMode === 'dark' ? '#000000' : '#FFFFFF';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={colors}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', vignetteColor]}
        locations={[0.3, 1]}
        start={{ x: 0.5, y: 0.3 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
      {grain && <GrainOverlay tint={grainTint} opacity={0.07} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
