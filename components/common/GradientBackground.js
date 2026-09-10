import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

import GrainOverlay from './GrainOverlay';

// Valeur de départ seulement : évite un frame noir avant le premier onLayout.
// La taille réelle la remplace aussitôt — en edge-to-edge (imposé depuis le
// SDK 57) la racine est plus haute que Dimensions.get('window'), et un Svg
// dimensionné sur cette dernière laissait une bande noire en bas.
const INITIAL = Dimensions.get('window');

export default function GradientBackground({
  colors,
  textMode = 'light',
  ambient = false,
  grain = true,
  children,
}) {
  const isDark = textMode === 'dark';
  const grainTint = isDark ? '#000000' : '#FFFFFF';

  // Le <Svg> ne peut se dimensionner qu'apres le premier onLayout, et avec les
  // transitions de la Stack cette mesure arrive tard. On peint donc le
  // conteneur avec la teinte mediane du degrade : pendant ce laps de temps on
  // voit cette couleur au lieu d'un aplat noir.
  const fallbackBg = ambient ? '#0A0A0A' : colors[1];

  const [size, setSize] = useState({ width: INITIAL.width, height: INITIAL.height });

  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height }
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: fallbackBg }]} onLayout={handleLayout}>
      <Svg
        width={size.width}
        height={size.height}
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
  },
});
