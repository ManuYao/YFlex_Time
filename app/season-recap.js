import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import AmbianceBackdrop from '../components/common/AmbianceBackdrop';

import TutorialFrame from '../components/screens/TutorialFrame';
import {
  EndCard,
  ExercisesCard,
  IntroCard,
  LoadsCard,
  LockedCard,
  ModeCard,
  NumbersCard,
  RegularityCard,
  RhythmCard,
  TensionCard,
  TrophiesCard,
} from '../components/screens/SeasonRecapCards';
import Button from '../components/common/Button';
import IconButton from '../components/common/IconButton';
import { AMBIANCES } from '../lib/ambiance';
import { loadHistory } from '../lib/history';
import { loadArchives } from '../lib/planning';
import { loadProfile } from '../lib/profile';
import { computeSeasonRecap, seasonRangeByKey, seasonShareText } from '../lib/seasonRecap';
import { markSeasonSeen } from '../lib/seasonRecapState';
import { playSound } from '../lib/sounds';
import { TIMERS } from '../lib/timers-config';
import { getTokens } from '../lib/tokens';
import { usePremium } from '../hooks/usePremium';
import { useHaptic } from '../hooks/useHaptic';

// Bilan de saison : des cartes qui défilent (« Suivant »), pas de scroll.
// Ouvert automatiquement au premier lancement après la fin d'une saison
// (app/home.js, une seule fois par saison) et rouvrable depuis le Profil.
//
// Gratuit : ouverture, chiffres, mode, régularité, trophées, fin.
// Premium : temps sous tension, exercices, rythme, charges. Les non-Premium
// voient ces cartes verrouillées (aucune vraie donnée derrière).

const NEXT_SEASON = { spring: 'summer', summer: 'autumn', autumn: 'winter', winter: 'spring' };

// Décor du bilan : part de l'ambiance de la saison racontée, puis laisse
// monter peu à peu celle de la saison suivante au fil des cartes.
function SeasonBackdrop({ seasonId, progress }) {
  const mix = useSharedValue(0);
  useEffect(() => {
    // Fondu long et doux (courbe en sinus) : la saison suivante monte sans qu'on
    // voie le moment du changement. Les deux décors sont montés dès l'ouverture,
    // rien ne se construit pendant le fondu.
    mix.value = withTiming(progress, { duration: 2200, easing: Easing.inOut(Easing.sin) });
  }, [progress]);
  const nextStyle = useAnimatedStyle(() => ({ opacity: mix.value }));
  const nextId = NEXT_SEASON[seasonId];
  return (
    <>
      <AmbianceBackdrop tone="light" ambianceId={seasonId} />
      {nextId ? (
        <Animated.View style={[StyleSheet.absoluteFill, nextStyle]} pointerEvents="none">
          <AmbianceBackdrop tone="light" ambianceId={nextId} />
        </Animated.View>
      ) : null}
    </>
  );
}

