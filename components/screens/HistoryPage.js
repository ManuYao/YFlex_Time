import { memo, useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import PageDots from '../common/PageDots';
import Button from '../common/Button';
import IconButton from '../common/IconButton';
import MixPill from '../common/MixPill';
import { TIMERS } from '../../lib/timers-config';
import MixCompositionBar from '../common/MixCompositionBar';
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
  formatMixBreakdown,
} from '../../lib/history';
import { formatDuration } from '../../lib/formatters';
import { fonts } from '../../lib/fonts';
import { D, easeImpact, popIn, popOut } from '../../lib/animations';
import { useHaptic } from '../../hooks/useHaptic';
import { useLongPress } from '../../hooks/useLongPress';
import ChipRow from '../common/ChipRow';
import HistorySkeleton from './HistorySkeleton';

const FILTERS = ['TOUS', 'AMRAP', 'BASIC', 'EMOM', 'TABATA', 'MIX'];

// Jours affichés d'un coup. Chaque jour monte plusieurs lignes Swipeable
// (un gesture handler chacune) : en limiter le nombre garde la liste fluide
// sur les longs historiques.
const DAYS_PER_PAGE = 3;

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

// Une seule liste vide partagée : une identité stable évite de recalculer les
// dérivés à chaque rendu tant que rien n'est chargé.
const EMPTY_SESSIONS = [];

// `memo` : le pager (app/history.js) se re-rend à chaque ouverture/fermeture d'une
// feuille du Planning (`onSheetChange`). Sans lui, cette page — hors de l'écran,
// mais montée — recalculait tout son historique et refaisait toutes ses lignes à
// chaque fois, ce qui alourdissait le gel déjà ressenti sur le Planning.
function HistoryPage({
  width,
  height,
  pageIndex,
  onSelectPage,
}) {
  const router = useRouter();
  const haptic = useHaptic();
  const insets = useSafeAreaInsets();
  // `null` tant que l'historique n'est pas lu : l'écran montre alors un squelette
  // (HistoryListSkeleton) au lieu du message « Aucune séance » qui clignotait une
  // fraction de seconde avant l'arrivée des vraies données.
  const [loadedSessions, setSessions] = useState(null);
  const loaded = loadedSessions !== null;
  const sessions = loadedSessions ?? EMPTY_SESSIONS;
  const [filter, setFilter] = useState('TOUS');
  const [visibleDays, setVisibleDays] = useState(DAYS_PER_PAGE);
  // null = affichage par défaut ; 'day' / 'week' = étape du carrousel.
  const [scope, setScope] = useState(null);
  const [shimmerTick, setShimmerTick] = useState(0);

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

  const handleFilter = (f) => {
    setFilter(f);
    setVisibleDays(DAYS_PER_PAGE);
  };

  const handleShowMore = () => {
    haptic.light();
    setVisibleDays((n) => n + DAYS_PER_PAGE);
  };

  return (
    <View style={[styles.page, { width, height }]}>
      {/* Fil conducteur : le MIX reste à un tap depuis toutes les grandes
          pages (components/common/MixPill.js). */}
      <View style={styles.statusBar}>
        <MixPill />
      </View>

      <View style={styles.topBar}>
        <IconButton
          icon="back"
          halo="left"
          haptic={haptic.light}
          onPress={() => router.back()}
          accessibilityLabel="Retour"
        />

        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>Mon historique</Text>
        </View>

        <IconButton
          icon="gear"
          halo="right"
          haptic={haptic.light}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Réglages"
        />
      </View>

      <View style={styles.heroRow}>
        <HeroStat
          label="SÉANCES"
          value={loaded ? String(countTotals.count) : '–'}
          caption={SCOPE_CAPTION[countScope]}
          color="#FFFFFF"
          shimmerKey={shimmerTick}
          pulseKey={scope}
          onLongPress={startScopeCarousel}
        />
        <HeroStat
          label="TEMPS"
          value={loaded ? timeTotals.timeLabel : '–'}
          caption={SCOPE_CAPTION[timeScope]}
          color="#1FC777"
          shimmerKey={shimmerTick}
          pulseKey={scope}
          onLongPress={startScopeCarousel}
        />
        <HeroStat
          label="STREAK"
          value={loaded ? String(streak) : '–'}
          unit={loaded ? 'j' : undefined}
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

      <ChipRow
        style={styles.filtersRow}
        contentContainerStyle={styles.filtersContent}
        activeIndex={FILTERS.indexOf(filter)}
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
      </ChipRow>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {!loaded ? (
          <HistorySkeleton />
        ) : grouped.length === 0 ? (
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
                  <View key={s.id}>
                    <SessionRow
                      session={s}
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
                {/* Système de boutons (lib/buttonTokens.js) : petite capsule
                    de verre. La vibration vient de handleShowMore (une seule). */}
                <Button variant="glass" size="sm" label="Voir plus" onPress={handleShowMore} />
                <Text style={styles.moreHint}>
                  ENCORE {remainingDays} {remainingDays > 1 ? 'JOURS' : 'JOUR'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: 8 + insets.bottom }]}>
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

function SessionRow({ session, onPress, onDelete, onKeep }) {
  // Séance arrêtée avant 6 s (lib/history.js) : la carte arrive déjà glissée
  // du côté opposé à la suppression, sur « Annuler la suppression ». Pour la
  // supprimer tout de suite, on la glisse dans l'autre sens comme une autre.
  const pending = !!session.pendingDelete;
  const color = session.color || '#FFFFFF';
  const tag = session.intensity || '—';
  const hasComposition = !!formatMixBreakdown(session);
  const roundsLabel =
    session.totalRounds && session.completedRounds != null
      ? `${session.completedRounds} tours`
      : '∞';
  const swipeRef = useRef(null);

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
      <Animated.View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          pending && styles.rowPending,
          pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={[styles.rowBlob, { backgroundColor: color }]} pointerEvents="none" />
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
            {hasComposition ? (
              <MixCompositionBar session={session} width={44} height={5} />
            ) : (
              <Text style={styles.rowMetaText}>{roundsLabel}</Text>
            )}
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

export default memo(HistoryPage);
