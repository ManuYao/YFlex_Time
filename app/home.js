import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView, BlurTargetView } from 'expo-blur';
import Svg, { Path, Circle, Polyline, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeOut,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import TickRing from '../components/common/TickRing';
import WheelPicker from '../components/common/WheelPicker';
import PressTap from '../components/common/PressTap';
import ModeStatsSheet from '../components/common/ModeStatsSheet';
import UpdateSheet from '../components/common/UpdateSheet';
import { getTimerHero, getTimerDescription } from '../lib/timers-config';
import { formatValue } from '../lib/formatters';
import { getTokens } from '../lib/tokens';
import { fonts } from '../lib/fonts';
import { useTimers } from '../contexts/TimersContext';
import { useHaptic } from '../hooks/useHaptic';
import { useTimerHeat } from '../hooks/useTimerHeat';
import { useLongPress } from '../hooks/useLongPress';
import { useCooldown } from '../hooks/useCooldown';
import { usePremium } from '../hooks/usePremium';
import { useSwipeTriggeredUpdate } from '../hooks/useSwipeTriggeredUpdate';
import { FREE_USES_PER_DAY } from '../lib/cooldown';
import {
  D,
  easeImpact,
  easeOvershoot,
  easeInOut,
  popIn,
  popOut,
  slideInX,
  slideInY,
  slideOutY,
  spring,
  springBouncy,
  springSheet,
} from '../lib/animations';

// Dimensions.get n'est lu qu'une fois, comme valeur de depart pour rootW/rootH
// ci-dessous : la source de verite reactive est l'onLayout de la racine (Q9).
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const MORPH_R_INIT = 18;
const MORPH_W_FINAL = 340;
const MORPH_H_FINAL = 340;
const MORPH_R_FINAL = 170;

const LAUNCH_TOTAL_MS = 2400;

// Badge streak (F) — à partir de ce nombre de lancements sur 7 jours
// glissants, la carte affiche 🔥 + compteur. Voir lib/history.js.
const STREAK_THRESHOLD = 3;

// Appui long sur le cercle central — ouvre le panneau stats/badges (T).
const STATS_HOLD_MS = 1500;
const HOLD_RING_RADIUS = 156;
const HOLD_RING_STROKE = 4;
const HOLD_RING_CIRCUMFERENCE = 2 * Math.PI * HOLD_RING_RADIUS;

// Hoisté hors du composant : identité stable, évite de faire recalculer
// keyExtractor par le FlatList à chaque render de Home. getItemLayout dépend
// de rootW (largeur réellement mesurée) donc reste dans le composant (Q9).
const keyExtractor = (item) => item.id;

export default function Home() {
  // Taille reelle de la racine : SCREEN_W/H (Dimensions window) ne correspond
  // pas forcement a la zone qu'occupe l'app (barres systeme, overlay Expo Go,
  // fenetre redimensionnee en split-screen/tablette pliable...). onLayout se
  // redeclenche a chaque resize, donc rootW/rootH restent justes en continu.
  const [rootH, setRootH] = useState(SCREEN_H);
  const [rootW, setRootW] = useState(SCREEN_W);
  const router = useRouter();
  const haptic = useHaptic();
  const flatListRef = useRef(null);
  const blurTargetRef = useRef(null);
  const ctaRef = useRef(null);
  const [ctaRect, setCtaRect] = useState(null);
  const { timers, updateStat, hydrated } = useTimers();
  const { heatMap, statsMap } = useTimerHeat();
  const { getStatus: getCooldownStatusRaw, registerLaunch } = useCooldown();
  const { isPremium } = usePremium();
  // Premium débloque tout, sans jamais toucher au calcul de quota/lockout
  // lui-même (lib/cooldown.js reste ignorant de Premium) — le bypass se fait
  // uniquement ici, au point d'usage.
  const getCooldownStatus = useCallback(
    (timerId) => {
      if (isPremium) {
        return { limited: false, isLocked: false, remaining: Infinity, usesToday: 0, lockoutLevel: 0, lockedUntil: null };
      }
      return getCooldownStatusRaw(timerId);
    },
    [isPremium, getCooldownStatusRaw]
  );
  const { lastTimerId } = useLocalSearchParams();
  const initialIndex = (() => {
    if (!lastTimerId) return 0;
    const i = timers.findIndex((t) => t.id === lastTimerId);
    return i >= 0 ? i : 0;
  })();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [picker, setPicker] = useState(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const activeIndexRef = useRef(initialIndex);
  const updateSheet = useSwipeTriggeredUpdate();

  const active = timers[activeIndex];
  const activeHeat = heatMap[active.id] || 0;
  const t = getTokens(active.textMode);
  const activeCooldown = getCooldownStatus(active.id);
  // TopBar/BottomBar doivent s'effacer aussi bien pendant le morph de
  // lancement que pendant que le panneau stats/badges est ouvert — sinon le
  // CTA "Lancer X" de la BottomBar reste visible en double sous le panneau.
  const hideChrome = isLaunching || statsOpen;

  // Effet de bord (haptique) dans le corps de la fonction, pas dans
  // l'updater passé à setActiveIndex : un setState appelé depuis l'intérieur
  // d'un autre updater peut être ignoré par React sans avertissement
  // visible. La ref remplace la comparaison "prev" pour garder ce callback
  // stable (pas de dépendance sur activeIndex).
  const handleMomentumEnd = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / rootW);
    if (index === activeIndexRef.current) return;
    activeIndexRef.current = index;
    haptic.selection();
    setActiveIndex(index);
    updateSheet.registerSwipe();
  }, [haptic, rootW, updateSheet.registerSwipe]);

  // getItemLayout doit annoncer au FlatList la meme largeur que celle
  // reellement rendue par chaque carte (styles.card, override par rootW plus
  // bas) — sinon le paging desynchronise des que l'ecran ne fait pas la
  // largeur devinee au chargement du module.
  const getItemLayout = useCallback((_, i) => ({
    length: rootW,
    offset: rootW * i,
    index: i,
  }), [rootW]);

  const handleLaunch = useCallback((sourceRect) => {
    // Éditer un mix vide n'est pas un "lancement" — toujours autorisé même
    // si MIX est en cooldown, sinon l'utilisateur ne pourrait plus du tout
    // construire son circuit pendant le verrou.
    if (active.id === 'mix' && (!active._mix || active._mix.blocks.length === 0)) {
      haptic.light();
      router.push('/mix-builder');
      return;
    }
    // Verrou cooldown (TABATA/MIX uniquement, voir lib/cooldown.js).
    if (getCooldownStatus(active.id).isLocked) {
      haptic.warning();
      router.push('/premium');
      return;
    }
    haptic.medium();
    // Le lancement est autorisé : on consomme un usage du quota du jour
    // maintenant (pas à la fin de la séance) — c'est la tentative de lancer
    // qui compte comme "utilisation", pas la complétion. Si Premium, on ne
    // touche même pas au compteur : pas de rattrapage surprise si l'usager
    // désactive Premium plus tard (mode test).
    if (!isPremium) registerLaunch(active.id);
    // sourceRect : fourni quand le lancement vient d'un autre bouton que le
    // CTA du bas (ex. le panneau stats/badges) — évite que le morph parte
    // toujours du bouton de la BottomBar alors que l'utilisateur a tapé
    // ailleurs à l'écran.
    if (sourceRect) {
      setCtaRect(sourceRect);
      setIsLaunching(true);
      return;
    }
    // Mesure la position ecran reelle du bouton CTA au moment du tap, plutot
    // que de deviner un offset fixe (ex-MORPH_BOTTOM_OFFSET) : reste juste
    // quelle que soit la taille d'ecran ou la mise en page du bouton.
    ctaRef.current?.measureInWindow((x, y, width, height) => {
      setCtaRect({ x, y, width, height });
      setIsLaunching(true);
    });
  }, [active, haptic, router, getCooldownStatus, registerLaunch, isPremium]);

  const handleMorphComplete = useCallback(() => {
    router.replace({ pathname: '/countdown', params: { timerId: active.id } });
  }, [router, active]);

  const handleMixEdit = useCallback(() => {
    haptic.light();
    router.push('/mix-builder');
  }, [haptic, router]);

  const handleDotPress = useCallback((index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  const handleStatPress = useCallback((timerId, statKey) => {
    haptic.light();
    setPicker({ timerId, statKey });
  }, [haptic]);

  const handleOpenStats = useCallback(() => {
    setStatsOpen(true);
  }, []);

  const handleGoPremium = useCallback(() => {
    haptic.light();
    router.push('/premium');
  }, [haptic, router]);

  const handleValidate = useCallback((newValue) => {
    setPicker((prevPicker) => {
      if (!prevPicker) return prevPicker;
      haptic.medium();
      updateStat(prevPicker.timerId, prevPicker.statKey, newValue);
      return null;
    });
  }, [haptic, updateStat]);

  const pickerTimer = picker ? timers.find((tt) => tt.id === picker.timerId) : null;
  const pickerStat = pickerTimer ? pickerTimer.stats.find((s) => s.key === picker.statKey) : null;

  // Identité stable sauf quand activeIndex (ou la largeur reelle rootW)
  // change réellement : évite qu'un tap qui touche isLaunching/picker/rootH
  // force les 5 TimerCard (60 lignes SVG chacune) à se re-render en plein
  // milieu du geste de l'utilisateur. rootW est inclus car il determine la
  // largeur reelle de chaque carte (paging FlatList) — contrairement a
  // rootH, il ne varie qu'sur un vrai resize (rotation/split-screen), jamais
  // par jitter des barres systeme.
  const renderItem = useCallback(
    ({ item, index }) => (
      <TimerCard
        timer={item}
        isActive={index === activeIndex}
        cardWidth={rootW}
        heatCount={heatMap[item.id] || 0}
        cooldown={getCooldownStatus(item.id)}
        onStatPress={handleStatPress}
        onMixEdit={handleMixEdit}
        onStatHaptic={haptic.light}
        onOpenStats={handleOpenStats}
        onGoPremium={handleGoPremium}
      />
    ),
    [activeIndex, rootW, heatMap, getCooldownStatus, handleStatPress, handleMixEdit, haptic, handleOpenStats, handleGoPremium]
  );

  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  return (
    <View
      style={[styles.root, { backgroundColor: active.bgColors[1] }]}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setRootH((prev) => (prev === h ? prev : h));
        setRootW((prev) => (prev === w ? prev : w));
      }}
    >
      {/* (A) Fond + contenu — regroupés dans une BlurTargetView pour que le
          BlurView Android (dimezisBlurView) ait quelque chose à flouter */}
      <BlurTargetView ref={blurTargetRef} style={styles.root}>
        <CrossfadeBackground
          colors={active.bgColors}
          textMode={active.textMode}
          timerId={active.id}
        />

        {activeHeat >= STREAK_THRESHOLD && (
          <EmberField key={active.id} color={active.color} heatCount={activeHeat} />
        )}

        <SafeAreaView style={styles.safe} edges={['top', 'bottom']} pointerEvents={hideChrome ? 'none' : 'auto'}>
          <TopBar
            tag={active.tag}
            tokens={t}
            onBack={() => router.push('/settings')}
            onMenu={() => {
              haptic.light();
              router.push('/history');
            }}
            onMenuHaptic={haptic.light}
            isLaunching={hideChrome}
          />

          <FlatList
            ref={flatListRef}
            data={timers}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumEnd}
            keyExtractor={keyExtractor}
            initialScrollIndex={initialIndex}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            style={styles.list}
            scrollEnabled={!hideChrome}
          />

          <BottomBar
            ctaRef={ctaRef}
            timers={timers}
            activeIndex={activeIndex}
            active={active}
            tokens={t}
            cooldown={activeCooldown}
            onDotPress={handleDotPress}
            onLaunch={handleLaunch}
            isLaunching={hideChrome}
          />
        </SafeAreaView>
      </BlurTargetView>

      {/* (Q0) Blur backdrop pendant le launch morph */}
      {isLaunching && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <BlurView
            blurTarget={blurTargetRef}
            intensity={60}
            tint="dark"
            blurMethod="dimezisBlurView"
            blurReductionFactor={4}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(0,0,0,0.45)' },
            ]}
          />
        </Animated.View>
      )}

      {/* (Q) Launch morph overlay — ctaRect vient de la mesure reelle du
          bouton au tap (handleLaunch) ; tant qu'elle n'est pas prete on
          n'affiche rien plutot que de deviner une position. */}
      {isLaunching && ctaRect && (
        <LaunchMorph
          active={active}
          onComplete={handleMorphComplete}
          screenH={rootH}
          screenW={rootW}
          ctaRect={ctaRect}
        />
      )}

      {/* (S) Picker modal */}
      {picker && pickerStat && (
        <PickerSheet
          screenH={rootH}
          stat={pickerStat}
          accentColor={pickerTimer.color}
          textMode={pickerTimer.textMode}
          onClose={() => setPicker(null)}
          onValidate={handleValidate}
        />
      )}

      {/* (T) Panneau stats/badges — ⋮ de la TopBar */}
      {statsOpen && (
        <ModeStatsSheet
          timer={active}
          stats={statsMap[active.id] || { count: 0, totalSeconds: 0, timeLabel: '0min' }}
          screenH={rootH}
          blurTargetRef={blurTargetRef}
          onClose={() => setStatsOpen(false)}
        />
      )}

      {/* (U) Feuille "Nouvelle version" — déclenchée après quelques swipes
          du carrousel, voir hooks/useSwipeTriggeredUpdate.js */}
      {updateSheet.visible && (
        <UpdateSheet
          screenH={rootH}
          mode="pending"
          onRestart={updateSheet.restart}
          onClose={updateSheet.dismiss}
        />
      )}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
   (A) CrossfadeBackground — change de gradient en 0.7s easeImpact
   ────────────────────────────────────────────────────────────────*/