const darken = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.round(v * (1 - f));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => c(v).toString(16).padStart(2, '0'))
    .join('')}`;
};
const seasonColors = (accent) => [darken(accent, 0.55), darken(accent, 0.82), '#050505'];
const PREMIUM_COLORS = ['#3F3210', '#1D1706', '#050505'];

export default function SeasonRecap() {
  const router = useRouter();
  const haptic = useHaptic();
  const { key } = useLocalSearchParams();
  const { isPremium, loaded: premiumLoaded } = usePremium();
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const leavingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const range = seasonRangeByKey(key);
      if (!range) {
        setData({ error: true });
        return;
      }
      const [sessions, archives, profile] = await Promise.all([loadHistory(), loadArchives(), loadProfile()]);
      if (cancelled) return;
      const recap = computeSeasonRecap(sessions, TIMERS, range, { archives });
      setData({ recap, pseudo: profile?.pseudo });
      markSeasonSeen(range.key);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const leave = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }, [router]);

  useEffect(() => {
    if (data?.error) leave();
  }, [data, leave]);

  const goPremium = useCallback(() => router.push('/premium'), [router]);

  // Liste des cartes, selon ce que la saison contient et le statut Premium.
  const cards = useMemo(() => {
    if (!data?.recap || !premiumLoaded) return [];
    const { recap } = data;
    const season = AMBIANCES[recap.seasonId];
    const sc = seasonColors(season.accent);
    const mode = TIMERS.find((t) => t.id === recap.topMode?.id);
    const list = [];
    list.push({ id: 'intro', colors: sc, textMode: 'light', Card: IntroCard });
    list.push({ id: 'numbers', colors: sc, textMode: 'light', Card: NumbersCard });
    if (mode) list.push({ id: 'mode', colors: mode.bgColors, textMode: mode.textMode, Card: ModeCard });
    list.push({ id: 'regularity', colors: sc, textMode: 'light', Card: RegularityCard });
    if (recap.trophies.length) list.push({ id: 'trophies', colors: sc, textMode: 'light', Card: TrophiesCard });

    const premiumCards = [];
    if (recap.tension.seconds > 0) {
      premiumCards.push({
        id: 'tension',
        Card: TensionCard,
        title: 'TEMPS SOUS TENSION',
        teaser: 'Ton effort réel pendant la saison et ta progression face à la saison d’avant.',
      });
    }
    if (recap.topExercises.length) {
      premiumCards.push({
        id: 'exercises',
        Card: ExercisesCard,
        title: 'TES EXERCICES',
        teaser: 'Les exercices que tu as le plus travaillés pendant la saison.',
      });
    }
    if (recap.rhythm.bestWeek) {
      premiumCards.push({
        id: 'rhythm',
        Card: RhythmCard,
        title: 'TON RYTHME',
        teaser: 'Ta meilleure semaine, ton jour favori et ton moment habituel.',
      });
    }
    if (recap.loads.length) {
      premiumCards.push({
        id: 'loads',
        Card: LoadsCard,
        title: 'TES CHARGES',
        teaser: 'Les charges que tu as montées pendant la saison.',
      });
    }
    for (const p of premiumCards) {
      list.push({ ...p, colors: PREMIUM_COLORS, textMode: 'light', premium: true });
    }
    list.push({ id: 'end', colors: sc, textMode: 'light', Card: EndCard });
    return list;
  }, [data, premiumLoaded]);

  // Ouverture : son + vibration, une seule fois.
  const openedRef = useRef(false);
  useEffect(() => {
    if (cards.length && !openedRef.current) {
      openedRef.current = true;
      playSound('seasonRecap');
      haptic.success();
    }
  }, [cards.length, haptic]);

  const last = cards.length - 1;
  const next = useCallback(() => {
    if (index >= last) return;
    const to = index + 1;
    if (to === last) {
      playSound('seasonRecapEnd');
      haptic.success();
    } else {
      haptic.light();
    }
    setIndex(to);
  }, [index, last, haptic]);

  const prev = useCallback(() => {
    if (index <= 0) return;
    haptic.light();
    setIndex(index - 1);
  }, [index, haptic]);

  // Retour Android : carte précédente, puis fermeture.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index > 0) prev();
      else leave();
      return true;
    });
    return () => sub.remove();
  }, [index, prev, leave]);

  const share = useCallback(async () => {
    if (!data?.recap) return;
    haptic.medium();
    try {
      await Share.share({ message: seasonShareText(data.recap, { pseudo: data.pseudo }) });
    } catch {}
  }, [data, haptic]);

  if (!cards.length) return <View style={styles.blank} />;

  const card = cards[Math.min(index, last)];
  const ink = getTokens(card.textMode);
  const season = AMBIANCES[data.recap.seasonId];
  const isLast = index === last;
  const locked = card.premium && !isPremium;

  return (
    <TutorialFrame
      colors={card.colors}
      textMode={card.textMode}
      backdrop={
        <SeasonBackdrop
          seasonId={data.recap.seasonId}
          progress={last > 0 ? (index / last) * 0.9 : 0}
        />
      }
      eyebrow={`BILAN · ${data.recap.label} ${data.recap.yearLabel}`}
      index={index}
      total={cards.length}
      onQuit={leave}
      quitLabel="Fermer"
      footer={
        <View style={styles.footerRow}>
          {index > 0 ? (
            <IconButton icon="back" size={56} tone={card.textMode} onPress={prev} accessibilityLabel="Précédent" />
          ) : null}
          {isLast ? (
            <Button
              variant="solid"
              size="lg"
              tone={card.textMode}
              label="Terminer"
              onPress={leave}
              style={styles.grow}
            />
          ) : (
            <Button
              variant="solid"
              size="lg"
              tone={card.textMode}
              label="Suivant"
              onPress={next}
              haptic={null}
              style={styles.grow}
            />
          )}
        </View>
      }
    >
      <View key={card.id} style={styles.cardWrap}>
        {locked ? (
          <LockedCard title={card.title} teaser={card.teaser} ink={ink} onPremium={goPremium} />
        ) : (
          <card.Card recap={data.recap} ink={ink} season={season} isPremium={isPremium} onPremium={goPremium} />
        )}
      </View>
    </TutorialFrame>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: '#000000' },
  cardWrap: { flex: 1 },
  footerRow: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
});
