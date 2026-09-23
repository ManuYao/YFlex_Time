import { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import PageDots from '../common/PageDots';
import PressTap from '../common/PressTap';
import { TIMERS } from '../../lib/timers-config';
import {
  loadHistory,
  removeSession,
  keepSession,
  groupByDay,
  computeStreak,
  computeScopedTotals,
  computeTypeBreakdown,
  defaultTimeScope,
  formatSessionTime,
} from '../../lib/history';
import { loadScrollHintNextCard, saveScrollHintNextCard } from '../../lib/scrollHint';
import { formatDuration } from '../../lib/formatters';
import { fonts } from '../../lib/fonts';
import { D, easeImpact, popIn, popOut } from '../../lib/animations';
import { useHaptic } from '../../hooks/useHaptic';
import { useLongPress } from '../../hooks/useLongPress';

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
// Relances suivantes : l'aperçu ne se rejoue qu'après une inactivité
// nettement plus longue (l'utilisateur a touché l'écran entre-temps, il n'est
// pas perdu — inutile de le relancer aussi vite que la première fois).
const HINT_REPLAY_IDLE_MS = 12000;
// Garde-fou : passé ce nombre de passages dans une même ouverture, on arrête
// de proposer. Au-delà ce n'est plus un indice, c'est du harcèlement.
const HINT_MAX_RUNS = 3;
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

// Carrousel des cartes de tête (appui long sur "Séances" ou "Temps") :
// aujourd'hui, puis la semaine, puis retour à l'affichage par défaut.
const SCOPE_HOLD_MS = 2000;
const SCOPE_STEP_MS = 5000;
// Brillance : une fois à l'ouverture, puis rappel espacé pour signaler que
// les deux cartes réagissent à l'appui long sans clignoter en permanence.
const SHIMMER_EVERY_MS = 30000;

// Sous-titre de la carte : sans lui, un chiffre "du jour" à la place du cumul
// de toujours serait un mensonge silencieux. Version courte de SCOPE_LABEL
// (lib/history.js) — les cartes font ~90 px de large.
const SCOPE_CAPTION = {
  all: 'TOTAL',
  day: "AUJOURD'HUI",
  week: 'SEMAINE',
};

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
  const [hintId, setHintId] = useState(null);
  const [hintActive, setHintActive] = useState(false);
  // null = affichage par défaut ; 'day' / 'week' = étape du carrousel.
  const [scope, setScope] = useState(null);
  const [shimmerTick, setShimmerTick] = useState(0);

  // Tout l'état de l'aperçu vit dans des refs : la séquence est pilotée par
  // des setTimeout qui doivent lire les valeurs du moment, pas celles
  // capturées au rendu qui les a posés.
  const hint = useRef({
    timers: [],
    idleTimer: null,
    running: false,
    stopped: false,
    runs: 0,
    nextCard: 0,
    step: -1,
    eligible: false,
  }).current;

  // Position des cartes dans la liste, pour viser celles réellement visibles
  // en bas de l'écran (l'aperçu ne sert à rien s'il presse une carte sortie
  // du champ). onLayout donne des coordonnées relatives au parent : on
  // additionne l'offset du groupe (le jour) et celui de la ligne.
  const geom = useRef({
    scrollY: 0,
    viewportH: 0,
    groups: {},
    rows: {},
    order: [],
  }).current;

  // Carrousel des cartes de tête : une seule séquence à la fois.
  const scopeTimers = useRef([]).current;
  const clearScopeTimers = () => {
    scopeTimers.forEach(clearTimeout);
    scopeTimers.length = 0;
  };

  const startScopeCarousel = () => {
    clearScopeTimers();
    setScope('day');
    scopeTimers.push(setTimeout(() => setScope('week'), SCOPE_STEP_MS));
    scopeTimers.push(setTimeout(() => setScope(null), SCOPE_STEP_MS * 2));
  };

  useEffect(() => {
    const id = setInterval(() => setShimmerTick((n) => n + 1), SHIMMER_EVERY_MS);
    return () => {
      clearInterval(id);
      clearScopeTimers();
    };
  }, []);

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
    hint.runs += 1;
    hint.nextCard = nextCard;
    hint.step = -1;
    setHintId(null);
    setHintActive(false);
    saveScrollHintNextCard(nextCard);
    // Ne clôt pas le sujet : une nouvelle inactivité (bien plus longue) peut
    // relancer l'aperçu, jusqu'à HINT_MAX_RUNS.
    armHint();
  };

  /**
   * Les HINT_CARDS dernières cartes entièrement visibles dans le viewport —
   * donc celles du bas de l'écran, là où le pouce se trouve déjà. Repli sur
   * les premières de la liste tant que rien n'est mesuré.
   */
  const hintTargets = () => {
    const visible = geom.order.filter((id) => {
      const row = geom.rows[id];
      if (!row) return false;
      const groupY = geom.groups[row.groupKey];
      if (groupY == null) return false;
      const top = groupY + row.y;
      return (
        top >= geom.scrollY - 2 &&
        top + row.h <= geom.scrollY + geom.viewportH + 2
      );
    });
    const list = visible.length > 0 ? visible : geom.order;
    return list.slice(-HINT_CARDS);
  };

  const runHint = () => {
    const targets = hintTargets();
    if (targets.length === 0) return;
    hint.running = true;
    setHintActive(true);
    const start = Math.min(hint.nextCard, targets.length - 1);
    let at = 0;
    for (let i = start, pos = 0; i < targets.length; i++, pos++) {
      // Pause croissante entre deux cartes, mesurée depuis la fin du
      // relâchement de la précédente — pas un intervalle fixe.
      if (pos > 0) {
        const gap = HINT_GAPS_MS[pos - 1] ?? HINT_GAPS_MS[HINT_GAPS_MS.length - 1];
        at += HINT_HOLD_MS + HINT_RELEASE_MS + gap;
      }
      const cardIndex = i;
      const cardId = targets[i];
      const fireAt = at;
      hint.timers.push(
        setTimeout(() => {
          hint.step = cardIndex;
          setHintId(cardId);
          onPeek?.();
        }, fireAt)
      );
      hint.timers.push(setTimeout(() => setHintId(null), fireAt + HINT_HOLD_MS));
    }
    const total = at + HINT_HOLD_MS + HINT_RELEASE_MS + D.slow;
    hint.timers.push(setTimeout(() => finishHint(0), total));
  };

  const armHint = () => {
    if (hint.idleTimer) clearTimeout(hint.idleTimer);
    hint.idleTimer = null;
    if (hint.stopped || hint.running || hint.runs >= HINT_MAX_RUNS) return;
    const delay = hint.runs === 0 ? HINT_IDLE_MS : HINT_REPLAY_IDLE_MS;
    hint.idleTimer = setTimeout(() => {
      hint.idleTimer = null;
      if (hint.stopped || hint.running || !hint.eligible) return;
      runHint();
    }, delay);
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

  // Le compteur de passages repart à chaque montage de l'écran (arrivée
  // depuis le Home), pas à chaque retour de focus : revenir d'une fiche de
  // séance ne doit pas redonner droit à trois aperçus.
  useEffect(() => {
    hint.stopped = false;
    hint.runs = 0;
    loadScrollHintNextCard().then((n) => {
      hint.nextCard = n % HINT_CARDS;
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
        setHintId(null);
        setHintActive(false);
      };
    }, [])
  );

  // Changer de page (swipe ou points) compte comme "l'utilisateur a compris" :
  // là, on arrête définitivement pour cette ouverture.
  useEffect(() => {
    if (pageIndex === 0) return;
    hint.stopped = true;
    if (hint.running) {
      onPeekCancel?.();
      finishHint((hint.step + 1) % HINT_CARDS);
    } else {
      clearHintTimers();
    }
  }, [pageIndex]);

  const handleDelete = async (id) => {
    haptic.warning();
    const next = await removeSession(id);
    setSessions(next ?? sessions.filter((s) => s.id !== id));
  };

  const handleKeep = async (id) => {
    haptic.success();
    const next = await keepSession(id);
    setSessions(
      next ??
        sessions.map((s) => {
          if (s.id !== id) return s;
          const { pendingDelete, ...rest } = s;
          return rest;
        })
    );
  };

  const filtered =
    filter === 'TOUS' ? sessions : sessions.filter((s) => s.name === filter);

  const grouped = groupByDay(filtered);
  const shown = grouped.slice(0, visibleDays);
  const remainingDays = grouped.length - shown.length;
  const streak = computeStreak(sessions);

  // Hors carrousel, seule la carte "Temps" bascule sur la journée, et
  // seulement si elle est bien remplie (> 5 min) : un 02:00 mis en avant à la
  // place du cumul de toujours ferait plus petit qu'on est.
  const timeScope = scope ?? defaultTimeScope(sessions);
  const countScope = scope ?? 'all';
  const timeTotals = computeScopedTotals(sessions, timeScope);
  const countTotals = computeScopedTotals(sessions, countScope);
  const breakdown = scope ? computeTypeBreakdown(sessions, scope) : [];

  // Ordre d'affichage des cartes, pour que l'aperçu sache lesquelles sont en
  // bas de l'écran.
  geom.order = shown.flatMap((g) => g.items).map((s) => s.id);
  // Pas d'aperçu pendant que le carrousel des cartes de tête tourne : deux
  // animations d'aide en même temps, ça fait juste un écran agité.
  hint.eligible = pageIndex === 0 && filtered.length >= HINT_MIN_SESSIONS && !scope;

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
        <HeroStat
          label="SÉANCES"
          value={String(countTotals.count)}
          caption={SCOPE_CAPTION[countScope]}
          color="#FFFFFF"
          shimmerKey={shimmerTick}
          pulseKey={scope}
          onLongPress={startScopeCarousel}
        />
        <HeroStat
          label="TEMPS"
          value={timeTotals.timeLabel}
          caption={SCOPE_CAPTION[timeScope]}
          color="#1FC777"
          shimmerKey={shimmerTick}
          pulseKey={scope}
          onLongPress={startScopeCarousel}
        />
        <HeroStat
          label="STREAK"
          value={String(streak)}
          unit="j"
          caption="D'AFFILÉE"
          color="#FFC933"
          shimmerKey={shimmerTick}
          pulseKey={scope}
          onLongPress={startScopeCarousel}
        />
      </View>

      {/* Bande de répartition : n'apparaît que pendant le carrousel — AUCUNE
          hauteur réservée hors de ce moment, la mise en page redevient
          exactement celle d'avant une fois revenu à l'affichage par défaut.
          Le View racine anime son propre passage de 0 à sa hauteur réelle
          via `layout`. Barre segmentée aux couleurs des modes plutôt qu'une
          liste "NOM nombre" écrite — plus lisible d'un coup d'œil, et un
          rectangle plein se centre proprement (contrairement à du texte, qui
          traîne toujours un peu de marge de police asymétrique autour de sa
          ligne de base — retour utilisateur). Chaque segment est large
          proportionnellement à son compte (`flex: count`) et anime sa propre
          largeur (`layout`) quand on bascule jour ↔ semaine. */}
      <Animated.View
        layout={LinearTransition.duration(D.base).easing(easeImpact)}
        style={styles.breakdownRow}
      >
        {!!scope && (
          <Animated.View
            entering={popIn(0.82, D.medium)}
            exiting={popOut(1.06, D.fast)}
            style={styles.breakdownInner}
          >
            {breakdown.length === 0 ? (
              <Animated.Text
                key="empty"
                entering={popIn(0.85, D.base)}
                exiting={popOut(1.05, D.fast)}
                layout={LinearTransition.duration(D.base).easing(easeImpact)}
                style={styles.breakdownEmpty}
              >
                {scope === 'day' ? "RIEN AUJOURD'HUI" : 'RIEN CETTE SEMAINE'}
              </Animated.Text>
            ) : (
              <View style={styles.breakdownBarTrack}>
                {breakdown
                  .slice(0, 4)
                  .map((b) => (
                    <BreakdownSegment key={b.name} count={b.count} color={b.color} />
                  ))}
              </View>
            )}
          </Animated.View>
        )}
      </Animated.View>

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
        scrollEventThrottle={32}
        onLayout={(e) => {
          geom.viewportH = e.nativeEvent.layout.height;
        }}
        onScroll={(e) => {
          // Écrit une ref, ne redéclenche pas de rendu : c'est juste la
          // position dont l'aperçu a besoin pour viser le bas de l'écran.
          geom.scrollY = e.nativeEvent.contentOffset.y;
        }}
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
              <View
                key={group.key}
                style={styles.group}
                onLayout={(e) => {
                  geom.groups[group.key] = e.nativeEvent.layout.y;
                }}
              >
                <Text style={styles.groupLabel}>{group.date}</Text>
                {group.items.map((s) => (
                  <View
                    key={s.id}
                    onLayout={(e) => {
                      const { y, height } = e.nativeEvent.layout;
                      geom.rows[s.id] = { groupKey: group.key, y, h: height };
                    }}
                  >
                    <SessionRow
                      session={s}
                      hinting={hintId === s.id}
                      onPress={() =>
                        router.push({ pathname: '/session-detail', params: { id: s.id } })
                      }
                      onDelete={() => handleDelete(s.id)}
                      onKeep={() => handleKeep(s.id)}
                    />
                  </View>
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

function HeroStat({ label, value, unit, color, caption, shimmerKey, pulseKey, onLongPress }) {
  const [cardW, setCardW] = useState(0);
  const { isPressing, progress, start, cancel } = useLongPress(onLongPress, SCOPE_HOLD_MS);

  // Signal de changement à chaque bascule jour → semaine → total : PAS sur le
  // texte lui-même (deux essais précédents — scale au montage, puis
  // remontage par clé — ont fini par désaligner durablement le chiffre :
  // `adjustsFontSizeToFit` mesure le texte pendant qu'une transform lui est
  // appliquée et se fige sur une taille fausse une fois l'animation finie).
  // On pulse à la place le halo coloré déjà présent derrière la carte —
  // seule l'opacité bouge, aucun risque sur la mise en page du texte, qui
  // reste maintenant totalement statique.
  // `pulseKey` (la portée courante) en plus de value/caption : Streak affiche
  // le même nombre de jours quelle que soit la portée, donc sans lui sa carte
  // resterait inerte pendant que les deux autres pulsent — l'incohérence que
  // l'ajout de l'appui long sur cette carte devait justement faire
  // disparaître.
  const blobPulse = useSharedValue(0);
  useEffect(() => {
    blobPulse.value = 0;
    blobPulse.value = withSequence(
      withTiming(1, { duration: 160, easing: easeImpact }),
      withTiming(0, { duration: 500, easing: easeImpact })
    );
  }, [value, caption, pulseKey]);
  const blobStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + blobPulse.value * 0.42,
  }));

  // Brillance : une bande claire traverse la carte de gauche à droite.
  const shine = useSharedValue(-1);
  useEffect(() => {
    if (shimmerKey == null) return;
    shine.value = -1;
    shine.value = withDelay(
      120,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) })
    );
  }, [shimmerKey]);
  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shine.value * (cardW + 70) }],
  }));

  const card = (
    <View
      style={styles.heroCard}
      onLayout={(e) => setCardW(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[styles.heroBlob, { backgroundColor: color }, blobStyle]}
        pointerEvents="none"
      />

      {shimmerKey != null && cardW > 0 && (
        <Animated.View style={[styles.heroShine, shineStyle]} pointerEvents="none">
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.16)',
              'rgba(255,255,255,0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      <Text style={styles.heroLabel}>{label}</Text>
      {/* Le texte reste statique — jamais de transform ni de remontage
          dessus (voir le commentaire sur blobPulse plus haut). Le halo
          derrière la carte porte seul le signal de changement. */}
      <View style={styles.heroValueRow}>
        <Text style={[styles.heroValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {unit && <Text style={styles.heroUnit}>{unit}</Text>}
      </View>
      {!!caption && (
        <Text style={styles.heroCaption} numberOfLines={1} adjustsFontSizeToFit>
          {caption}
        </Text>
      )}

      {isPressing && (
        <View
          style={[styles.heroHold, { width: `${progress * 100}%`, backgroundColor: color }]}
          pointerEvents="none"
        />
      )}
    </View>
  );

  if (!onLongPress) return card;

  return (
    <Pressable
      style={styles.heroPressable}
      onPressIn={start}
      onPressOut={cancel}
      // Pas de onPress : la carte n'est pas un bouton, seul l'appui long
      // (2 s, avec son trait de progression) déclenche quelque chose.
    >
      {card}
    </Pressable>
  );
}

/**
 * Un segment de la barre de répartition — un rectangle plein coloré, large
 * proportionnellement à `count` (`flex: count` dans une rangée : la même
 * logique qu'une jauge de stockage empilée). `layout` anime le changement de
 * largeur quand un mode gagne ou perd du terrain d'un scope à l'autre — pas
 * besoin d'un pulse de valeur séparé (contrairement à l'ancienne version en
 * texte) : un segment qui grossit ou rétrécit EST déjà l'animation.
 */
function BreakdownSegment({ count, color }) {
  return (
    <Animated.View
      entering={popIn(0.5, D.medium)}
      exiting={popOut(1, D.fast)}
      layout={LinearTransition.duration(D.base).easing(easeImpact)}
      style={{ flex: count, minWidth: 6, backgroundColor: color || '#FFFFFF' }}
    />
  );
}

// Délai avant l'ouverture automatique d'une carte en sursis : laisse l'écran
// se poser pour que le glissement se voie, au lieu d'arriver déjà ouvert.
const PENDING_OPEN_DELAY_MS = 450;

function SessionRow({ session, hinting = false, onPress, onDelete, onKeep }) {
  // Séance arrêtée avant 6 s (lib/history.js) : la carte arrive déjà glissée
  // du côté opposé à la suppression, sur « Annuler la suppression ». Pour la
  // supprimer tout de suite, on la glisse dans l'autre sens comme une autre.
  const pending = !!session.pendingDelete;
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

  useEffect(() => {
    if (!pending) return undefined;
    const t = setTimeout(() => swipeRef.current?.openLeft(), PENDING_OPEN_DELAY_MS);
    return () => clearTimeout(t);
  }, [pending]);

  const renderLeftActions = () => (
    <Pressable
      onPress={() => {
        swipeRef.current?.close();
        onKeep?.();
      }}
      style={({ pressed }) => [
        styles.keepAction,
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
        <Path
          d="M6 3.5 3 6.5l3 3M3.5 6.5h7a4 4 0 0 1 0 8H7"
          stroke="#0A0A0A"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.keepLabel}>{'Annuler la\nsuppression'}</Text>
    </Pressable>
  );

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
      renderLeftActions={pending ? renderLeftActions : undefined}
      overshootRight={false}
      overshootLeft={false}
      friction={2}
      rightThreshold={40}
      leftThreshold={40}
      containerStyle={styles.swipeContainer}
    >
      <Animated.View style={hintStyle}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          pending && styles.rowPending,
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
    // Espacement d'origine : breakdownRow n'a plus de hauteur figée, donc
    // rien à lui laisser ici en permanence — seulement pendant qu'il affiche
    // quelque chose (voir breakdownInner.paddingVertical plus bas).
    marginBottom: 20,
  },
  // flex sur le Pressable, pas sur la carte : sans ce relais la carte
  // enveloppée se réduirait à la largeur de son contenu.
  heroPressable: {
    flex: 1,
  },
  heroCard: {
    // `flexGrow`, surtout PAS `flex: 1` : ce raccourci pose flexBasis 0, donc
    // une hauteur de base nulle. Dans le Pressable (axe vertical), plus rien
    // ne donne alors sa hauteur à la rangée — les trois cartes s'écrasent au
    // seul padding et `overflow: hidden` coupe le texte. Tant qu'une carte
    // échappait au Pressable elle servait de gabarit et masquait le problème.
    // Ici flexBasis reste `auto` : le contenu fixe la hauteur, et grow ne sert
    // qu'à égaliser les trois cartes sur la plus haute.
    flexGrow: 1,
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
  heroCaption: {
    fontFamily: fonts.monoRegular,
    fontSize: 8,
    letterSpacing: 0.9,
    color: 'rgba(255,255,255,0.38)',
    marginTop: 4,
  },
  heroShine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -35,
    width: 70,
  },
  heroHold: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2,
  },

  breakdownRow: {
    // Pas de hauteur figée : la place n'existe QUE pendant que la
    // répartition est affichée, pas en permanence. `layout` sur ce View
    // (posé côté JSX, voir plus bas) anime son passage de 0 à sa hauteur
    // réelle — et inversement à la fin du carrousel, où tout redevient
    // pile comme avant (cartes → filtres directement, sans blanc résiduel).
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownInner: {
    // Pleine largeur pour que la barre s'étire d'un bord à l'autre — l'ancien
    // contenu (chips texte) se contentait de sa largeur de contenu, ce qui
    // laissait `breakdownRow` le recentrer, mais un rectangle plein a besoin
    // de la largeur explicitement pour ne pas se réduire à rien.
    width: '100%',
    alignItems: 'center',
    // La "respiration" demandée ne vaut que pendant l'affichage : elle vit
    // ici, sur le contenu qui apparaît/disparaît, pas sur breakdownRow qui
    // resterait sinon en permanence plus haut qu'avant.
    paddingVertical: 8,
  },
  breakdownBarTrack: {
    flexDirection: 'row',
    width: '100%',
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  breakdownEmpty: {
    fontFamily: fonts.sansMedium,
    fontSize: 10.5,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
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
  keepAction: {
    width: 116,
    backgroundColor: '#1FC777',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    gap: 5,
    paddingHorizontal: 8,
  },
  keepLabel: {
    color: '#0A0A0A',
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  // Carte en sursis : estompée tant qu'on ne l'a pas gardée.
  rowPending: {
    opacity: 0.55,
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
