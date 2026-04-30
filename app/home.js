import { useEffect, useRef, useState } from 'react';
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
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeOut,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import TickRing from '../components/common/TickRing';
import WheelPicker from '../components/common/WheelPicker';
import PressTap from '../components/common/PressTap';
import { getTimerHero } from '../lib/timers-config';
import { getTokens } from '../lib/tokens';
import { fonts } from '../lib/fonts';
import { useTimers } from '../contexts/TimersContext';
import { useHaptic } from '../hooks/useHaptic';
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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const MORPH_W_INIT = SCREEN_W - 48;
const MORPH_H_INIT = 56;
const MORPH_R_INIT = 18;
const MORPH_W_FINAL = 340;
const MORPH_H_FINAL = 340;
const MORPH_R_FINAL = 170;
const MORPH_BOTTOM_OFFSET = 100;
const MORPH_INIT_TOP = SCREEN_H - MORPH_BOTTOM_OFFSET - MORPH_H_INIT;
const MORPH_INIT_LEFT = 24;
const MORPH_FINAL_TOP = SCREEN_H / 2 - MORPH_H_FINAL / 2;
const MORPH_FINAL_LEFT = SCREEN_W / 2 - MORPH_W_FINAL / 2;

const LAUNCH_TOTAL_MS = 2400;

