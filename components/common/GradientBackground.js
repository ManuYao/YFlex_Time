import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
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
  // (V) Second jeu de couleurs fondu par-dessus le premier, piloté par une
  // sharedValue d'opacité. Sert à la phase de repos de l'écran Running : le
  // fond doit pouvoir passer d'une couleur à l'autre EN GARDANT sa géométrie.
  // Un calque peint à part serait linéaire là où le fond est radial, et la
  // mise en scène changerait de forme en même temps que de couleur. Ici les
  // deux couches sont rendues par le même code, donc superposables au pixel.
  // Props optionnelles : sans elles, ce composant se comporte comme avant.
  overlayColors = null,
  overlayOpacity = null,
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
      <GradientLayer id="bg" colors={colors} ambient={ambient} size={size} />

      {overlayColors && overlayOpacity ? (
        <OverlayLayer
          colors={overlayColors}
          ambient={ambient}
          size={size}
          opacity={overlayOpacity}
        />
      ) : null}

      {children}

      {grain && <GrainOverlay tint={grainTint} opacity={0.06} />}
    </View>
  );
}

// Une seule définition du dégradé, utilisée par le fond et par sa surcouche :
// c'est ce qui garantit que les deux couches se superposent exactement. L'id
// doit différer d'une couche à l'autre — deux <Defs> portant le même id dans
// la même vue et le second ne serait jamais résolu.
function GradientLayer({ id, colors, ambient, size }) {
  return (
    <Svg
      width={size.width}
      height={size.height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        {ambient ? (
          <RadialGradient id={id} cx="50%" cy="20%" rx="80%" ry="60%" fx="50%" fy="20%">
            <Stop offset="0" stopColor={colors[0]} stopOpacity="0.20" />
            <Stop offset="0.6" stopColor="#0A0A0A" stopOpacity="1" />
            <Stop offset="1" stopColor="#000000" stopOpacity="1" />
          </RadialGradient>
        ) : (
          <RadialGradient id={id} cx="50%" cy="40%" rx="85%" ry="85%" fx="50%" fy="40%">
            <Stop offset="0" stopColor={colors[0]} stopOpacity="1" />
            <Stop offset="0.45" stopColor={colors[1]} stopOpacity="1" />
            <Stop offset="1" stopColor={colors[2]} stopOpacity="1" />
          </RadialGradient>
        )}
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

function OverlayLayer({ colors, ambient, size, opacity }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <GradientLayer id="bgOverlay" colors={colors} ambient={ambient} size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
