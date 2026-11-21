import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, PixelRatio, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '../../lib/fonts';
import { useWindowSize } from '../../lib/responsive';
import { getOrientationState, subscribeOrientationState } from '../../lib/orientationState';

const r = (n) => Math.round(n);
const LABELS = { portrait: 'portrait', free: 'libre', soft: 'souple' };
const TEST_LABELS = { soft: 'TEST souple', none: 'TEST aucun' };

/**
 * Taille de la fenêtre EN DIRECT, en haut à gauche (monté par MemoryBadge, donc seulement
 * quand le compteur est affiché : Paramètres › Mémoire). Sert à comprendre pourquoi la
 * fenêtre flottante Samsung ne se redimensionne pas librement : on tire sur un bord, on lit
 * jusqu'où l'app voit la fenêtre descendre.
 *   vue    = la taille mesurée par l'app (onLayout du fond)
 *   sys    = la taille que le système annonce (useWindowDimensions)
 *   min    = la plus petite fenêtre vue depuis l'ouverture du compteur
 *   écran  = l'écran entier, et le facteur de densité
 *   verrou = ce que l'app a demandé à Android (portrait / libre / souple), « TEST » si le mode de test est actif
 * Ne capte aucun appui.
 */
export default function WindowReadout() {
  const insets = useSafeAreaInsets();
  const view = useWindowSize();
  const sys = useWindowDimensions();
  const [orient, setOrient] = useState(getOrientationState());
  useEffect(() => subscribeOrientationState(setOrient), []);

  const min = useRef({ w: Infinity, h: Infinity });
  if (view.width > 0 && view.height > 0) {
    min.current = { w: Math.min(min.current.w, view.width), h: Math.min(min.current.h, view.height) };
  }
  const screen = Dimensions.get('screen');
  const lock = orient.applied ? LABELS[orient.applied] : 'rien demandé';
  const wants = orient.wanted && orient.wanted !== orient.applied ? ` (veut ${LABELS[orient.wanted]})` : '';
  const test = TEST_LABELS[orient.testMode] ? ` · ${TEST_LABELS[orient.testMode]}` : '';

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 2 }]}>
      <Text style={styles.text}>vue {r(view.width)}×{r(view.height)} · sys {r(sys.width)}×{r(sys.height)}</Text>
      <Text style={styles.text}>
        min {r(min.current.w)}×{r(min.current.h)} · écran {r(screen.width)}×{r(screen.height)} · x{PixelRatio.get().toFixed(2)}
      </Text>
      <Text style={styles.text}>
        verrou {lock}{wants}{test}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 8,
    zIndex: 9000,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'flex-start',
  },
  text: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: '#9ED8FF',
  },
});
