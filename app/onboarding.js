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
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';

import GradientBackground from '../components/common/GradientBackground';
import TickRing from '../components/common/TickRing';
import { fonts } from '../lib/fonts';
import { useHaptic } from '../hooks/useHaptic';

const { width: SCREEN_W } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'welcome',
    tag: 'BIENVENUE',
    title: 'FLEX',
    subtitle: 'TIMER',
    description: 'Le chronomètre sportif pensé pour tes vrais entraînements.',
    bgColors: ['#1A1A1A', '#0A0A0A', '#000000'],
    textMode: 'light',
  },
  {
    id: 'modes',
    tag: '5 MODES',
    title: 'AMRAP',
    subtitle: 'EMOM · TABATA · BASIC · MIX',
    description: 'Du HIIT pur au WOD CrossFit, chaque format est pris en charge avec sa logique propre.',
    bgColors: ['#FF5454', '#B81818', '#4A0606'],
    textMode: 'light',
  },
  {
    id: 'custom',
    tag: 'PERSONNALISE',
    title: 'TON',
    subtitle: 'TEMPO',
    description: 'Paramètre chaque timer à la seconde près. Crée ton MIX pour enchaîner plusieurs phases.',
    bgColors: ['#1FC777', '#047442', '#022A18'],
    textMode: 'light',
  },
  {
    id: 'ready',
    tag: 'PRÊT ?',
    title: "C'EST",
    subtitle: 'PARTI',
    description: 'Aucun compte requis. Lance ta première séance dès maintenant.',
    bgColors: ['#FFC933', '#E08500', '#5C2E00'],
    textMode: 'dark',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const haptic = useHaptic();
  const flatListRef = useRef(null);
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const isDark = slide.textMode === 'dark';
  const textColor = isDark ? '#0A0A0A' : '#FFFFFF';
  const mutedColor = isDark ? 'rgba(10,10,10,0.55)' : 'rgba(255,255,255,0.65)';
  const dimColor = isDark ? 'rgba(10,10,10,0.20)' : 'rgba(255,255,255,0.20)';

  const goNext = () => {
    haptic.light();
    if (isLast) return finish();
    flatListRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const skip = () => {
    haptic.selection();
    flatListRef.current?.scrollToIndex({ index: SLIDES.length - 1, animated: true });
  };

  const finish = async () => {
    haptic.success();
    try {
      await AsyncStorage.setItem('flexTimer_onboarded', '1');
    } catch {}
    router.replace('/home');
  };

  const handleMomentumEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== index) {
      setIndex(i);
      haptic.selection();
    }
  };

  return (
    <GradientBackground colors={slide.bgColors} textMode={slide.textMode}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={styles.topGhost} />
          {!isLast ? (
            <Pressable onPress={skip} hitSlop={8}>
              <Text style={[styles.skip, { color: mutedColor }]}>PASSER</Text>
            </Pressable>
          ) : (
            <View style={styles.topGhost} />
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          keyExtractor={(item) => item.id}
          getItemLayout={(_, i) => ({
            length: SCREEN_W,
            offset: SCREEN_W * i,
            index: i,
          })}
          renderItem={({ item, index: i }) => {
            const slideIsDark = item.textMode === 'dark';
            const slideText = slideIsDark ? '#0A0A0A' : '#FFFFFF';
            const slideMuted = slideIsDark ? 'rgba(10,10,10,0.55)' : 'rgba(255,255,255,0.65)';
            const slideDim = slideIsDark ? 'rgba(10,10,10,0.20)' : 'rgba(255,255,255,0.20)';
            const slideBody = slideIsDark ? 'rgba(10,10,10,0.75)' : 'rgba(255,255,255,0.80)';

            return (
              <View style={styles.slide}>
                <Text style={[styles.tag, { color: slideMuted }]}>{item.tag}</Text>

                <View style={styles.ringWrap}>
                  <TickRing
                    progress={(i + 1) / SLIDES.length}
                    size={280}
                    colorActive={slideText}
                    colorInactive={slideDim}
                  />
                  <View style={styles.ringCenter} pointerEvents="none">
                    <Text
                      style={[
                        styles.title,
                        {
                          color: slideText,
                          fontSize: item.title.length > 4 ? 72 : 92,
                          lineHeight: item.title.length > 4 ? 72 : 92,
                        },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.subtitle,
                        {
                          color: slideMuted,
                          fontSize: item.subtitle.length > 12 ? 10 : 14,
                          letterSpacing: item.subtitle.length > 12 ? 2 : 0.7,
                        },
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.description, { color: slideBody }]}>
                  {item.description}
                </Text>
              </View>
            );
          }}
        />

        <View style={styles.bottom}>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View
                key={s.id}
                style={[
                  styles.dot,
                  {
                    width: i === index ? 28 : 5,
                    backgroundColor:
                      i === index
                        ? textColor
                        : i < index
                        ? mutedColor
                        : dimColor,
                  },
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={goNext}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: textColor,
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Text style={[styles.ctaText, { color: isDark ? '#FFFFFF' : '#0A0A0A' }]}>
              {isLast ? 'Lancer ma première séance' : 'Suivant'}
            </Text>
            {isLast ? (
              <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                <Path d="M3 2l8 5-8 5V2z" fill={isDark ? '#FFFFFF' : '#0A0A0A'} />
              </Svg>
            ) : (
              <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                <Path
                  d="M3 7h8M8 3l3 4-3 4"
                  stroke={isDark ? '#FFFFFF' : '#0A0A0A'}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </GradientBackground>
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
    height: 36,
  },
  topGhost: { width: 60, height: 24 },
  skip: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  slide: {
    width: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  tag: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4.4,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  ringWrap: {
    width: 280,
    height: 280,
    marginBottom: 32,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display,
    letterSpacing: -3.7,
    includeFontPadding: false,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.sansBold,
    textTransform: 'uppercase',
    marginTop: 6,
    textAlign: 'center',
  },
  description: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },

  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
    height: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
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
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    letterSpacing: -0.15,
  },
});