function CrossfadeBackground({ colors, textMode, timerId }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View
        key={timerId}
        entering={FadeIn.duration(D.loop).easing(easeImpact)}
        style={StyleSheet.absoluteFill}
      >
        <GradientBackground colors={colors} textMode={textMode} grain>
          <View style={{ flex: 1 }} />
        </GradientBackground>
      </Animated.View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
   EmberField/Ember — braises ambiantes sur tout le fond, dès
   STREAK_THRESHOLD lancements sur 7 jours glissants (remplace
   StreakHalo, disque plat sans falloff). Chaque braise est un vrai
   dégradé radial SVG (opaque au centre → transparent au bord) porté
   par une Animated.View qui anime translateY/opacity/scale — seule
   la View wrapper anime à chaque frame, le contenu SVG reste statique
   (pas de useAnimatedProps), donc le coût est du même ordre que
   Confetti.js. Densité + vitesse croissent avec heatCount, plafonnées
   à EMBER_MAX_HEAT (comme l'ancien HALO_MAX_HEAT). Monté une seule
   fois au niveau écran (pas par carte) : pas besoin de gymnastique
   isActive, monter = démarrer, démonter = cancelAnimation partout.
   ────────────────────────────────────────────────────────────────*/
const EMBER_MAX_HEAT = 9;
const EMBER_COUNT_MIN = 6;
const EMBER_COUNT_MAX = 16;
const EMBER_SIZE_MIN = 22;
const EMBER_SIZE_MAX = 58;
const EMBER_DRIFT_MIN = 50;
const EMBER_DRIFT_MAX = 130;
const EMBER_DURATION_MAX = 7000;
const EMBER_DURATION_MIN = 3600;
const EMBER_OPACITY_MIN = 0.28;
const EMBER_OPACITY_MAX = 0.6;

function EmberField({ color, heatCount }) {
  const intensity = Math.min(
    Math.max(heatCount - STREAK_THRESHOLD, 0) / (EMBER_MAX_HEAT - STREAK_THRESHOLD),
    1
  );
  const count = Math.round(EMBER_COUNT_MIN + intensity * (EMBER_COUNT_MAX - EMBER_COUNT_MIN));
  const baseDuration = EMBER_DURATION_MAX - intensity * (EMBER_DURATION_MAX - EMBER_DURATION_MIN);

  const embers = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const duration = baseDuration * (0.82 + Math.random() * 0.36);
        return {
          id: i,
          xPct: Math.random() * 100,
          yPct: Math.random() * 100,
          size: EMBER_SIZE_MIN + Math.random() * (EMBER_SIZE_MAX - EMBER_SIZE_MIN),
          drift: EMBER_DRIFT_MIN + Math.random() * (EMBER_DRIFT_MAX - EMBER_DRIFT_MIN),
          duration,
          delay: Math.random() * duration,
          peakOpacity: EMBER_OPACITY_MIN + Math.random() * (EMBER_OPACITY_MAX - EMBER_OPACITY_MIN),
        };
      }),
    [count, baseDuration]
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {embers.map((e) => (
        <Ember key={e.id} {...e} color={color} />
      ))}
    </View>
  );
}

