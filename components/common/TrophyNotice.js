import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppIcon from './AppIcon';
import BadgeMedal from './BadgeMedal';
import TrophyMedal from './TrophyMedal';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { BADGE_TIERS } from '../../lib/badges';
import { getTrophy, medalLabel } from '../../lib/trophyCatalog';
import {
  clearTrophyNotices,
  onTrophyNotices,
  peekTrophyNotice,
  shiftTrophyNotice,
  trophyNoticeCount,
} from '../../lib/trophyNotices';

// Notification de trophée : une petite carte en haut de l'écran (même charte que le reste de l'app),
// qu'on BALAYE pour la fermer (de côté ou vers le haut), ou qu'on ferme avec la croix ; « Voir »
// ouvre la page Trophées. Elle remplace la grande annonce plein écran pour les trophées du
// quotidien (les 5 trophées de mode gardent celle de la fin de séance). Montée une seule fois à la
// racine (app/_layout.js) ; les trophées arrivent par lib/trophyNotices.js.
//
// Jamais pendant un effort (chrono, décompte), l'introduction ou un bilan : elle attend.
const HIDDEN_ROUTES = new Set([
  '/', '/index', '/onboarding', '/tutorial', '/season-recap', '/countdown', '/running', '/trophies',
]);
const SHOW_DELAY_MS = 450;
const AUTO_HIDE_MS = 7000;
const OFFSCREEN = 420;

export default function TrophyNotice() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(null);
  const [tick, setTick] = useState(0);
  const [, setCount] = useState(0);

  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const touchingRef = useRef(false);
  const dismissingRef = useRef(false);

  useEffect(
    () =>
      onTrophyNotices(() => {
        setTick((t) => t + 1);
        setCount(trophyNoticeCount());
      }),
    []
  );

  // Montre la première carte en attente, quand l'écran s'y prête.
  const hidden = HIDDEN_ROUTES.has(pathname);
  useEffect(() => {
    if (current || hidden || !peekTrophyNotice()) return undefined;
    const t = setTimeout(() => {
      const next = peekTrophyNotice();
      if (next) setCurrent(next);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [tick, current, hidden]);

  // Arrivée de la carte.
  useEffect(() => {
    if (!current) return;
    dismissingRef.current = false;
    x.setValue(0);
    y.setValue(-160);
    opacity.setValue(0);
    haptic.success();
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180, mass: 0.9 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [current, x, y, opacity]);

  // Sortie : la carte part, puis la suivante (s'il y en a) peut venir.
  const finish = useCallback(() => {
    shiftTrophyNotice();
    setCurrent(null);
  }, []);
  const dismiss = useCallback(
    (direction = 'up') => {
      if (dismissingRef.current) return;
      dismissingRef.current = true;
      const anim =
        direction === 'up'
          ? Animated.timing(y, { toValue: -OFFSCREEN, duration: 200, useNativeDriver: true })
          : Animated.timing(x, { toValue: direction === 'left' ? -OFFSCREEN : OFFSCREEN, duration: 200, useNativeDriver: true });
      Animated.parallel([anim, Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true })]).start(finish);
    },
    [x, y, opacity, finish]
  );
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  // Disparaît tout seul au bout de quelques secondes (pas pendant qu'on la touche).
  useEffect(() => {
    if (!current) return undefined;
    let timer;
    const arm = (ms) => {
      timer = setTimeout(() => {
        if (touchingRef.current) arm(2000);
        else dismissRef.current('up');
      }, ms);
    };
    arm(AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [current]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || g.dy < -8,
      onPanResponderGrant: () => {
        touchingRef.current = true;
      },
      onPanResponderMove: (_, g) => {
        x.setValue(g.dx);
        y.setValue(Math.min(0, g.dy));
      },
      onPanResponderRelease: (_, g) => {
        touchingRef.current = false;
        if (Math.abs(g.dx) > 90 || Math.abs(g.vx) > 0.8) dismissRef.current(g.dx < 0 ? 'left' : 'right');
        else if (g.dy < -35 || g.vy < -0.8) dismissRef.current('up');
        else Animated.parallel([
          Animated.spring(x, { toValue: 0, useNativeDriver: true }),
          Animated.spring(y, { toValue: 0, useNativeDriver: true }),
        ]).start();
      },
      onPanResponderTerminate: () => {
        touchingRef.current = false;
        Animated.parallel([
          Animated.spring(x, { toValue: 0, useNativeDriver: true }),
          Animated.spring(y, { toValue: 0, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  if (!current || hidden) return null;
  const def = getTrophy(current.id);
  if (!def) return null;

  const isTier = def.kind === 'tier' && current.tier !== 'done';
  const tierIndex = Math.max(0, BADGE_TIERS.findIndex((t) => t.key === current.tier));
  const tierWord = isTier ? BADGE_TIERS[tierIndex].label.charAt(0) + BADGE_TIERS[tierIndex].label.slice(1).toLowerCase() : '';
  const extra = Math.max(0, trophyNoticeCount() - 1);

  const onSee = () => {
    haptic.light();
    clearTrophyNotices();
    setCurrent(null);
    router.push('/trophies');
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Animated.View
        {...pan.panHandlers}
        style={[styles.card, { opacity, transform: [{ translateX: x }, { translateY: y }] }]}
        accessibilityRole="alert"
        accessibilityLabel={`Nouveau trophée : ${def.name}`}
      >
        {isTier ? (
          <BadgeMedal tier={current.tier} size={46} value={medalLabel(def, tierIndex)} />
        ) : (
          <TrophyMedal kind={def.kind} size={46} icon={def.icon} colors={def.colors || ['#FFFFFF']} revealed />
        )}
        <View style={styles.texts}>
          <Text style={styles.kicker} numberOfLines={1}>
            {extra > 0 ? `NOUVEAU TROPHÉE · +${extra}` : 'NOUVEAU TROPHÉE'}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {def.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {isTier ? tierWord : def.desc}
          </Text>
        </View>
        <Pressable onPress={onSee} style={styles.see} accessibilityRole="button" accessibilityLabel="Voir les trophées">
          <Text style={styles.seeText}>Voir</Text>
        </Pressable>
        <Pressable
          onPress={() => dismiss('up')}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <AppIcon name="close" size={14} opacity={0.7} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 500,
    elevation: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: 22,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    boxShadow: '0 10px 28px rgba(0,0,0,0.6)',
  },
  texts: { flex: 1, minWidth: 0 },
  kicker: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.5)',
  },
  name: { fontFamily: fonts.sansExtraBold, fontSize: 15, color: '#FFFFFF', marginTop: 1 },
  sub: { fontFamily: fonts.sansMedium, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  see: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  seeText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#FFFFFF' },
  close: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
