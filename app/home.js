import { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import GradientBackground from '../components/common/GradientBackground';
import TickRing from '../components/common/TickRing';
import { TIMERS, getTimerHero } from '../lib/timers-config';
import { getTokens } from '../lib/tokens';
import { fonts } from '../lib/fonts';

const { width: SCREEN_W } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = TIMERS[activeIndex];
  const t = getTokens(active.textMode);

  const handleMomentumEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (index !== activeIndex) {
      setActiveIndex(index);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const handleLaunch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({ pathname: '/countdown', params: { timerId: active.id } });
  };

  const handleDotPress = (index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <GradientBackground colors={active.bgColors} textMode={active.textMode}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TopBar tag={active.tag} tokens={t} onBack={() => router.back()} />

        <FlatList
          ref={flatListRef}
          data={TIMERS}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TimerCard timer={item} isActive={index === activeIndex} />
          )}
          getItemLayout={(_, i) => ({
            length: SCREEN_W,
            offset: SCREEN_W * i,
            index: i,
          })}
          style={styles.list}
        />

        <BottomBar
          timers={TIMERS}
          activeIndex={activeIndex}
          active={active}
          tokens={t}
          onDotPress={handleDotPress}
          onLaunch={handleLaunch}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

function TopBar({ tag, tokens, onBack }) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onBack}
        style={[styles.iconBtn, { borderColor: tokens.btnBorder }]}
        hitSlop={8}
      >
        <Text style={[styles.iconBtnText, { color: tokens.primary }]}>‹</Text>
      </Pressable>

      <Text style={[styles.tag, { color: tokens.secondary }]}>{tag}</Text>

      <Pressable
        style={[styles.iconBtn, { borderColor: tokens.btnBorder }]}
        hitSlop={8}
      >
        <View style={styles.dotsCol}>
          <View style={[styles.dot, { backgroundColor: tokens.primary }]} />
          <View style={[styles.dot, { backgroundColor: tokens.primary }]} />
          <View style={[styles.dot, { backgroundColor: tokens.primary }]} />
        </View>
      </Pressable>
    </View>
  );
}

function TimerCard({ timer, isActive }) {
  const t = getTokens(timer.textMode);
  const hero = getTimerHero(timer);
  const heroFontSize = hero.number.length > 3 ? 110 : 140;

  return (
    <View style={styles.card}>
      <Text style={[styles.description, { color: t.tertiary }]}>
        {timer.full}
      </Text>

      <View style={styles.ringWrap}>
        <TickRing
          progress={0.75}
          size={320}
          colorActive={t.ringActive}
          colorInactive={t.ringInactive}
        />
        <View style={styles.ringCenter} pointerEvents="none">
          <Text style={[styles.heroUnit, { color: t.tertiary }]}>
            {hero.unit}
          </Text>
          <Text
            style={[
              styles.heroNumber,
              { color: t.primary, fontSize: heroFontSize },
            ]}
          >
            {hero.number}
          </Text>
          <Text style={[styles.timerName, { color: t.primary }]}>
            {timer.name}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {timer.stats.map((stat) => (
          <View
            key={stat.key}
            style={[
              styles.statChip,
              { backgroundColor: t.chipBg, borderColor: t.chipBorder },
            ]}
          >
            <Text style={[styles.statLabel, { color: t.tertiary }]}>
              {stat.label}
            </Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, { color: t.primary }]}>
                {stat.value}
              </Text>
              {!!stat.unit && (
                <Text style={[styles.statUnit, { color: t.tertiary }]}>
                  {stat.unit}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.phasesLabel, { color: t.muted }]}>Déroulé</Text>
      <View style={styles.phasesRow}>
        {timer.phases.map((phase, i) => (
          <View
            key={i}
            style={[
              styles.phaseChip,
              { backgroundColor: t.chipBg, borderColor: t.chipBorder },
            ]}
          >
            <Text style={[styles.phaseText, { color: t.chipText }]}>
              {phase}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BottomBar({ timers, activeIndex, active, tokens, onDotPress, onLaunch }) {
  const ctaTextColor = active.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF';

  return (
    <View style={styles.bottomBar}>
      <View style={styles.indicatorRow}>
        {timers.map((timer, i) => {
          const isActive = i === activeIndex;
          return (
            <Pressable
              key={timer.id}
              onPress={() => onDotPress(i)}
              hitSlop={8}
              style={[
                styles.indicatorDot,
                {
                  width: isActive ? 24 : 4,
                  backgroundColor: isActive
                    ? tokens.primary
                    : tokens.ringInactive,
                },
              ]}
            />
          );
        })}
      </View>

      <Pressable
        onPress={onLaunch}
        style={({ pressed }) => [
          styles.cta,
          {
            backgroundColor: active.color,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        <Text style={[styles.ctaIcon, { color: ctaTextColor }]}>▶</Text>
        <Text style={[styles.ctaText, { color: ctaTextColor }]}>
          Lancer {active.name}
        </Text>
      </Pressable>

      <Text style={[styles.hint, { color: tokens.muted }]}>
        ← Glisse ou tape les points →
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

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
  iconBtnText: {
    fontSize: 22,
    fontFamily: fonts.sansBold,
    marginTop: -4,
  },
  tag: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 3.3,
    textTransform: 'uppercase',
  },
  dotsCol: {
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  list: {
    flex: 1,
  },
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
    lineHeight: 140,
    includeFontPadding: false,
  },
  timerName: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    letterSpacing: -0.44,
    marginTop: 8,
  },

  statsRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 320,
    gap: 8,
    marginBottom: 24,
  },
  statChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 4,
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
    borderRadius: 18,
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
  ctaIcon: {
    fontSize: 14,
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
});