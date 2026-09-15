import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { getHowToItems } from '../../lib/timers-config';
import { D, easeImpact, springSheet, slideInY } from '../../lib/animations';

const MODE_EMOJI = { amrap: '🔥', basic: '⏱️', emom: '⚡', tabata: '⏲️', mix: '🔀' };

/**
 * Sous-fenêtre ouverte depuis ModeStatsSheet (bouton "Comment ça marche ?").
 * Empilée par-dessus le panneau stats/badges — même structure de sheet
 * (translateY + backdrop), mais sans BlurView : un deuxième flou par-dessus
 * celui de ModeStatsSheet ferait ressortir le banding du dégradé de fond
 * (voir le commentaire dans ModeStatsSheet.js), donc simple voile sombre ici.
 */
export default function HowToSheet({ timer, screenH, onClose }) {
  const translateY = useSharedValue(screenH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: D.base, easing: easeImpact });
    translateY.value = withSpring(0, springSheet);

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, []);

  const handleClose = () => {
    backdropOpacity.value = withTiming(0, { duration: D.fast });
    translateY.value = withTiming(screenH, { duration: D.fast, easing: easeImpact }, (done) => {
      if (done) runOnJS(onClose)();
    });
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const items = getHowToItems(timer);
  const sheetTint = timer.bgColors[1] + 'F2';

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <Pressable style={styles.tap} onPress={handleClose} />

      <Animated.View style={[styles.sheet, sheetStyle, { backgroundColor: sheetTint }]}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <Text style={styles.headerEmoji}>{MODE_EMOJI[timer.id] || '🏅'}</Text>
          <Text style={styles.title}>Comment ça marche</Text>
          <PressTap onPress={handleClose} tapScale={0.9} style={styles.closeBtn} hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </PressTap>
        </View>

        <View style={styles.list}>
          {items.map((item, i) => (
            <Animated.View
              key={i}
              entering={slideInY(12, D.base, 80 + i * 70)}
              style={styles.item}
            >
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <Text style={styles.itemText}>
                <Text style={styles.itemLead}>{item.lead}. </Text>
                {item.text}
              </Text>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 95,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  tap: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  headerEmoji: { fontSize: 20 },
  title: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 17,
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  list: {
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: 14,
  },
  itemIcon: {
    fontSize: 20,
    lineHeight: 22,
  },
  itemText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.90)',
  },
  itemLead: {
    fontFamily: fonts.sansBold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
});
