import React, { useCallback, useEffect } from 'react';
import { View, Pressable, StyleSheet, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { D, easeImpact, springSheet } from '../../lib/animations';

/**
 * Coquille commune aux feuilles du planning. Reprend à l'identique la
 * mécanique de PickerSheet / ModeStatsSheet (translateY + voile + Pressable
 * au-dessus pour fermer), factorisée ici parce que le planning en ouvre trois.
 * Pas de BlurView : GrainOverlay est désactivé dans ce projet, et flouter un
 * dégradé sans dithering fait ressortir du banding.
 *
 * `children` peut être une fonction recevant `{ close }` — utile pour qu'un
 * bouton interne referme la feuille avec la même animation que le voile.
 */
export default function BottomSheet({ screenH, onClose, children, zIndex = 90 }) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(screenH);
  const backdropOpacity = useSharedValue(0);

  const close = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: D.fast });
    translateY.value = withTiming(screenH, { duration: D.fast, easing: easeImpact }, (done) => {
      if (done) runOnJS(onClose)();
    });
  }, [screenH, onClose]);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: D.base, easing: easeImpact });
    translateY.value = withSpring(0, springSheet);

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, []);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <View style={[styles.root, { zIndex }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <Pressable style={styles.tap} onPress={close} />

      <Animated.View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }, sheetStyle]}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        {typeof children === 'function' ? children({ close }) : children}
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
