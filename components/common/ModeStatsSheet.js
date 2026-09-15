import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import PressTap from './PressTap';
import HowToSheet from './HowToSheet';
import { fonts } from '../../lib/fonts';
import { getBadgeProgress } from '../../lib/badges';
import { D, easeImpact, springSheet } from '../../lib/animations';

const MODE_EMOJI = { amrap: '🔥', basic: '⏱️', emom: '⚡', tabata: '⏲️', mix: '🔀' };

const MODE_TAGLINE = {
  amrap: 'Enchaîne les tours, à fond',
  basic: 'Travail libre, ton rythme',
  emom: 'Un effort à chaque minute',
  tabata: 'Intervalles courts, intensité max',
  mix: 'Constructeur de circuits',
};

// Couleur fixe (pas timer.color) pour rester reconnaissable pareil sur les 5
// modes — un ton neutre, pas de rouge (jugé "pas beau" par l'utilisateur sur
// le fond blanc du bouton).
const HOWTO_COLOR = '#0A0A0A';

// Intensité du flou de fond (0-100). Monte-la si tu veux plus de flou —
// au-delà de ~35-40 le dégradé (sans dithering, voir GrainOverlay.js) peut
// recommencer à montrer du banding visible.
const BLUR_INTENSITY = 20;

const TIER_COLORS = {
  bronze: { bg: 'rgba(205,127,50,0.55)', border: 'rgba(232,168,99,0.7)', emoji: '🥉' },
  argent: { bg: 'rgba(196,201,209,0.55)', border: 'rgba(228,231,236,0.7)', emoji: '🥈' },
  or: { bg: 'rgba(240,201,84,0.55)', border: 'rgba(247,215,120,0.7)', emoji: '🥇' },
};

/**
 * Panneau stats/badges (appui long sur le cercle central de Home). Reprend
 * exactement la structure de PickerSheet (app/home.js) — feuille qui remonte
 * du bas, translateY + Pressable flex:1 au-dessus — plutôt qu'une carte
 * centrée en position absolute+padding, qui a produit plusieurs bugs de
 * rendu différents selon les appareils. Pas de BlurView : GrainOverlay
 * (anti-banding du dégradé de fond) est un stub désactivé dans ce projet,
 * flouter par-dessus exposerait le banding au lieu de l'adoucir.
 */
export default function ModeStatsSheet({ timer, stats, screenH, blurTargetRef, onClose }) {
  const translateY = useSharedValue(screenH);
  const backdropOpacity = useSharedValue(0);
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: D.big, easing: easeImpact });
    translateY.value = withSpring(0, springSheet);

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, []);

  const handleClose = () => {
    backdropOpacity.value = withTiming(0, { duration: D.base });
    translateY.value = withTiming(screenH, { duration: D.base, easing: easeImpact }, (done) => {
      if (done) runOnJS(onClose)();
    });
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const { count, timeLabel } = stats;
  const { tiers, nextTier, progressPct } = getBadgeProgress(timer.id, count);
  const overlayTint = timer.bgColors[2] + '80';
  const sheetTint = timer.bgColors[1] + 'E6';

  return (
    <View style={styles.sheetRoot}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        {/* Intensité volontairement basse (BLUR_INTENSITY plus bas) : un blur
            trop fort sur un dégradé sans dithering (GrainOverlay désactivé,
            voir components/common/GrainOverlay.js) fait ressortir du banding.
            blurTarget/blurMethod obligatoires sur Android sinon expo-blur ne
            floute pas réellement le contenu — même config que l'overlay de
            lancement dans app/home.js. */}
        <BlurView
          blurTarget={blurTargetRef}
          intensity={BLUR_INTENSITY}
          tint="dark"
          blurMethod="dimezisBlurView"
          blurReductionFactor={4}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayTint }]} />
      </Animated.View>
      <Pressable style={styles.sheetTap} onPress={handleClose} />

      <Animated.View style={[styles.sheet, sheetStyle, { backgroundColor: sheetTint }]}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Text style={styles.iconEmoji}>{MODE_EMOJI[timer.id] || '🏅'}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{timer.name}</Text>
            <Text style={styles.subtitle}>{MODE_TAGLINE[timer.id] || timer.full}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={styles.statLabelRow}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statLabel}>SÉANCES</Text>
            </View>
            <Text style={styles.statValue}>{count}</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statLabelRow}>
              <Text style={styles.statEmoji}>🕐</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
            <Text style={styles.statValue}>{timeLabel}</Text>
          </View>
        </View>

        <View style={styles.medalsRow}>
          {tiers.map((tier) => (
            <Medal key={tier.key} tier={tier} />
          ))}
        </View>

        {nextTier ? (
          <View style={styles.progressBox}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>PROCHAIN : {nextTier.label}</Text>
              <Text style={styles.progressCount}>{count} / {nextTier.threshold}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progressPct * 100)}%`,
                    backgroundColor: TIER_COLORS[nextTier.key].border,
                  },
                ]}
              />
            </View>
          </View>
        ) : (
          <Text style={styles.allDone}>TOUS LES BADGES DÉBLOQUÉS 🏆</Text>
        )}

        <View style={styles.ctaShadowWrap}>
          <PressTap
            onPress={() => setShowHowTo(true)}
            tapScale={0.97}
            style={styles.cta}
          >
            <Text style={styles.ctaEmoji}>🙂</Text>
            <Text style={[styles.ctaText, { color: HOWTO_COLOR }]}>
              Comment ça marche ?
            </Text>
          </PressTap>
        </View>
      </Animated.View>

      {showHowTo && (
        <HowToSheet
          timer={timer}
          screenH={screenH}
          onClose={() => setShowHowTo(false)}
        />
      )}
    </View>
  );
}

function Medal({ tier }) {
  const palette = TIER_COLORS[tier.key];

  if (!tier.unlocked) {
    return (
      <View style={styles.medalItem}>
        <View style={[styles.medalCircle, styles.medalLocked]}>
          <Text style={styles.medalLockEmoji}>🔒</Text>
        </View>
        <Text style={[styles.medalLabel, styles.medalLabelLocked]}>{tier.label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.medalItem}>
      <View
        style={[
          styles.medalCircle,
          { backgroundColor: palette.bg, borderColor: palette.border },
        ]}
      >
        <Text style={styles.medalEmoji}>{palette.emoji}</Text>
      </View>
      <Text style={styles.medalLabel}>{tier.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetRoot: {
    ...StyleSheet.absoluteFill,
    zIndex: 85,
    justifyContent: 'flex-end',
  },
  sheetTap: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
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
    gap: 12,
    marginBottom: 18,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 19 },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    letterSpacing: 0.5,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    padding: 12,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  statEmoji: { fontSize: 11 },
  statLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.75)',
  },
  statValue: {
    fontFamily: fonts.monoBold,
    fontSize: 22,
    color: '#FFFFFF',
  },

  medalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 18,
  },
  medalItem: { alignItems: 'center' },
  medalCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalLocked: {
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  medalEmoji: { fontSize: 24 },
  medalLockEmoji: { fontSize: 20, opacity: 0.5 },
  medalLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
    color: '#FFFFFF',
    marginTop: 6,
  },
  medalLabelLocked: {
    color: 'rgba(255,255,255,0.5)',
  },

  progressBox: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.8)',
  },
  progressCount: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  allDone: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 18,
  },

  ctaShadowWrap: {
    borderRadius: 999,
  },
  cta: {
    height: 52,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaEmoji: {
    fontSize: 14,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
});
