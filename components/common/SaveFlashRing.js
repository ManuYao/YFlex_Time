import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Même géométrie que le halo de MaintenanceScreen (Rect SVG + strokeDasharray
// / strokeDashoffset animés), réduite à UN SEUL passage : le trait se dessine
// (dashoffset plein -> 0, ~420ms) puis disparaît en fondu (~350ms), pas de
// boucle ni de dégradé arc-en-ciel — ce n'est qu'une confirmation de
// sauvegarde silencieuse (pas de bouton "Enregistrer" à côté).
const MARGIN = 5;
const LINE_WIDTH = 2;
const HOLD_MS = 500;

/**
 * SaveFlashRing — enveloppe un contenu et fait apparaître un contour vert
 * qui se dessine puis s'efface, à chaque changement de `trigger` (jamais au
 * montage initial). `trigger` est une valeur qui change à chaque VRAIE
 * sauvegarde (ex: un compteur incrémenté par l'appelant), pas à chaque
 * rendu.
 *
 *   <SaveFlashRing trigger={saveCount}>
 *     <TextInput ... />
 *   </SaveFlashRing>
 */
export default function SaveFlashRing({ trigger, radius = 18, color = '#1FC777', children, style }) {
  const [size, setSize] = useState(null);
  const draw = useSharedValue(0);
  const opacity = useSharedValue(0);
  const mountedTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger === mountedTrigger.current || trigger == null) return;
    mountedTrigger.current = trigger;
    draw.value = 0;
    opacity.value = 1;
    draw.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    opacity.value = withDelay(HOLD_MS, withTiming(0, { duration: 350 }));
  }, [trigger]);

  const border = useMemo(() => {
    if (!size) return null;
    const rw = size.w - LINE_WIDTH;
    const rh = size.h - LINE_WIDTH;
    const r = Math.max(0, Math.min(radius - LINE_WIDTH / 2, rw / 2, rh / 2));
    const perimeter = 2 * (rw + rh) - 8 * r + 2 * Math.PI * r;
    return { x: MARGIN + LINE_WIDTH / 2, y: MARGIN + LINE_WIDTH / 2, rw, rh, r, perimeter };
  }, [size, radius]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: border ? (1 - draw.value) * border.perimeter : 0,
  }));
  const wrapStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // `onLayout` reste sur cette View simple, jamais sur un noeud qui porterait
  // sa propre transition d'entrée — même piège que MaintenanceScreen (un
  // changement d'enfants en plein montage d'une animation Reanimated peut la
  // figer à son état initial sur la Nouvelle Architecture).
  const onLayout = (e) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  };

  return (
    <View style={style} onLayout={onLayout}>
      {children}
      {border && (
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { width: size.w + MARGIN * 2, height: size.h + MARGIN * 2 }, wrapStyle]}
        >
          <Svg width={size.w + MARGIN * 2} height={size.h + MARGIN * 2}>
            <AnimatedRect
              x={border.x}
              y={border.y}
              width={border.rw}
              height={border.rh}
              rx={border.r}
              ry={border.r}
              fill="none"
              stroke={color}
              strokeWidth={LINE_WIDTH}
              strokeDasharray={[border.perimeter, border.perimeter]}
              animatedProps={animatedProps}
            />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: -MARGIN,
    left: -MARGIN,
  },
});
