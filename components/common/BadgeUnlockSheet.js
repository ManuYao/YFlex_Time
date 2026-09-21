import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import BadgeMedal, { TIER_PALETTE } from './BadgeMedal';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { playSound } from '../../lib/sounds';
import { BADGE_TIERS, BADGE_THRESHOLDS } from '../../lib/badges';
import { springBouncy } from '../../lib/animations';

// Boîte unique partagée par la couronne et la médaille. Les deux calques sont
// posés en absoluteFill DE CETTE boîte, donc ils partagent forcément leur
// centre — c'est la seule façon fiable de les aligner, deux vues de tailles
// différentes centrées par leur parent finissant toujours par se décaler.
// `ringRatio` réserve la marge où la couronne rayonne.
const BOX = 176;
const RING_RATIO = 0.62;
const RAYS = 24;

export default function BadgeUnlockSheet({ screenH, timer, tier, position, total, onClose }) {
  const palette = TIER_PALETTE[tier] || TIER_PALETTE.bronze;
  const tierLabel = BADGE_TIERS.find((t) => t.key === tier)?.label ?? String(tier).toUpperCase();
  const tierIndex = BADGE_TIERS.findIndex((t) => t.key === tier);
  const threshold = (BADGE_THRESHOLDS[timer.id] || BADGE_THRESHOLDS.amrap)[tierIndex];

  useEffect(() => {
    playSound('achievement');
    haptic.success();
    const id = setTimeout(() => haptic.success(), 260);
    return () => clearTimeout(id);
  }, []);

  const medalScale = useSharedValue(0.4);
  const medalOpacity = useSharedValue(0);
  const spin = useSharedValue(0);
  const crown = useSharedValue(0);

  useEffect(() => {
    medalOpacity.value = withTiming(1, { duration: 260 });
    medalScale.value = withDelay(80, withSpring(1, springBouncy));
    // La couronne se déploie APRÈS la médaille : elle célèbre un objet déjà
    // posé, elle n'arrive pas avec lui.
    crown.value = withDelay(320, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
    // Easing.linear obligatoire : sinon la rotation accélère et ralentit à
    // chaque tour (même piège que le halo de MaintenanceScreen).
    spin.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1);
  }, []);

  const medalStyle = useAnimatedStyle(() => ({
    opacity: medalOpacity.value,
    transform: [{ scale: medalScale.value }],
  }));
  const crownStyle = useAnimatedStyle(() => ({
    opacity: crown.value * 0.5,
    transform: [{ rotate: `${spin.value * 360}deg` }, { scale: 0.86 + crown.value * 0.14 }],
  }));

  const rays = [];
  const c = BOX / 2;
  const inner = (BOX * RING_RATIO) / 2 + 9;
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2;
    const long = i % 2 === 0;
    // Plafonné à la demi-boîte : un rayon plus long sortirait du Svg et
    // serait tronqué net.
    const outer = Math.min(inner + (long ? 20 : 11), c - 3);
    rays.push(
      <Line
        key={i}
        x1={c + Math.cos(a) * inner}
        y1={c + Math.sin(a) * inner}
        x2={c + Math.cos(a) * outer}
        y2={c + Math.sin(a) * outer}
        stroke={palette.hi}
        strokeOpacity={long ? 0.9 : 0.45}
        strokeWidth={long ? 2 : 1.2}
        strokeLinecap="round"
      />
    );
  }

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={130}>
      {({ close }) => (
        <>
          <Text style={styles.eyebrow}>
            {total > 1 ? `TROPHÉE ${position} SUR ${total}` : 'NOUVEAU TROPHÉE'}
          </Text>

          <View style={styles.stage}>
            <Animated.View style={[StyleSheet.absoluteFill, crownStyle]} pointerEvents="none">
              <Svg width={BOX} height={BOX}>{rays}</Svg>
            </Animated.View>

            <Animated.View style={[StyleSheet.absoluteFill, medalStyle]}>
              <BadgeMedal
                tier={tier}
                size={BOX}
                ringRatio={RING_RATIO}
                value={threshold}
                glow
              />
            </Animated.View>
          </View>

          <Animated.View entering={FadeIn.delay(220).duration(320)}>
            <Text style={[styles.tier, { color: palette.hi }]}>{tierLabel}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.dot, { backgroundColor: timer.color }]} />
              <Text style={styles.mode}>{timer.name}</Text>
            </View>
            <Text style={styles.detail}>{threshold} séances terminées</Text>
          </Animated.View>

          <PressTap
            onPress={() => {
              haptic.light();
              close();
            }}
            style={[styles.cta, { backgroundColor: palette.hi }]}
          >
            <Text style={styles.ctaText}>
              {total > 1 && position < total ? 'TROPHÉE SUIVANT' : 'CONTINUER'}
            </Text>
          </PressTap>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 4,
  },
  stage: {
    width: BOX,
    height: BOX,
    alignSelf: 'center',
    marginVertical: 6,
  },
  tier: {
    fontFamily: fonts.display,
    fontSize: 40,
    letterSpacing: 1.5,
    textAlign: 'center',
    includeFontPadding: false,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 8,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  mode: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 13,
    letterSpacing: 1.6,
    color: '#FFFFFF',
  },
  detail: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.52)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  cta: {
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 13,
    letterSpacing: 1.6,
    color: '#0A0A0A',
  },
});
