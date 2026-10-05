import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import TutorialFrame from './TutorialFrame';
import TickRing from '../common/TickRing';
import Button from '../common/Button';
import { TIMERS, getTimerDescription, getTimerHero } from '../../lib/timers-config';
import { TUTORIAL_TIMER_ID, TUTORIAL_REST, TUTORIAL_ROUNDS, buildTutorialTimer } from '../../lib/tutorialShape';
import { fonts } from '../../lib/fonts';
import { useHaptic } from '../../hooks/useHaptic';

// Niveau 1, étape 1 : « voici ton menu ». Le même carrousel horizontal que
// l'accueil (5 modes, un fond par mode) pour que la personne reconnaisse
// l'écran qu'elle verra ensuite — mais avec les réglages PAR DÉFAUT de chaque
// mode, jamais les siens, et un seul bouton qui avance toujours : « Voir BASIC »
// tant qu'on n'y est pas, « Lancer le test » une fois dessus. Impossible de
// rester coincé.

const heroFor = (timer) => {
  // Un MIX est vide à l'état neuf (« 00 BLOCS ») : peu parlant pour un tour.
  if (timer.id === 'mix') return { number: '∞', unit: 'SUR MESURE' };
  return getTimerHero(timer);
};

export default function TutorialMenu({ onLaunch, onQuit }) {
  const haptic = useHaptic();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const listRef = useRef(null);
  const activeRef = useRef(0);

  // Réglages par défaut de chaque mode ; BASIC aux réglages du test, pour que
  // ce qu'on voit sur la carte soit EXACTEMENT ce qui va se lancer.
  const timers = useMemo(
    () => TIMERS.map((t) => (t.id === TUTORIAL_TIMER_ID ? buildTutorialTimer(t) : t)),
    []
  );
  const basicIndex = timers.findIndex((t) => t.id === TUTORIAL_TIMER_ID);
  const [index, setIndex] = useState(0);
  const draggingRef = useRef(false);

  const active = timers[index];
  const onBasic = index === basicIndex;
  const isDark = active.textMode === 'dark';
  const ink = isDark ? '#0A0A0A' : '#FFFFFF';
  const muted = isDark ? 'rgba(10,10,10,0.55)' : 'rgba(255,255,255,0.65)';
  const dim = isDark ? 'rgba(10,10,10,0.22)' : 'rgba(255,255,255,0.22)';
  const body = isDark ? 'rgba(10,10,10,0.78)' : 'rgba(255,255,255,0.82)';

  // Place pour l'anneau = ce qui reste une fois la bulle, le texte et le
  // bouton posés. Plafonné à 260 (téléphone normal), il rétrécit dans une
  // fenêtre basse au lieu de déborder.
  const ring = Math.max(140, Math.min(260, screenH - 500));
  const heroSize = Math.round(ring * 0.3);

  const handleScrollBegin = useCallback(() => {
    draggingRef.current = true;
  }, []);
  const handleMomentumEnd = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const i = Math.round(e.nativeEvent.contentOffset.x / screenW);
      if (i === activeRef.current) return;
      activeRef.current = i;
      haptic.selection();
      setIndex(i);
    },
    [haptic, screenW]
  );

  const goBasic = useCallback(() => {
    haptic.light();
    activeRef.current = basicIndex;
    setIndex(basicIndex);
    listRef.current?.scrollToIndex({ index: basicIndex, animated: true });
  }, [haptic, basicIndex]);

  const footer = onBasic ? (
    <Button
      variant="accent"
      color={active.color}
      tone={active.textMode}
      fullWidth
      icon="play"
      label="Lancer le test"
      haptic={haptic.medium}
      onPress={onLaunch}
    />
  ) : (
    <Button
      variant="glass"
      tone={active.textMode}
      fullWidth
      icon="arrow"
      iconPosition="right"
      label="Voir BASIC"
      onPress={goBasic}
    />
  );

  return (
    <TutorialFrame
      colors={active.bgColors}
      textMode={active.textMode}
      eyebrow="Tour guidé · Niveau 1 · Le menu"
      index={0}
      total={3}
      onQuit={onQuit}
      footer={footer}
    >
      {/* Bulle du coach : change de texte quand on arrive sur BASIC. */}
      <Animated.View
        key={onBasic ? 'basic' : 'menu'}
        entering={FadeIn.duration(260)}
        style={[styles.bubble, { backgroundColor: isDark ? 'rgba(10,10,10,0.08)' : 'rgba(255,255,255,0.14)', borderColor: isDark ? 'rgba(10,10,10,0.14)' : 'rgba(255,255,255,0.22)' }]}
      >
        <Text style={[styles.bubbleTitle, { color: ink }]}>
          {onBasic ? 'BASIC, le plus simple' : 'Voici ton menu'}
        </Text>
        <Text style={[styles.bubbleBody, { color: body }]}>
          {onBasic
            ? `Tu fais ta série à ton rythme, puis tu lances le repos. Pour le test : ${TUTORIAL_ROUNDS} tours, ${TUTORIAL_REST} secondes de repos.`
            : 'Glisse pour parcourir les 5 modes. Chacun a sa logique, mais tous se lancent et se suivent de la même façon.'}
        </Text>
      </Animated.View>

      <FlatList
        ref={listRef}
        data={timers}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleMomentumEnd}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, i) => ({ length: screenW, offset: screenW * i, index: i })}
        style={styles.list}
        renderItem={({ item }) => {
          const hero = heroFor(item);
          const pageDark = item.textMode === 'dark';
          const pageInk = pageDark ? '#0A0A0A' : '#FFFFFF';
          const pageMuted = pageDark ? 'rgba(10,10,10,0.55)' : 'rgba(255,255,255,0.65)';
          const pageDim = pageDark ? 'rgba(10,10,10,0.22)' : 'rgba(255,255,255,0.22)';
          const pageBody = pageDark ? 'rgba(10,10,10,0.78)' : 'rgba(255,255,255,0.82)';
          return (
            <View style={[styles.page, { width: screenW }]}>
              <Text style={[styles.tag, { color: pageMuted }]}>{item.tag}</Text>
              <View style={{ width: ring, height: ring }}>
                <TickRing
                  progress={0.75}
                  size={ring}
                  colorActive={pageInk}
                  colorInactive={pageDim}
                />
                <View style={styles.ringCenter} pointerEvents="none">
                  <Text
                    style={[
                      styles.hero,
                      {
                        color: pageInk,
                        fontSize: hero.number.length > 3 ? Math.round(heroSize * 0.78) : heroSize,
                        // Anton : ×1,18, sinon Android rogne les chiffres.
                        lineHeight: Math.round(heroSize * 1.18),
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {hero.number}
                  </Text>
                  <Text style={[styles.heroUnit, { color: pageMuted }]}>{hero.unit}</Text>
                </View>
              </View>
              <Text style={[styles.name, { color: pageInk }]}>{item.name}</Text>
              <Text style={[styles.desc, { color: pageBody }]}>{getTimerDescription(item)}</Text>
              {item.id === TUTORIAL_TIMER_ID ? (
                <View style={[styles.testChip, { borderColor: pageDim }]}>
                  <Text style={[styles.testChipText, { color: pageMuted }]}>
                    TEST · {TUTORIAL_ROUNDS} TOURS · {TUTORIAL_REST} S DE REPOS
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />

      <View style={styles.pager}>
        {timers.map((t, i) => (
          <View
            key={t.id}
            style={[
              styles.pagerDot,
              {
                width: i === index ? 22 : 6,
                backgroundColor: i === index ? ink : dim,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.hint, { color: muted }]}>
        {onBasic ? 'Prêt ? Le décompte 3-2-1 démarre au tap.' : 'Glisse pour voir les autres modes'}
      </Text>
    </TutorialFrame>
  );
}

const styles = StyleSheet.create({
  bubble: {
    marginHorizontal: 24,
    marginTop: 6,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  bubbleBody: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  tag: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4.4,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    fontFamily: fonts.display,
    letterSpacing: -2,
    includeFontPadding: false,
    textAlign: 'center',
  },
  heroUnit: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: 1,
    includeFontPadding: false,
    marginTop: 14,
  },
  desc: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 4,
  },
  testChip: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  testChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 9.5,
    letterSpacing: 1.8,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 10,
    marginTop: 4,
  },
  pagerDot: {
    height: 6,
    borderRadius: 3,
  },
  hint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
});