function Ember({ id, xPct, yPct, size, drift, duration, delay, peakOpacity, color }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(withTiming(-drift, { duration, easing: easeInOut }), -1, false)
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(peakOpacity, { duration: duration * 0.35, easing: easeInOut }),
          withTiming(peakOpacity, { duration: duration * 0.3, easing: easeInOut }),
          withTiming(0, { duration: duration * 0.35, easing: easeInOut })
        ),
        -1,
        false
      )
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration * 0.35, easing: easeInOut }),
          withTiming(1, { duration: duration * 0.3, easing: easeInOut }),
          withTiming(0.82, { duration: duration * 0.35, easing: easeInOut })
        ),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [delay, duration, drift, peakOpacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.ember,
        {
          left: `${xPct}%`,
          top: `${yPct}%`,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        },
        animStyle,
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`ember-glow-${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="0.85" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#ember-glow-${id})`} />
      </Svg>
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────────────────────────
   (B+C) Top bar — status + tag central + boutons ronds
   ────────────────────────────────────────────────────────────────*/
function TopBar({ tag, tokens, onBack, onMenu, onMenuHaptic, isLaunching }) {
  const dotPulse = useSharedValue(0.4);
  useEffect(() => {
    dotPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: easeInOut }),
        withTiming(0.4, { duration: 1000, easing: easeInOut })
      ),
      -1,
      false
    );
    return () => cancelAnimation(dotPulse);
  }, []);
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotPulse.value }));

  if (isLaunching) return null;

  return (
    <>
      {/* (B) Status bar */}
      <Animated.View
        entering={slideInY(-20, D.slow, 0)}
        style={styles.statusBar}
      >
        <View style={styles.statusRight}>
          <Animated.View
            style={[styles.statusDot, { backgroundColor: tokens.secondary }, dotStyle]}
          />
          <Text style={[styles.statusText, { color: tokens.tertiary }]}>FLEX TIMER</Text>
        </View>
      </Animated.View>

      {/* (C) Top bar avec tag central animé */}
      <Animated.View
        entering={slideInY(-30, D.slow, 100)}
        style={styles.topBar}
      >
        <PressTap
          onPress={onMenu}
          tapScale={0.88}
          onHapticIn={onMenuHaptic}
          style={[styles.iconBtn, { borderColor: tokens.btnBorder }]}
          hitSlop={8}
          accessibilityLabel="Historique"
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={10} stroke={tokens.primary} strokeWidth={2} />
            <Polyline
              points="12 6 12 12 16 14"
              stroke={tokens.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </PressTap>

        <Animated.Text
          key={tag}
          entering={slideInY(8, D.medium, 0)}
          exiting={slideOutY(-8, D.base)}
          style={[styles.tag, { color: tokens.secondary }]}
        >
          {tag}
        </Animated.Text>

        <PressTap
          onPress={onBack}
          tapScale={0.88}
          onHapticIn={onMenuHaptic}
          style={[styles.iconBtn, { borderColor: tokens.btnBorder }]}
          hitSlop={8}
          accessibilityLabel="Réglages"
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 15a3 3 0 100-6 3 3 0 000 6z"
              stroke={tokens.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
              stroke={tokens.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </PressTap>
      </Animated.View>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TimerCard — orchestration des animations sur isActive
   ────────────────────────────────────────────────────────────────*/
const TimerCard = React.memo(function TimerCard({ timer, isActive, cardWidth, heatCount, cooldown, onStatPress, onMixEdit, onStatHaptic, onOpenStats, onGoPremium }) {
  const t = getTokens(timer.textMode);
  const hero = getTimerHero(timer);
  const description = getTimerDescription(timer);
  const heroFontSize = hero.number.length > 3 ? 110 : 140;
  const isMix = timer.id === 'mix';
  const { isPressing, progress, start, cancel } = useLongPress(onOpenStats, STATS_HOLD_MS);

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      {/* (E) Description */}
      {isActive ? (
        <Animated.Text
          key={`full-${timer.id}`}
          entering={slideInY(10, D.big, 100)}
          exiting={slideOutY(-10, D.base)}
          style={[styles.description, { color: t.tertiary }]}
        >
          {description}
        </Animated.Text>
      ) : (
        <Text style={[styles.description, { color: t.tertiary }]}>{description}</Text>
      )}

      {/* (F+G) TickRing breathing + draw stagger + (T) appui long → stats */}
      <View style={[styles.ringOuter, cooldown?.isLocked && styles.ringOuterLocked]}>
      <Pressable
        onPressIn={isActive ? start : undefined}
        onPressOut={isActive ? cancel : undefined}
        onPress={isActive && cooldown?.isLocked ? onGoPremium : undefined}
        disabled={!isActive}
        hitSlop={4}
      >
      <BreathingRing isActive={isActive} t={t} timerId={timer.id}>
        <View style={styles.ringCenter} pointerEvents="none">
          {/* (H) Hero unit */}
          {isActive && (
            <Animated.Text
              key={`unit-${timer.id}-${hero.unit}`}
              entering={slideInY(6, D.base, 200)}
              exiting={slideOutY(-6, 200)}
              style={[styles.heroUnit, { color: t.tertiary }]}
            >
              {hero.unit}
            </Animated.Text>
          )}
          {!isActive && (
            <Text style={[styles.heroUnit, { color: t.tertiary }]}>{hero.unit}</Text>
          )}

          {/* (I) Hero number — pop avec overshoot */}
          {isActive && (
            <Animated.Text
              key={`big-${timer.id}-${hero.number}`}
              entering={popIn(0.3, D.slow, 0)}
              exiting={popOut(1.4, D.base)}
              style={[
                styles.heroNumber,
                { color: t.primary, fontSize: heroFontSize, lineHeight: heroFontSize },
              ]}
            >
              {hero.number}
            </Animated.Text>
          )}
          {!isActive && (
            <Text
              style={[
                styles.heroNumber,
                { color: t.primary, fontSize: heroFontSize, lineHeight: heroFontSize },
              ]}
            >
              {hero.number}
            </Text>
          )}

          {/* (J) Timer name */}
          {isActive && (
            <Animated.Text
              key={`name-${timer.id}`}
              entering={slideInY(12, D.big, 300)}
              exiting={slideOutY(-12, D.base)}
              style={[styles.timerName, { color: t.primary }]}
            >
              {timer.name}
            </Animated.Text>
          )}
          {!isActive && (
            <Text style={[styles.timerName, { color: t.primary }]}>{timer.name}</Text>
          )}
        </View>
      </BreathingRing>
      </Pressable>
      {isActive && isPressing && (
        <View style={styles.holdOverlay} pointerEvents="none">
          <Svg width={320} height={320} viewBox="0 0 320 320">
            <Circle
              cx={160}
              cy={160}
              r={HOLD_RING_RADIUS}
              stroke={t.ringActive}
              strokeWidth={HOLD_RING_STROKE}
              opacity={0.9}
              fill="none"
              strokeDasharray={HOLD_RING_CIRCUMFERENCE}
              strokeDashoffset={HOLD_RING_CIRCUMFERENCE * (1 - progress)}
              strokeLinecap="round"
              transform="rotate(-90 160 160)"
            />
          </Svg>
        </View>
      )}
      {heatCount >= STREAK_THRESHOLD && (
        <StreakBadge heatCount={heatCount} isActive={isActive} t={t} timerId={timer.id} />
      )}
      {cooldown?.isLocked && (
        <View style={styles.lockOverlay} pointerEvents="none">
          <Text style={styles.lockEmoji}>👑</Text>
        </View>
      )}
      {cooldown?.isLocked && (
        <Pressable onPress={onGoPremium} style={styles.proBadge} hitSlop={6}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </Pressable>
      )}
      </View>

      {/* (U) Cooldown — pips = usages du jour restants + aperçu du verrou,
          ou bandeau "Premium requis" une fois verrouillé */}
      <CooldownPips cooldown={cooldown} t={t} onGoPremium={onGoPremium} />

      {/* (K) Stats chips avec stagger */}
      <View style={styles.statsRow}>
        {timer.stats.map((stat, k) => {
          const editable = stat.editable;
          const tappable = editable && !isMix;
          const onPress = tappable
            ? () => onStatPress(timer.id, stat.key)
            : isMix
            ? onMixEdit
            : undefined;

          if (isActive) {
            return (
              <Animated.View
                key={`stat-${timer.id}-${stat.key}`}
                entering={popIn(0.9, D.big, 400 + k * 80)}
                exiting={slideOutY(-12, D.base)}
                style={{ flex: 1 }}
              >
                <PressTap
                  disabled={!onPress}
                  onPress={onPress}
                  tapScale={0.94}
                  onHapticIn={tappable || isMix ? onStatHaptic : undefined}
                  style={[
                    styles.statChip,
                    { backgroundColor: t.chipBg, borderColor: t.chipBorder },
                  ]}
                >
                  <StatChipContent stat={stat} t={t} editable={editable || isMix} />
                </PressTap>
              </Animated.View>
            );
          }
          return (
            <View
              key={`stat-${timer.id}-${stat.key}`}
              style={[
                styles.statChip,
                { backgroundColor: t.chipBg, borderColor: t.chipBorder, flex: 1 },
              ]}
            >
              <StatChipContent stat={stat} t={t} editable={editable || isMix} />
            </View>
          );
        })}
      </View>

      {/* (L) Phases */}
      {isActive ? (
        <>
          <Animated.Text
            key={`phases-label-${timer.id}`}
            entering={FadeIn.delay(600).duration(D.base)}
            exiting={FadeOut.duration(D.fast)}
            style={[styles.phasesLabel, { color: t.muted }]}
          >
            Déroulé
          </Animated.Text>
          <View style={styles.phasesRow}>
            {timer.phases.map((phase, k) => (
              <Animated.View
                key={`phase-${timer.id}-${k}`}
                entering={slideInX(-20, D.big, 650 + k * 60)}
                exiting={FadeOut.duration(D.fast)}
              >
                <View
                  style={[
                    styles.phaseChip,
                    { backgroundColor: t.chipBg, borderColor: t.chipBorder },
                  ]}
                >
                  <Text style={[styles.phaseText, { color: t.chipText }]}>{phase}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.phasesLabel, { color: t.muted }]}>Déroulé</Text>
          <View style={styles.phasesRow}>
            {timer.phases.map((phase, k) => (
              <View
                key={k}
                style={[
                  styles.phaseChip,
                  { backgroundColor: t.chipBg, borderColor: t.chipBorder },
                ]}
              >
                <Text style={[styles.phaseText, { color: t.chipText }]}>{phase}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
});

/* ─────────────────────────────────────────────────────────────────
   CooldownPips (U) — usages du jour restants pour les modes limités
   (TABATA/MIX, voir lib/cooldown.js). Purement visuel, aucun texte : une
   rangée de pastilles qui se remplissent, plus un cadenas simple une fois
   verrouillé (déjà affiché sur le cadran par lockOverlay).
   ────────────────────────────────────────────────────────────────*/
function CooldownPips({ cooldown, t, onGoPremium }) {
  if (!cooldown?.limited) return null;

  if (cooldown.isLocked) {
    return (
      <PressTap onPress={onGoPremium} tapScale={0.96} style={styles.premiumHint}>
        <Text style={styles.premiumHintEmoji}>👑</Text>
        <Text style={styles.premiumHintText}>DÉBLOQUE AVEC PREMIUM</Text>
      </PressTap>
    );
  }

  return (
    <View style={styles.cooldownRow}>
      {Array.from({ length: FREE_USES_PER_DAY }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.cooldownPip,
            {
              borderColor: t.ringInactive,
              backgroundColor: i < cooldown.usesToday ? t.primary : 'transparent',
            },
          ]}
        />
      ))}
      {/* Aperçu de la conséquence : après ces pastilles, ça se verrouille. */}
      <Text style={styles.cooldownHintEmoji}>👑</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
   StreakBadge — 🔥 + compteur, visible dès STREAK_THRESHOLD lancements
   du timer sur 7 jours glissants (lib/history.js computeHeatCounts)
   ────────────────────────────────────────────────────────────────*/
function StreakBadge({ heatCount, isActive, t, timerId }) {
  const content = (
    <>
      <Text style={styles.streakEmoji}>🔥</Text>
      <Text style={[styles.streakCount, { color: t.chipText }]}>{heatCount}</Text>
    </>
  );

  if (isActive) {
    return (
      <Animated.View
        key={`streak-${timerId}`}
        entering={popIn(0.3, D.slow, 500)}
        exiting={popOut(1.2, D.base)}
        style={[styles.streakBadge, { backgroundColor: t.chipBg, borderColor: t.chipBorder }]}
      >
        {content}
      </Animated.View>
    );
  }
  return (
    <View style={[styles.streakBadge, { backgroundColor: t.chipBg, borderColor: t.chipBorder }]}>
      {content}
    </View>
  );
}

function StatChipContent({ stat, t, editable }) {
  // Les stats de type 'seconds' (REPOS/INTERV./TRAVAIL) passent par
  // formatValue pour rester cohérentes avec la roue de sélection : au-delà
  // de 60, "67" + "s" devient "1 min 07" (voir lib/formatters.js). Les
  // autres types (minutes, rounds, infinite, none, computed) gardent
  // l'affichage brut existant, inchangé.
  const fmt = stat.type === 'seconds' ? formatValue(stat.value, stat.type) : null;
  const displayValue = fmt ? fmt.main : stat.value;
  const displayUnit = fmt ? fmt.unit : stat.unit;

  return (
    <>
      <View style={styles.statLabelRow}>
        <Text style={[styles.statLabel, { color: t.tertiary }]}>{stat.label}</Text>
        {editable && (
          <Svg width={7} height={7} viewBox="0 0 7 7" fill="none">
            <Path
              d="M1 2l2.5 3L6 2"
              stroke={t.tertiary}
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: t.primary }]} numberOfLines={1}>
          {displayValue}
        </Text>
        {!!displayUnit && (
          <Text style={[styles.statUnit, { color: t.tertiary }]}>{displayUnit}</Text>
        )}
      </View>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   (F) Breathing ring — scale [1, 1.008, 1] loop sur card active
   ────────────────────────────────────────────────────────────────*/
function BreathingRing({ isActive, t, timerId, children }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.008, { duration: 1750, easing: easeInOut }),
          withTiming(1, { duration: 1750, easing: easeInOut })
        ),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1, { duration: D.base });
    }
    return () => cancelAnimation(scale);
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.ringWrap, animStyle]}>
      <TickRing
        progress={0.75}
        size={320}
        colorActive={t.ringActive}
        colorInactive={t.ringInactive}
        triggerKey={isActive ? timerId : undefined}
      />
      {children}
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────────────────────────
   (M+N+O) Bottom bar — indicators + CTA + hint
   ────────────────────────────────────────────────────────────────*/
function BottomBar({ ctaRef, timers, activeIndex, active, tokens, cooldown, onDotPress, onLaunch, isLaunching }) {
  const isLocked = !!cooldown?.isLocked;
  const ctaBg = isLocked ? 'rgba(255,255,255,0.14)' : active.color;
  const ctaTextColor = isLocked ? 'rgba(255,255,255,0.6)' : active.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF';

  // (O) Icône ▶ pulse horizontale
  const arrowX = useSharedValue(0);
  useEffect(() => {
    arrowX.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 750, easing: easeInOut }),
        withTiming(0, { duration: 750, easing: easeInOut })
      ),
      -1,
      false
    );
    return () => cancelAnimation(arrowX);
  }, []);
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowX.value }],
  }));

  // (Q7) Bottom bar fade quand isLaunching
  const fade = useSharedValue(1);
  useEffect(() => {
    fade.value = withTiming(isLaunching ? 0 : 1, { duration: D.base });
  }, [isLaunching]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View
      entering={slideInY(80, D.slow, 300)}
      pointerEvents={isLaunching ? 'none' : 'auto'}
    >
      <Animated.View style={[styles.bottomBar, fadeStyle]}>
      {/* (N) Indicators dots */}
      <View style={styles.indicatorRow}>
        {timers.map((timer, i) => (
          <IndicatorDot
            key={timer.id}
            isActive={i === activeIndex}
            tokens={tokens}
            onPress={() => onDotPress(i)}
          />
        ))}
      </View>

      {/* (O) CTA Lancer */}
      {/* L'ombre (elevation) est portee par ce View statique plutot que par
          la vue animee de PressTap : sur Android, une elevation combinee a
          un transform pilote par Reanimated peut se rendre en rectangle
          plein au lieu de suivre borderRadius. */}
      <View ref={ctaRef} style={[styles.ctaShadowWrap, { backgroundColor: ctaBg }, isLocked && styles.ctaShadowWrapLocked]}>
        <PressTap
          onPress={onLaunch}
          tapScale={0.96}
          style={[styles.cta, { backgroundColor: ctaBg }]}
        >
          {isLocked ? (
            <Text style={styles.ctaLockEmoji}>👑</Text>
          ) : (
            <Animated.View style={arrowStyle}>
              <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                <Path d="M3 2l8 5-8 5V2z" fill={ctaTextColor} />
              </Svg>
            </Animated.View>
          )}
          <Animated.Text
            key={`cta-${active.name}`}
            entering={slideInY(10, 250, 0)}
            exiting={slideOutY(-10, 200)}
            style={[styles.ctaText, { color: ctaTextColor }]}
          >
            Lancer {active.name}
          </Animated.Text>
        </PressTap>
      </View>

      <Text style={[styles.hint, { color: tokens.muted }]}>
        ← Glisse ou tape les points →
      </Text>
      </Animated.View>
    </Animated.View>
  );
}

