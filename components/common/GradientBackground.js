import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

import GrainOverlay from './GrainOverlay';

// Valeur de départ seulement : évite un frame noir avant le premier onLayout.
// La taille réelle la remplace aussitôt — en edge-to-edge (imposé depuis le
// SDK 57) la racine est plus haute que Dimensions.get('window'), et un Svg
// dimensionné sur cette dernière laissait une bande noire en bas.
const INITIAL = Dimensions.get('window');

// Couleurs du dernier fond peint : un nouvel écran démarre avec elles, puis
// glisse vers les siennes (TRANSITION_MS). Sans ça, le fondu natif de la Stack
// mélangeait deux écrans de couleurs différentes et la couleur « sautait ».
// Module-level : survit au démontage de l'écran précédent.
let lastBackdrop = null;
const TRANSITION_MS = 520;

const sameColors = (a, b) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((c, i) => c === b[i]));

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
  // Hérite des couleurs de l'écran précédent et glisse vers les siennes.
  // Désactivé pour l'accueil, qui fait déjà son propre fondu entre timers.
  inherit = true,
  children,
}) {
  const isDark = textMode === 'dark';
  const grainTint = isDark ? '#000000' : '#FFFFFF';

  // Le <Svg> ne peut se dimensionner qu'apres le premier onLayout, et avec les
  // transitions de la Stack cette mesure arrive tard. On peint donc le
  // conteneur avec la teinte mediane du degrade : pendant ce laps de temps on
  // voit cette couleur au lieu d'un aplat noir.
  const [base, setBase] = useState(() => {
    const prev = lastBackdrop;
    if (inherit && prev && (prev.ambient !== ambient || !sameColors(prev.colors, colors))) return prev;
    return { colors, ambient };
  });
  const needsFade = inherit && (base.ambient !== ambient || !sameColors(base.colors, colors));
  const fade = useSharedValue(needsFade ? 0 : 1);
  const colorsKey = `${ambient ? 'a' : 'c'}:${colors.join('|')}`;

  useEffect(() => {
    lastBackdrop = { colors, ambient };
    // Sans héritage (accueil) : pas de fondu interne, la couleur est posée
    // telle quelle — sinon l'ancienne couleur « revient » une demi-seconde.
    if (!inherit) return;
    if (base.ambient === ambient && sameColors(base.colors, colors)) return;
    fade.value = 0;
    fade.value = withTiming(1, { duration: TRANSITION_MS, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) runOnJS(setBase)({ colors, ambient });
    });
  }, [colorsKey]);

  const topStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const fallbackBg = needsFade
    ? base.ambient
      ? '#0A0A0A'
      : base.colors[1]
    : ambient
      ? '#0A0A0A'
      : colors[1];

  const [size, setSize] = useState({ width: INITIAL.width, height: INITIAL.height });

  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height }
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: fallbackBg }]} onLayout={handleLayout}>
      {needsFade && (
        <GradientLayer id="bgBase" colors={base.colors} ambient={base.ambient} size={size} />
      )}
      <Animated.View style={[StyleSheet.absoluteFill, topStyle]} pointerEvents="none">
        <GradientLayer id="bg" colors={colors} ambient={ambient} size={size} />
      </Animated.View>

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
