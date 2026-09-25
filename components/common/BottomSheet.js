import React, { useCallback, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, BackHandler, ScrollView, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { D, easeImpact, springSheet } from '../../lib/animations';
import { useKeyboardHeight, scrollToFocusedInput } from '../../hooks/useKeyboardHeight';

// Espace gardé entre le bas du contenu et le haut du clavier.
const KEYBOARD_GAP = 12;
// La feuille ne monte jamais plus haut que la barre d'état + cette marge.
const TOP_GAP = 12;

/**
 * Coquille commune aux feuilles du planning. Reprend à l'identique la
 * mécanique de PickerSheet / ModeStatsSheet (translateY + voile + Pressable
 * au-dessus pour fermer), factorisée ici parce que le planning en ouvre trois.
 * Pas de BlurView : GrainOverlay est désactivé dans ce projet, et flouter un
 * dégradé sans dithering fait ressortir du banding.
 *
 * `children` peut être une fonction recevant `{ close, scrollToEnd }` — close
 * referme la feuille avec la même animation que le voile ; scrollToEnd (mode
 * keyboardAware seulement) amène le bas du contenu à l'écran, par exemple un
 * résultat qui vient d'apparaître sous un champ.
 *
 * `keyboardAware` : OBLIGATOIRE pour toute feuille qui contient un champ
 * texte. La feuille remonte avec le clavier, ne dépasse jamais le haut de
 * l'écran (son contenu défile alors), et fait défiler jusqu'au champ en cours
 * de saisie. Sans lui, l'app étant bord à bord, le clavier recouvre le bas
 * de la feuille : champ et boutons cachés.
 */
export default function BottomSheet({ screenH, onClose, children, zIndex = 90, keyboardAware = false }) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(screenH);
  const backdropOpacity = useSharedValue(0);
  const keyboardHeight = useKeyboardHeight();
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const rootRef = useRef(null);
  // Place réellement disponible : selon l'écran, la feuille est posée sous la
  // barre d'état (Planning) ou par-dessus (MIX) — `screenH` seul ne le dit pas.
  const rootH = useSharedValue(0);
  const topBlocked = useSharedValue(insets.top);

  const onRootLayout = (e) => {
    rootH.value = e.nativeEvent.layout.height;
    rootRef.current?.measureInWindow((x, y) => {
      topBlocked.value = Math.max(0, insets.top - (y || 0));
    });
  };

  const lift = useDerivedValue(() =>
    keyboardAware ? Math.max(0, keyboardHeight.value - insets.bottom - KEYBOARD_GAP) : 0
  );

  useEffect(() => {
    if (!keyboardAware) return undefined;
    // keyboardDidShow part à la fin de l'animation du clavier : la feuille a
    // déjà fini de monter et de se réduire, la mesure est juste.
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => scrollToFocusedInput(scrollRef, contentRef), 60);
    });
    return () => sub.remove();
  }, [keyboardAware]);

  const close = useCallback(() => {
    if (keyboardAware) Keyboard.dismiss();
    backdropOpacity.value = withTiming(0, { duration: D.fast });
    translateY.value = withTiming(screenH, { duration: D.fast, easing: easeImpact }, (done) => {
      if (done) runOnJS(onClose)();
    });
  }, [screenH, onClose, keyboardAware]);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: D.base, easing: easeImpact });
    translateY.value = withSpring(0, springSheet);

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, []);

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);
  const render = () => (typeof children === 'function' ? children({ close, scrollToEnd }) : children);

  const sheetStyle = useAnimatedStyle(() => {
    if (!keyboardAware) return { transform: [{ translateY: translateY.value }] };
    const available = rootH.value > 0 ? rootH.value - topBlocked.value : screenH - insets.top;
    return {
      transform: [{ translateY: translateY.value - lift.value }],
      maxHeight: available - TOP_GAP - lift.value,
    };
  });
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <View ref={rootRef} onLayout={onRootLayout} style={[styles.root, { zIndex }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <Pressable style={styles.tap} onPress={close} />

      <Animated.View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }, sheetStyle]}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        {keyboardAware ? (
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View ref={contentRef} collapsable={false}>
              {render()}
            </View>
          </ScrollView>
        ) : (
          render()
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  tap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  // Se réduit quand la feuille est plafonnée (clavier ouvert), sinon épouse
  // son contenu.
  // Débordement sur la marge de la feuille, puis marge rendue au contenu : les
  // rangées de pastilles qui vont d'un bord à l'autre (marginHorizontal: -20)
  // ne sont pas coupées par le ScrollView.
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
    marginHorizontal: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  handleWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.30)',
  },
});