function IndicatorDot({ isActive, tokens, onPress }) {
  const w = useSharedValue(isActive ? 24 : 4);

  useEffect(() => {
    w.value = withSpring(isActive ? 24 : 4, springBouncy);
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    width: w.value,
  }));

  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Animated.View
        style={[
          styles.indicatorDot,
          {
            backgroundColor: isActive ? tokens.primary : tokens.ringInactive,
          },
          animStyle,
        ]}
      />
    </Pressable>
  );
}

/* ─────────────────────────────────────────────────────────────────
   (Q) Launch morph — bouton qui devient cercle + bond + texte hero
   ────────────────────────────────────────────────────────────────*/
function LaunchMorph({ active, onComplete, screenH, screenW, ctaRect }) {
  // Position/taille de depart = mesure reelle du bouton CTA (measureInWindow
  // dans handleLaunch), pas une estimation figee : reste juste quel que soit
  // l'ecran, la densite ou la mise en page du bouton.
  const morphInitTop = ctaRect.y;
  const morphInitLeft = ctaRect.x;
  const morphInitWidth = ctaRect.width;
  const morphInitHeight = ctaRect.height;
  const morphFinalTop = screenH / 2 - MORPH_H_FINAL / 2;
  const morphFinalLeft = screenW / 2 - MORPH_W_FINAL / 2;
  const haloTop = screenH / 2 - 300;
  const haloLeft = screenW / 2 - 300;

  const isDark = active.textMode === 'dark';
  const fgColor = isDark ? '#0A0A0A' : '#FFFFFF';

  const progress = useSharedValue(0);
  const ctaTextOpacity = useSharedValue(1);
  const haloOpacity = useSharedValue(0);
  const haloScale = useSharedValue(0.8);
  const fillScale = useSharedValue(1);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    // (Q1) Morph keyframes — duration 900, times [0, 0.15, 0.75, 1]
    progress.value = withTiming(1, { duration: 900, easing: easeImpact });

    // (Q1) Texte CTA fade out
    ctaTextOpacity.value = withTiming(0, { duration: 250 });

    // (Q2) Halo radial : opacity [0, 0.5, 0.3], scale [0.8, 1.3, 1]
    haloOpacity.value = withSequence(
      withTiming(0.5, { duration: 540, easing: easeImpact }),
      withTiming(0.3, { duration: 360, easing: easeImpact })
    );
    haloScale.value = withSequence(
      withTiming(1.3, { duration: 540, easing: easeImpact }),
      withTiming(1, { duration: 360, easing: easeImpact })
    );

    // (Q8) Remplissage final — le cercle 340x340 grossit jusqu'à couvrir l'écran
    // Le contenu hero (PRÊT/nom/tag/bar) fade out en parallèle.
    const FILL_DELAY = 2000;
    const FILL_DURATION = 400;
    fillScale.value = withDelay(
      FILL_DELAY,
      withTiming(4, { duration: FILL_DURATION, easing: easeImpact })
    );
    contentOpacity.value = withDelay(
      FILL_DELAY,
      withTiming(0, { duration: 250, easing: easeImpact })
    );
    haloOpacity.value = withDelay(
      FILL_DELAY,
      withTiming(0, { duration: FILL_DURATION, easing: easeImpact })
    );

    // Fin de séquence (~2.4s) → navigation par router.replace
    const timer = setTimeout(() => {
      runOnJS(onComplete)();
    }, LAUNCH_TOTAL_MS);
    return () => clearTimeout(timer);
  }, []);

  // Morph style (Q1)
  const morphStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const w = interpolate(
      p,
      [0, 0.15, 0.75, 1],
      [morphInitWidth, morphInitWidth, MORPH_W_FINAL, MORPH_W_FINAL]
    );
    const h = interpolate(
      p,
      [0, 0.15, 0.75, 1],
      [morphInitHeight, morphInitHeight, MORPH_H_FINAL, MORPH_H_FINAL]
    );
    const r = interpolate(
      p,
      [0, 0.15, 0.75, 1],
      [MORPH_R_INIT, MORPH_R_INIT, MORPH_R_FINAL, MORPH_R_FINAL]
    );
    const top = interpolate(
      p,
      [0, 0.15, 0.75, 1],
      [morphInitTop, morphInitTop - 10, morphFinalTop, morphFinalTop]
    );
    const left = interpolate(
      p,
      [0, 0.15, 0.75, 1],
      [morphInitLeft, morphInitLeft, morphFinalLeft, morphFinalLeft]
    );
    const sc = interpolate(p, [0, 0.15, 0.75, 1], [1, 0.96, 1.12, 1]);
    return {
      width: w,
      height: h,
      borderRadius: r,
      top,
      left,
      transform: [{ scale: sc * fillScale.value }],
    };
  });

  const ctaTextStyle = useAnimatedStyle(() => ({
    opacity: ctaTextOpacity.value,
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  const contentStyleAnim = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <View style={styles.morphLayer} pointerEvents="none">
      {/* (Q2) Halo radial */}
      <Animated.View
        style={[
          styles.halo,
          { top: haloTop, left: haloLeft, backgroundColor: active.color + '33' },
          haloStyle,
        ]}
      />

      {/* (Q1) Bouton morph */}
      <Animated.View
        style={[
          styles.morphBox,
          {
            backgroundColor: active.color,
            shadowColor: active.color,
          },
          morphStyle,
        ]}
      >
        <Animated.Text
          style={[
            styles.morphCtaText,
            { color: fgColor },
            ctaTextStyle,
          ]}
          numberOfLines={1}
        >
          Lancer {active.name}
        </Animated.Text>
      </Animated.View>

      {/* (Q3-Q6) Contenu hero centré — fade out pendant Q8 */}
      <Animated.View style={[styles.morphContent, contentStyleAnim]} pointerEvents="none">
        <Animated.Text
          entering={FadeIn.delay(600).duration(450).easing(easeImpact)}
          style={[
            styles.morphPret,
            {
              color: isDark ? 'rgba(10,10,10,0.75)' : 'rgba(255,255,255,0.9)',
            },
          ]}
        >
          PRÊT
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.delay(650).duration(650).easing(easeOvershoot).withInitialValues({
            transform: [{ scale: 0.2 }],
          })}
          style={[
            styles.morphHero,
            { color: fgColor },
          ]}
        >
          {active.name}
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.delay(1050).duration(400).easing(easeImpact).withInitialValues({
            transform: [{ translateY: 20 }],
          })}
          style={[
            styles.morphTag,
            {
              color: isDark ? 'rgba(10,10,10,0.65)' : 'rgba(255,255,255,0.8)',
            },
          ]}
        >
          {active.tag}
        </Animated.Text>

        <Animated.View
          entering={FadeIn.delay(1200).duration(500).easing(easeImpact).withInitialValues({
            transform: [{ scaleX: 0 }],
          })}
          style={[
            styles.morphBar,
            {
              backgroundColor: isDark
                ? 'rgba(10,10,10,0.5)'
                : 'rgba(255,255,255,0.7)',
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
   (S) Picker modal — wheel picker pour stat éditable
   ────────────────────────────────────────────────────────────────*/
function PickerSheet({ stat, accentColor, textMode, onClose, onValidate, screenH }) {
  const [draft, setDraft] = useState(stat.value);
  const ctaText = textMode === 'dark' ? '#0A0A0A' : '#FFFFFF';

  const values = [];
  for (let i = stat.range[0]; i <= stat.range[1]; i++) values.push(i);

  const translateY = useSharedValue(screenH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: D.big, easing: easeImpact });
    translateY.value = withSpring(0, springSheet);
  }, []);

  const handleClose = () => {
    backdropOpacity.value = withTiming(0, { duration: D.base });
    translateY.value = withTiming(screenH, { duration: D.base, easing: easeImpact }, (done) => {
      if (done) runOnJS(onClose)();
    });
  };

  const handleValidate = () => {
    backdropOpacity.value = withTiming(0, { duration: D.base });
    translateY.value = withTiming(screenH, { duration: D.base, easing: easeImpact }, (done) => {
      if (done) runOnJS(onValidate)(draft);
    });
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <View style={styles.sheetRoot}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.sheetDim} />
      </Animated.View>
      <Pressable style={styles.sheetTap} onPress={handleClose} />

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <Animated.View
          entering={FadeIn.delay(100).duration(D.base).easing(easeImpact).withInitialValues({
            transform: [{ scaleX: 0.3 }],
          })}
          style={styles.sheetHandleWrap}
        >
          <View style={styles.sheetHandle} />
        </Animated.View>

        <Animated.View
          entering={slideInY(20, D.slow, 150)}
          style={styles.pickerHeader}
        >
          <Text style={styles.pickerKicker}>MODIFIER</Text>
          <Text style={styles.pickerTitle}>{stat.label}</Text>
        </Animated.View>

        <Animated.View
          entering={popIn(0.9, D.slow, 200)}
          style={styles.pickerWheelWrap}
        >
          <WheelPicker
            values={values}
            selectedValue={stat.value}
            type={stat.type}
            accentColor={accentColor || '#FFFFFF'}
            onChange={(v) => setDraft(v)}
          />
        </Animated.View>

        <Animated.View entering={slideInY(20, D.slow, 300)}>
          <View style={[styles.pickerCtaShadowWrap, { backgroundColor: accentColor || '#FFFFFF' }]}>
          <PressTap
            onPress={handleValidate}
            tapScale={0.97}
            style={[styles.pickerCta, { backgroundColor: accentColor || '#FFFFFF' }]}
          >
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path
                d="M2 7l4 4 6-8"
                stroke={ctaText}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={[styles.pickerCtaText, { color: ctaText }]}>Valider</Text>
          </PressTap>
          </View>
        </Animated.View>

        <Animated.Text
          entering={FadeIn.delay(500).duration(D.base)}
          style={styles.sheetFooter}
        >
          Fais défiler pour choisir
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Styles
   ────────────────────────────────────────────────────────────────*/
const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  list: { flex: 1 },

  // Status bar (B)
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 4,
  },
  statusText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Top bar (C)
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 3.3,
    textTransform: 'uppercase',
  },

  // Card
  card: {
    // width fourni en inline par TimerCard (prop cardWidth = rootW mesuré).
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  description: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 2.75,
    textTransform: 'uppercase',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Ring + hero
  ringOuter: {
    position: 'relative',
  },
  ringOuterLocked: {
    opacity: 0.35,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockEmoji: {
    fontSize: 40,
  },
  proBadge: {
    position: 'absolute',
    top: 8,
    left: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  proBadgeText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.75)',
  },
  cooldownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cooldownPip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  cooldownHintEmoji: {
    fontSize: 12,
    marginLeft: 4,
    opacity: 0.7,
  },
  premiumHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  premiumHintEmoji: {
    fontSize: 13,
  },
  premiumHintText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.85)',
  },
  ember: {
    position: 'absolute',
  },
  ringWrap: {
    width: 320,
    height: 320,
    marginBottom: 24,
  },
  holdOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 320,
    height: 320,
  },
  streakBadge: {
    position: 'absolute',
    top: 8,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  streakEmoji: {
    fontSize: 12,
  },
  streakCount: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroUnit: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 3.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroNumber: {
    fontFamily: fonts.display,
    letterSpacing: -5,
    includeFontPadding: false,
    textAlign: 'center',
  },
  timerName: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    letterSpacing: -0.44,
    marginTop: 8,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 320,
    gap: 8,
    marginBottom: 24,
  },
  statChip: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontFamily: fonts.monoBold,
    fontSize: 15,
  },
  statUnit: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    marginLeft: 2,
  },

  // Phases
  phasesLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 9,
    letterSpacing: 2.25,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  phasesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    maxWidth: 320,
  },
  phaseChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  phaseText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    paddingTop: 8,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
    height: 12,
  },
  indicatorDot: {
    height: 4,
    borderRadius: 2,
  },
  cta: {
    height: 56,
    borderRadius: MORPH_R_INIT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaShadowWrap: {
    borderRadius: MORPH_R_INIT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaShadowWrapLocked: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaLockEmoji: {
    fontSize: 15,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    letterSpacing: -0.15,
  },
  hint: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 12,
  },

  // Morph layer (Q)
  morphLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 60,
  },
  morphBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 30 },
    elevation: 20,
  },
  morphCtaText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    letterSpacing: -0.15,
  },
  halo: {
    // top/left fournis en inline par LaunchMorph (haloTop/haloLeft, calculés
    // depuis rootH/rootW mesurés — voir Q2).
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
  },
  morphContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  morphPret: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  morphHero: {
    fontFamily: fonts.display,
    fontSize: 108,
    lineHeight: 108,
    letterSpacing: -4,
    includeFontPadding: false,
    textAlign: 'center',
  },
  morphTag: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 3.85,
    textTransform: 'uppercase',
    marginTop: 24,
  },
  morphBar: {
    width: 56,
    height: 2,
    borderRadius: 1,
    marginTop: 16,
  },

  // Sheet (R + S)
  sheetRoot: {
    ...StyleSheet.absoluteFill,
    zIndex: 80,
    justifyContent: 'flex-end',
  },
  sheetDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sheetHandleWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.30)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetKicker: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    letterSpacing: -0.44,
    color: '#FFFFFF',
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sheetCardWrap: {
    width: '48.5%',
  },
  sheetCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 120,
  },
  sheetIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    marginBottom: 12,
  },
  sheetCardName: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.36,
  },
  sheetCardTag: {
    fontFamily: fonts.sansSemibold,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  sheetCardFull: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 8,
    lineHeight: 14,
  },
  sheetActiveBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sheetActiveText: {
    fontFamily: fonts.sansBold,
    fontSize: 8,
    letterSpacing: 1.6,
  },
  sheetFooter: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.40)',
    textAlign: 'center',
    marginTop: 18,
  },

  // Picker
  pickerHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pickerKicker: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 6,
  },
  pickerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  pickerWheelWrap: {
    marginBottom: 24,
  },
  pickerCta: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pickerCtaShadowWrap: {
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  pickerCtaText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    letterSpacing: -0.15,
  },
});
