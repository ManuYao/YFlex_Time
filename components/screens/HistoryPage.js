import { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import PageDots from '../common/PageDots';
import PressTap from '../common/PressTap';
import { TIMERS } from '../../lib/timers-config';
import {
  loadHistory,
  removeSession,
  groupByDay,
  computeStreak,
  computeTotals,
  formatSessionTime,
} from '../../lib/history';
import { loadScrollHintNextCard, saveScrollHintNextCard } from '../../lib/scrollHint';
import { formatDuration } from '../../lib/formatters';
import { fonts } from '../../lib/fonts';
import { D, easeImpact } from '../../lib/animations';
import { useHaptic } from '../../hooks/useHaptic';

const FILTERS = ['TOUS', 'AMRAP', 'BASIC', 'EMOM', 'TABATA', 'MIX'];

// Jours affichés d'un coup. Chaque jour monte plusieurs lignes Swipeable
// (un gesture handler chacune) : en limiter le nombre garde la liste fluide
// sur les longs historiques.
const DAYS_PER_PAGE = 3;

// Aperçu "glisse vers le planning" : après HINT_IDLE_MS sans toucher l'écran,
// si l'historique a au moins HINT_MIN_SESSIONS séances, les 3 premières
// cartes se "pressent" tour à tour pendant que le pager dévoile une bande du
// Planning. Une fois par ouverture ; un toucher l'interrompt.
const HINT_MIN_SESSIONS = 5;
const HINT_IDLE_MS = 3000;
// Le doigt reste "posé" sur la carte le temps de bien le voir avant que
// l'écran ne revienne (voir aussi le ralenti du peek dans app/history.js).
const HINT_HOLD_MS = 1100;
// Pas une cadence régulière : des pauses qui s'allongent, pour ne pas donner
// l'impression d'un métronome — demande explicite de l'utilisateur après
// test (l'enchaînement à 1.4s d'intervalle paraissait trop mécanique).
// GAPS[i] = attente entre la fin de la carte i et le début de la carte i+1.
const HINT_GAPS_MS = [5000, 10000];
// Marge pour laisser le relâchement (spring-back + fondu du voile) se
// terminer visuellement avant de compter la pause suivante.
const HINT_RELEASE_MS = 550;
const HINT_CARDS = 3;

export default function HistoryPage({
  width,
  height,
  pageIndex,
  onSelectPage,
  onPeek,
  onPeekCancel,
}) {
  const router = useRouter();
  const haptic = useHaptic();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('TOUS');
  const [visibleDays, setVisibleDays] = useState(DAYS_PER_PAGE);
  const [hintCard, setHintCard] = useState(-1);
  const [hintActive, setHintActive] = useState(false);

  // Tout l'état de l'aperçu vit dans des refs : la séquence est pilotée par
  // des setTimeout qui doivent lire les valeurs du moment, pas celles
  // capturées au rendu qui les a posés.
  const hint = useRef({
    timers: [],
    idleTimer: null,
    running: false,
    doneThisOpen: false,
    nextCard: 0,
    step: -1,
    eligible: false,
  }).current;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadHistory().then((list) => {
        if (!cancelled) setSessions(list);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const clearHintTimers = () => {
    hint.timers.forEach(clearTimeout);
    hint.timers = [];
    if (hint.idleTimer) {
      clearTimeout(hint.idleTimer);
      hint.idleTimer = null;
    }
  };

  const finishHint = (nextCard) => {
    clearHintTimers();
    hint.running = false;
    hint.doneThisOpen = true;
    hint.nextCard = nextCard;
    hint.step = -1;
    setHintCard(-1);
    setHintActive(false);
    saveScrollHintNextCard(nextCard);
  };

  const runHint = () => {
    hint.running = true;
    setHintActive(true);
    const start = hint.nextCard % HINT_CARDS;
    let at = 0;
    for (let i = start, pos = 0; i < HINT_CARDS; i++, pos++) {
      // Pause croissante entre deux cartes, mesurée depuis la fin du
      // relâchement de la précédente — pas un intervalle fixe.
      if (pos > 0) at += HINT_HOLD_MS + HINT_RELEASE_MS + HINT_GAPS_MS[pos - 1];
      const cardIndex = i;
      const fireAt = at;
      hint.timers.push(
        setTimeout(() => {
          hint.step = cardIndex;
          setHintCard(cardIndex);
          onPeek?.();
        }, fireAt)
      );
      hint.timers.push(setTimeout(() => setHintCard(-1), fireAt + HINT_HOLD_MS));
    }
    const total = at + HINT_HOLD_MS + HINT_RELEASE_MS + D.slow;
    hint.timers.push(setTimeout(() => finishHint(0), total));
  };

  const armHint = () => {
    if (hint.idleTimer) clearTimeout(hint.idleTimer);
    if (hint.doneThisOpen || hint.running) return;
    hint.idleTimer = setTimeout(() => {
      hint.idleTimer = null;
      if (hint.doneThisOpen || hint.running || !hint.eligible) return;
      runHint();
    }, HINT_IDLE_MS);
  };

  // Un toucher pendant la séquence l'arrête net et avance la reprise d'une
  // carte ; avant la séquence, il repousse simplement le compte à rebours.
  const handleUserTouch = () => {
    if (hint.running) {
      onPeekCancel?.();
      finishHint((hint.step + 1) % HINT_CARDS);
      return;
    }
    armHint();
  };

  // "Une fois par ouverture" = par montage de l'écran (arrivée depuis le
  // Home), pas par retour de focus : revenir d'une fiche de séance ne doit
  // pas rejouer l'aperçu.
  useEffect(() => {
    hint.doneThisOpen = false;
    loadScrollHintNextCard().then((n) => {
      hint.nextCard = n;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      armHint();
      return () => {
        if (hint.running) onPeekCancel?.();
        clearHintTimers();
        hint.running = false;
        hint.step = -1;
        setHintCard(-1);
        setHintActive(false);
      };
    }, [])
  );

  // Changer de page (swipe ou points) compte comme "l'utilisateur a compris".
  useEffect(() => {
    if (pageIndex !== 0 && hint.running) {
      onPeekCancel?.();
      finishHint((hint.step + 1) % HINT_CARDS);
    }
    if (pageIndex !== 0) hint.doneThisOpen = true;
  }, [pageIndex]);

  const handleDelete = async (id) => {
    haptic.warning();
    const next = await removeSession(id);
    setSessions(next ?? sessions.filter((s) => s.id !== id));
  };

  const filtered =
    filter === 'TOUS' ? sessions : sessions.filter((s) => s.name === filter);

  const grouped = groupByDay(filtered);
  const shown = grouped.slice(0, visibleDays);
  const remainingDays = grouped.length - shown.length;
  const totals = computeTotals(sessions);
  const streak = computeStreak(sessions);

  // Les 3 premières cartes réellement affichées, dans l'ordre de la liste.
  const hintIds = shown.flatMap((g) => g.items).slice(0, HINT_CARDS).map((s) => s.id);
  hint.eligible = pageIndex === 0 && filtered.length >= HINT_MIN_SESSIONS;

  const handleFilter = (f) => {
    setFilter(f);
    setVisibleDays(DAYS_PER_PAGE);
  };

  const handleShowMore = () => {
    haptic.light();
    setVisibleDays((n) => n + DAYS_PER_PAGE);
  };

  return (
    <View style={[styles.page, { width, height }]} onTouchStart={handleUserTouch}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>HISTORIQUE</Text>
      </View>

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path
              d="M9 2L3 7l6 5"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>Mon historique</Text>
        </View>

        <Pressable onPress={() => router.push('/settings')} style={styles.iconBtn} hitSlop={8}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 15a3 3 0 100-6 3 3 0 000 6z"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      <View style={styles.heroRow}>
        <HeroStat label="SÉANCES" value={String(totals.count)} color="#FFFFFF" />
        <HeroStat label="TEMPS" value={totals.timeLabel} color="#1FC777" />
        <HeroStat label="STREAK" value={String(streak)} unit="j" color="#FFC933" />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map((f) => {
          const isActive = f === filter;
          const color = f === 'TOUS' ? '#FFFFFF' : findColor(f);
          return (
            <Pressable
              key={f}
              onPress={() => handleFilter(f)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: isActive ? color : 'rgba(255,255,255,0.06)',
                  borderColor: isActive ? color : 'rgba(255,255,255,0.12)',
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: isActive ? '#0A0A0A' : 'rgba(255,255,255,0.8)' },
                ]}
              >
                {f}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucune séance</Text>
            <Text style={styles.emptyHint}>
              {sessions.length === 0
                ? 'Lance ta première séance depuis le Home'
                : 'Aucune séance dans cette catégorie'}
            </Text>
          </View>
        ) : (
          <>
            {shown.map((group) => (
              <View key={group.key} style={styles.group}>
                <Text style={styles.groupLabel}>{group.date}</Text>
                {group.items.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    hinting={hintCard >= 0 && hintIds[hintCard] === s.id}
                    onPress={() =>
                      router.push({ pathname: '/session-detail', params: { id: s.id } })
                    }
                    onDelete={() => handleDelete(s.id)}
                  />
                ))}
              </View>
            ))}

            {remainingDays > 0 && (
              <View style={styles.moreWrap}>
                <PressTap onPress={handleShowMore} tapScale={0.94} style={styles.moreBtn}>
                  <Text style={styles.moreText}>VOIR PLUS</Text>
                  <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
                    <Path
                      d="M2 3.5L5 6.5l3-3"
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </PressTap>
                <Text style={styles.moreHint}>
                  ENCORE {remainingDays} {remainingDays > 1 ? 'JOURS' : 'JOUR'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: 8 + insets.bottom }]}>
        {hintActive && (
          <Animated.View
            entering={FadeIn.duration(D.base)}
            exiting={FadeOut.duration(D.fast)}
            style={styles.hintWrap}
            pointerEvents="none"
          >
            <Text style={styles.hintText}>Glisse vers la gauche pour voir ton planning</Text>
          </Animated.View>
        )}
        <PageDots count={2} activeIndex={pageIndex} onSelect={onSelectPage} />
      </View>
    </View>
  );
}

function HeroStat({ label, value, unit, color }) {
  return (
    <View style={styles.heroCard}>
      <View
        style={[styles.heroBlob, { backgroundColor: color, opacity: 0.18 }]}
        pointerEvents="none"
      />
      <Text style={styles.heroLabel}>{label}</Text>
      <View style={styles.heroValueRow}>
        <Text style={[styles.heroValue, { color }]}>{value}</Text>
        {unit && <Text style={styles.heroUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

function SessionRow({ session, hinting = false, onPress, onDelete }) {
  const color = session.color || '#FFFFFF';
  const tag = session.intensity || '—';
  const roundsLabel =
    session.totalRounds && session.completedRounds != null
      ? `${session.completedRounds} tours`
      : '∞';
  const swipeRef = useRef(null);

  // Simule la pression d'un doigt pendant l'aperçu "glisse vers le planning" :
  // même rétrécissement que le vrai `pressed`, plus un voile blanc (l'accent
  // de l'app) qui s'estompe au relâchement.
  const hintScale = useSharedValue(1);
  const hintTint = useSharedValue(0);
  useEffect(() => {
    if (hinting) {
      // Pression lente et posée (pas un tap réel) : on veut que l'oeil ait le
      // temps de la remarquer, pas un flash.
      hintScale.value = withTiming(0.97, { duration: 420, easing: easeImpact });
      hintTint.value = withTiming(1, { duration: 420 });
    } else {
      hintScale.value = withTiming(1, { duration: HINT_RELEASE_MS, easing: easeImpact });
      hintTint.value = withTiming(0, { duration: HINT_RELEASE_MS });
    }
  }, [hinting]);
  const hintStyle = useAnimatedStyle(() => ({
    transform: [{ scale: hintScale.value }],
  }));
  const hintTintStyle = useAnimatedStyle(() => ({
    opacity: hintTint.value,
  }));

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        swipeRef.current?.close();
        onDelete?.();
      }}
      style={({ pressed }) => [
        styles.deleteAction,
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
        <Path
          d="M3 5h12M7 5V3h4v2M5 5l1 10h6l1-10M8 8v5M10 8v5"
          stroke="#FFFFFF"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.deleteLabel}>Supprimer</Text>
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      containerStyle={styles.swipeContainer}
    >
      <Animated.View style={hintStyle}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={[styles.rowBlob, { backgroundColor: color }]} pointerEvents="none" />
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.hintTint, hintTintStyle]}
          pointerEvents="none"
        />
        <View
          style={[
            styles.rowBadge,
            { backgroundColor: `${color}22`, borderColor: `${color}44` },
          ]}
        >
          <Text style={[styles.rowBadgeText, { color }]}>{session.name.slice(0, 4)}</Text>
        </View>

        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{session.name}</Text>
          <View style={styles.rowMeta}>
            <Text style={styles.rowMetaText}>{formatSessionTime(session.date)}</Text>
            <Dot />
            <Text style={styles.rowMetaText}>{roundsLabel}</Text>
            <Dot />
            <Text style={styles.rowMetaText}>{tag}</Text>
          </View>
        </View>

        <View style={styles.rowDuration}>
          <Text style={styles.rowDurationValue}>
            {formatDuration(session.durationSeconds || 0)}
          </Text>
          <Text style={styles.rowDurationLabel}>min</Text>
        </View>

        <Svg width={8} height={12} viewBox="0 0 8 12" fill="none">
          <Path
            d="M2 2l4 4-4 4"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      </Animated.View>
    </Swipeable>
  );
}

function Dot() {
  return <View style={styles.metaDot} />;
}

const findColor = (name) => {
  const t = TIMERS.find((x) => x.name === name);
  return t ? t.color : '#FFFFFF';
};

const styles = StyleSheet.create({
  // Pas de `flex: 1` : dans une FlatList horizontale le conteneur est en
  // flexDirection row, donc flex:1 écraserait la largeur (flexBasis 0) et
  // laisserait la hauteur se faire dicter par le contenu. Largeur et hauteur
  // sont passées explicitement par le pager.
  page: {},

  statusBar: {
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.55)',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    alignItems: 'center',
  },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },

  heroRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 20,
  },
  heroCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroBlob: {
    position: 'absolute',
    top: -24,
    right: -24,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  heroLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroValue: {
    fontFamily: fonts.display,
    fontSize: 36,
    letterSpacing: -1,
    lineHeight: 36,
    includeFontPadding: false,
  },
  heroUnit: {
    fontFamily: fonts.sansSemibold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 2,
  },

  filtersRow: {
    flexGrow: 0,
    marginBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },

  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  bottom: {
    paddingTop: 10,
    paddingBottom: 8,
  },
  hintWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  hintText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  hintTint: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
  },

  empty: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  emptyHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },

  group: {
    marginBottom: 24,
  },

  moreWrap: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  moreText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.7,
    color: 'rgba(255,255,255,0.85)',
  },
  moreHint: {
    fontFamily: fonts.monoRegular,
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.35)',
  },
  groupLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  swipeContainer: {
    marginBottom: 8,
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    overflow: 'hidden',
  },
  deleteAction: {
    width: 96,
    backgroundColor: '#FF5454',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    gap: 4,
  },
  deleteLabel: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  rowBlob: {
    position: 'absolute',
    top: -16,
    left: -16,
    width: 64,
    height: 64,
    borderRadius: 32,
    opacity: 0.2,
  },
  rowBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  rowMetaText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.30)',
  },
  rowDuration: {
    alignItems: 'flex-end',
  },
  rowDurationValue: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  rowDurationLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 9,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.40)',
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