export default function Home() {
  const router = useRouter();
  const haptic = useHaptic();
  const flatListRef = useRef(null);
  const { timers, updateStat, hydrated } = useTimers();
  const { lastTimerId } = useLocalSearchParams();
  const initialIndex = (() => {
    if (!lastTimerId) return 0;
    const i = timers.findIndex((t) => t.id === lastTimerId);
    return i >= 0 ? i : 0;
  })();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [picker, setPicker] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  const active = timers[activeIndex];
  const t = getTokens(active.textMode);

  const handleMomentumEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (index !== activeIndex) {
      setActiveIndex(index);
      haptic.selection();
    }
  };

  const handleLaunch = () => {
    if (active.id === 'mix' && (!active._mix || active._mix.blocks.length === 0)) {
      haptic.light();
      router.push('/mix-builder');
      return;
    }
    haptic.medium();
    setIsLaunching(true);
  };

  const handleMorphComplete = () => {
    setIsLaunching(false);
    router.push({ pathname: '/countdown', params: { timerId: active.id } });
  };

  const handleMixEdit = () => {
    haptic.light();
    router.push('/mix-builder');
  };

  const handleDotPress = (index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleStatPress = (timerId, statKey) => {
    haptic.light();
    setPicker({ timerId, statKey });
  };

  const handleValidate = (newValue) => {
    if (!picker) return;
    haptic.medium();
    updateStat(picker.timerId, picker.statKey, newValue);
    setPicker(null);
  };

  const pickerTimer = picker ? timers.find((tt) => tt.id === picker.timerId) : null;
  const pickerStat = pickerTimer ? pickerTimer.stats.find((s) => s.key === picker.statKey) : null;

  return (
    <View style={styles.root}>
      {/* (A) Background dynamique avec crossfade */}
      <CrossfadeBackground
        colors={active.bgColors}
        textMode={active.textMode}
        timerId={active.id}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']} pointerEvents={isLaunching ? 'none' : 'auto'}>
        <TopBar
          tag={active.tag}
          tokens={t}
          onBack={() => router.push('/settings')}
          onMenu={() => setMenuOpen(true)}
          onMenuHaptic={haptic.light}
          isLaunching={isLaunching}
        />

        <FlatList
          ref={flatListRef}
          data={timers}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          keyExtractor={(item) => item.id}
          initialScrollIndex={initialIndex}
          renderItem={({ item, index }) => (
            <TimerCard
              timer={item}
              isActive={index === activeIndex}
              onStatPress={handleStatPress}
              onMixEdit={handleMixEdit}
              onStatHaptic={haptic.light}
            />
          )}
          getItemLayout={(_, i) => ({
            length: SCREEN_W,
            offset: SCREEN_W * i,
            index: i,
          })}
          style={styles.list}
          scrollEnabled={!isLaunching}
        />

        <BottomBar
          timers={timers}
          activeIndex={activeIndex}
          active={active}
          tokens={t}
          onDotPress={handleDotPress}
          onLaunch={handleLaunch}
          isLaunching={isLaunching}
        />
      </SafeAreaView>

      {/* (Q) Launch morph overlay */}
      {isLaunching && (
        <LaunchMorph active={active} onComplete={handleMorphComplete} />
      )}

      {/* (R) Menu sélecteur */}
      {menuOpen && (
        <MenuSheet
          timers={timers}
          activeIndex={activeIndex}
          onClose={() => setMenuOpen(false)}
          onPick={(i) => {
            setMenuOpen(false);
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: i, animated: true });
            }, 50);
          }}
          haptic={haptic}
        />
      )}

      {/* (S) Picker modal */}
      {picker && pickerStat && (
        <PickerSheet
          stat={pickerStat}
          accentColor={pickerTimer.color}
          textMode={pickerTimer.textMode}
          onClose={() => setPicker(null)}
          onValidate={handleValidate}
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
        <Text style={[styles.statusText, { color: tokens.tertiary }]}>09:41</Text>
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
          onPress={onBack}
          tapScale={0.88}
          onHapticIn={onMenuHaptic}
          style={[styles.iconBtn, { borderColor: tokens.btnBorder }]}
          hitSlop={8}
          accessibilityLabel="Réglages"
        >
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path
              d="M9 2L3 7l6 5"
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
          onPress={onMenu}
          tapScale={0.88}
          onHapticIn={onMenuHaptic}
          style={[styles.iconBtn, { borderColor: tokens.btnBorder }]}
          hitSlop={8}
          accessibilityLabel="Menu"
        >
          <View style={styles.dotsCol}>
            <View style={[styles.smallDot, { backgroundColor: tokens.primary }]} />
            <View style={[styles.smallDot, { backgroundColor: tokens.primary }]} />
            <View style={[styles.smallDot, { backgroundColor: tokens.primary }]} />
          </View>
        </PressTap>
      </Animated.View>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TimerCard — orchestration des animations sur isActive
   ────────────────────────────────────────────────────────────────*/
function TimerCard({ timer, isActive, onStatPress, onMixEdit, onStatHaptic }) {
  const t = getTokens(timer.textMode);
  const hero = getTimerHero(timer);
  const heroFontSize = hero.number.length > 3 ? 110 : 140;
  const isMix = timer.id === 'mix';

  return (
    <View style={styles.card}>
      {/* (E) Description */}
      {isActive ? (
        <Animated.Text
          key={`full-${timer.id}`}
          entering={slideInY(10, D.big, 100)}
          exiting={slideOutY(-10, D.base)}
          style={[styles.description, { color: t.tertiary }]}
        >
          {timer.full}
        </Animated.Text>
      ) : (
        <Text style={[styles.description, { color: t.tertiary }]}>{timer.full}</Text>
      )}

      {/* (F+G) TickRing breathing + draw stagger */}
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
}

function StatChipContent({ stat, t, editable }) {
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
          {stat.value}
        </Text>
        {!!stat.unit && (
          <Text style={[styles.statUnit, { color: t.tertiary }]}>{stat.unit}</Text>
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
function BottomBar({ timers, activeIndex, active, tokens, onDotPress, onLaunch, isLaunching }) {
  const ctaTextColor = active.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF';

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
      style={[styles.bottomBar, fadeStyle]}
      pointerEvents={isLaunching ? 'none' : 'auto'}
    >
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
      <PressTap
        onPress={onLaunch}
        tapScale={0.96}
        style={[styles.cta, { backgroundColor: active.color }]}
      >
        <Animated.View style={arrowStyle}>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M3 2l8 5-8 5V2z" fill={ctaTextColor} />
          </Svg>
        </Animated.View>
        <Animated.Text
          key={`cta-${active.name}`}
          entering={slideInY(10, 250, 0)}
          exiting={slideOutY(-10, 200)}
          style={[styles.ctaText, { color: ctaTextColor }]}
        >
          Lancer {active.name}
        </Animated.Text>
      </PressTap>

      <Text style={[styles.hint, { color: tokens.muted }]}>
        ← Glisse ou tape les points →
      </Text>
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
function LaunchMorph({ active, onComplete }) {
  const isDark = active.textMode === 'dark';
  const fgColor = isDark ? '#0A0A0A' : '#FFFFFF';

  const progress = useSharedValue(0);
  const ctaTextOpacity = useSharedValue(1);
  const haloOpacity = useSharedValue(0);
  const haloScale = useSharedValue(0.8);

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

    // Fin de séquence (~2.4s incluant les delays Q3-Q6) → navigation
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
      [MORPH_W_INIT, MORPH_W_INIT, MORPH_W_FINAL, MORPH_W_FINAL]
    );
    const h = interpolate(
      p,
      [0, 0.15, 0.75, 1],
      [MORPH_H_INIT, MORPH_H_INIT, MORPH_H_FINAL, MORPH_H_FINAL]
    );
    const r = interpolate(
      p,
      [0, 0.15, 0.75, 1],
      [MORPH_R_INIT, MORPH_R_INIT, MORPH_R_FINAL, MORPH_R_FINAL]
    );
    const top = interpolate(
      p,
      [0, 0.15, 0.75, 1],
      [MORPH_INIT_TOP, MORPH_INIT_TOP - 10, MORPH_FINAL_TOP, MORPH_FINAL_TOP]
    );
    const left = interpolate(
      p,
      [0, 0.15, 0.75, 1],
      [MORPH_INIT_LEFT, MORPH_INIT_LEFT, MORPH_FINAL_LEFT, MORPH_FINAL_LEFT]
    );
    const sc = interpolate(p, [0, 0.15, 0.75, 1], [1, 0.96, 1.12, 1]);
    return {
      width: w,
      height: h,
      borderRadius: r,
      top,
      left,
      transform: [{ scale: sc }],
    };
  });

  const ctaTextStyle = useAnimatedStyle(() => ({
    opacity: ctaTextOpacity.value,
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  return (
    <View style={styles.morphLayer} pointerEvents="none">
      {/* (Q2) Halo radial */}
      <Animated.View
        style={[
          styles.halo,
          { backgroundColor: active.color + '33' },
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

      {/* (Q3-Q6) Contenu hero centré */}
      <View style={styles.morphContent} pointerEvents="none">
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
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
   (R) Menu sélecteur — bottom sheet + cards stagger
   ────────────────────────────────────────────────────────────────*/
function MenuSheet({ timers, activeIndex, onClose, onPick, haptic }) {
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: D.big, easing: easeImpact });
    translateY.value = withSpring(0, springSheet);
  }, []);

  const handleClose = () => {
    backdropOpacity.value = withTiming(0, { duration: D.base });
    translateY.value = withTiming(SCREEN_H, { duration: D.base, easing: easeImpact }, (done) => {
      if (done) runOnJS(onClose)();
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
          style={styles.sheetHeader}
        >
          <View>
            <Text style={styles.sheetKicker}>ACCÈS RAPIDE</Text>
            <Text style={styles.sheetTitle}>Choisis ton format</Text>
          </View>
          <PressTap
            onPress={handleClose}
            tapScale={0.85}
            onHapticIn={haptic.light}
            style={styles.sheetClose}
          >
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path
                d="M2 2l8 8M10 2l-8 8"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </PressTap>
        </Animated.View>

        <View style={styles.sheetGrid}>
          {timers.map((timer, i) => {
            const isActive = i === activeIndex;
            return (
              <Animated.View
                key={timer.id}
                entering={popIn(0.9, D.slow, 200 + i * 50)}
                style={styles.sheetCardWrap}
              >
                <PressTap
                  onPress={() => {
                    haptic.light();
                    onPick(i);
                  }}
                  tapScale={0.95}
                  style={[
                    styles.sheetCard,
                    {
                      backgroundColor: isActive
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(255,255,255,0.06)',
                      borderColor: isActive ? timer.color : 'rgba(255,255,255,0.10)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.sheetIconBox,
                      {
                        backgroundColor: isActive
                          ? timer.color
                          : 'rgba(255,255,255,0.08)',
                      },
                    ]}
                  />
                  <Text style={styles.sheetCardName}>{timer.name}</Text>
                  <Text style={[styles.sheetCardTag, { color: timer.color }]}>
                    {timer.tag}
                  </Text>
                  <Text style={styles.sheetCardFull} numberOfLines={2}>
                    {timer.full}
                  </Text>

                  {isActive && (
                    <Animated.View
                      entering={popIn(0, D.medium, 0)}
                      style={styles.sheetActiveBadge}
                    >
                      <PulseDot color={timer.color} />
                      <Text style={[styles.sheetActiveText, { color: timer.color }]}>
                        ACTIF
                      </Text>
                    </Animated.View>
                  )}
                </PressTap>
              </Animated.View>
            );
          })}
        </View>

        <Animated.Text
          entering={FadeIn.delay(600).duration(D.base)}
          style={styles.sheetFooter}
        >
          Tape en dehors pour fermer
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

function PulseDot({ color }) {
  const opacity = useSharedValue(0.4);
  const scale = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750, easing: easeInOut }),
        withTiming(0.4, { duration: 750, easing: easeInOut })
      ),
      -1,
      false
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 750, easing: easeInOut }),
        withTiming(1, { duration: 750, easing: easeInOut })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: color },
        animStyle,
      ]}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────
   (S) Picker modal — wheel picker pour stat éditable
   ────────────────────────────────────────────────────────────────*/
function PickerSheet({ stat, accentColor, textMode, onClose, onValidate }) {
  const [draft, setDraft] = useState(stat.value);
  const ctaText = textMode === 'dark' ? '#0A0A0A' : '#FFFFFF';

  const values = [];
  for (let i = stat.range[0]; i <= stat.range[1]; i++) values.push(i);

  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: D.big, easing: easeImpact });
    translateY.value = withSpring(0, springSheet);
  }, []);

  const handleClose = () => {
    backdropOpacity.value = withTiming(0, { duration: D.base });
    translateY.value = withTiming(SCREEN_H, { duration: D.base, easing: easeImpact }, (done) => {
      if (done) runOnJS(onClose)();
    });
  };

  const handleValidate = () => {
    backdropOpacity.value = withTiming(0, { duration: D.base });
    translateY.value = withTiming(SCREEN_H, { duration: D.base, easing: easeImpact }, (done) => {
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
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  list: { flex: 1 },

  // Status bar (B)
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  dotsCol: { gap: 3 },
  smallDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Card
  card: {
    width: SCREEN_W,
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
  ringWrap: {
    width: 320,
    height: 320,
    marginBottom: 24,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
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
    ...StyleSheet.absoluteFillObject,
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
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    top: SCREEN_H / 2 - 300,
    left: SCREEN_W / 2 - 300,
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
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    justifyContent: 'flex-end',
  },
  sheetDim: {
    ...StyleSheet.absoluteFillObject,
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
