import React, { createContext, useContext, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * Squelette de chargement : des blocs gris qui respirent à la place du contenu
 * qui n'est pas encore là, pour que l'écran ne reste ni vide ni figé.
 *
 * Un `SkeletonGroup` pilote UNE seule animation pour tous ses blocs (une
 * respiration lente, sur le fil d'interface : elle ne ralentit pas quand le
 * JavaScript est occupé à monter l'écran). Les blocs (`SkeletonBlock`) la
 * lisent ; hors d'un groupe ils restent fixes. Si « réduire les animations »
 * est activé sur le téléphone, rien ne bouge.
 *
 * Gris blanc translucide, comme les cartes de l'app : aucune couleur nouvelle.
 */
const PulseContext = createContext(null);

const BASE_OPACITY = 0.55;
const PULSE_MS = 900;

export function SkeletonGroup({ children, style }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0;
      return undefined;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [reduceMotion]);

  return (
    <PulseContext.Provider value={pulse}>
      <View style={style} accessible accessibilityLabel="Chargement en cours">
        {children}
      </View>
    </PulseContext.Provider>
  );
}

/**
 * Un bloc de placeholder. `width` peut être un nombre ou un pourcentage ;
 * `radius` à `height / 2` pour une pastille ou un disque.
 */
export function SkeletonBlock({ width = '100%', height = 14, radius = 8, style }) {
  const pulse = useContext(PulseContext);
  const animated = useAnimatedStyle(() => ({
    opacity: pulse ? BASE_OPACITY + (1 - BASE_OPACITY) * pulse.value : 1,
  }));
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: 'rgba(255,255,255,0.10)' },
        style,
        animated,
      ]}
    />
  );
}
