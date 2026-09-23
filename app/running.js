import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import TickRing from '../components/common/TickRing';
import LongPressButton from '../components/common/LongPressButton';
import { useTimers } from '../contexts/TimersContext';
import { computeState, skipToNextPhaseElapsed } from '../lib/timer-engine';
import { getTokens } from '../lib/tokens';
import { fonts } from '../lib/fonts';
import { formatDuration } from '../lib/formatters';
import { restGradient } from '../lib/phase-colors';
import { useTimer } from '../hooks/useTimer';
import { useUiScale, scaled, useLayoutLevel } from '../lib/responsive';
import { useHaptic } from '../hooks/useHaptic';
import { useWakeLock } from '../hooks/useWakeLock';
import { useSound } from '../hooks/useSound';
import { tickVoiceCoach, speakEnd, stopVoiceCoach } from '../lib/voiceCoach';
import {
  TIMER_ACTIONS,
  onTimerNotificationAction,
  startTimerNotification,
  stopTimerNotification,
  updateTimerNotification,
} from '../lib/timerNotification';

const easeImpact = Easing.bezier(0.22, 1, 0.36, 1);
const springEnergetic = { stiffness: 380, damping: 22, mass: 1 };

export default function Running() {
  const router = useRouter();
  const { timerId } = useLocalSearchParams();
  const haptic = useHaptic();
  const sound = useSound();
  const { timers } = useTimers();

  const timer = timers.find((t) => t.id === timerId) ?? timers[0];
  const t = getTokens(timer.textMode);

  // Vaut 1 sur un telephone normal : rien ne bouge. Ne se reduit qu'en
  // fenetre flottante / split-screen (voir lib/responsive.js).
  const ui = useUiScale();

  // (V) Mise en page réduite. C'est ici qu'elle compte le plus : on réduit
  // la fenêtre pendant la séance, pour garder son programme visible à côté.
  // Le chrono doit rester lisible et pilotable dans une bande étroite, donc
  // en mini l'anneau disparaît au profit du temps — la seule chose qu'on
  // regarde vraiment en plein effort.
  const level = useLayoutLevel();
  const isMini = level === 'mini';
  const isReduced = isMini || level === 'compact';
  const ring = scaled(level === 'compact' ? 260 : 320, ui);
  const bigTimeSize = isMini ? scaled(64, ui) : scaled(level === 'compact' ? 62 : 76, ui);

  const {
    secondsElapsed,
    isPaused,
    pause,
    resume,
    seek,
  } = useTimer({ autoStart: true });

  useWakeLock(true);

  const [restTriggers, setRestTriggers] = useState([]);
  const isManualBasic = timer.id === 'basic';
  const isEmom = timer.id === 'emom';
  const ctx = isManualBasic ? { restTriggers } : undefined;

  const state = computeState(timer, secondsElapsed, ctx) ?? fallbackState();
  const isWorkInfinite = state.countDirection === 'up';
  // Dernier tour BASIC : le bouton central ne lance plus un repos, il
  // termine direct la séance (voir basic() dans timer-engine.js) — le
  // libellé doit le dire, sinon on retombe dans la confusion "pourquoi ça
  // me met en repos alors que je viens de finir".
  const isLastBasicWork = isManualBasic && isWorkInfinite && state.currentRound === state.totalRounds;
  const lastPhaseRef = useRef(state.phaseLabel);
  const navigatedRef = useRef(false);
  const skippedRef = useRef(0);
  // Photo précédente pour le coach vocal (lib/voiceCoach.js) : comparée à
  // chaque tick pour détecter les changements de phase / seuils de
  // progression. Ne dit rien si `enabled` est faux (réglage Paramètres) —
  // pas besoin de le vérifier ici, tickVoiceCoach le fait lui-même.
  const voicePrevRef = useRef(null);

  useEffect(() => {
    if (state.phaseLabel !== lastPhaseRef.current) {
      lastPhaseRef.current = state.phaseLabel;
      if (!state.isComplete) {
        haptic.medium();
      }
    }
  }, [state.phaseLabel, state.isComplete]);

  useEffect(() => {
    if (isPaused || state.isComplete) return;
    tickVoiceCoach(voicePrevRef, state, secondsElapsed, timer.id);
  }, [secondsElapsed, isPaused, state.isComplete]);

  useEffect(() => {
    if (state.isComplete && !navigatedRef.current) {
      navigatedRef.current = true;
      haptic.success();
      sound.playGo();
      speakEnd();
      setTimeout(() => haptic.success(), 220);
      const realElapsed = Math.max(
        0,
        Math.floor(state.totalSecondsTarget - skippedRef.current)
      );
      router.replace({
        pathname: '/end-session',
        params: {
          timerId: timer.id,
          elapsed: realElapsed,
          // BASIC calcule ses stats (tours faits, travail/repos) à partir des
          // restTriggers : sans ça, une séance qui se termine naturellement
          // (pas via "Retour") arrive sur l'écran de fin avec 0 tour compté.
          ...(isManualBasic ? { ctx: JSON.stringify({ restTriggers }) } : {}),
        },
      });
    }
  }, [state.isComplete]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const handleReturn = () => {
    haptic.warning();
    if (isManualBasic) {
      router.replace({
        pathname: '/end-session',
        params: {
          timerId: timer.id,
          elapsed: Math.floor(secondsElapsed),
          ctx: JSON.stringify({ restTriggers }),
        },
      });
      return;
    }
    router.replace({ pathname: '/home', params: { lastTimerId: timer.id } });
  };

  const handleReset = () => {
    haptic.warning();
    navigatedRef.current = false;
    lastPhaseRef.current = '';
    skippedRef.current = 0;
    voicePrevRef.current = null;
    if (isManualBasic) setRestTriggers([]);
    if (isPaused) resume();
    seek(0);
  };

  const handlePauseToggle = () => {
    haptic.medium();
    if (isPaused) resume();
    else pause();
  };

  const handleSkip = () => {
    if (isManualBasic && isWorkInfinite) {
      // No skip during infinite work — use "Fin du travail" instead.
      return;
    }
    skippedRef.current += state.phaseSecondsLeft;
    const next = skipToNextPhaseElapsed(timer, secondsElapsed, ctx);
    seek(next);
    haptic.medium();
  };

  // EMOM : terminer la séance en cours de route SANS la perdre. L'appui long
  // "Retour" renvoie au Home et jette la séance (comportement voulu pour
  // "je me suis trompé de timer") — ici on part sur l'écran de fin, donc la
  // séance est comptée dans l'historique avec les tours réellement faits.
  const handleFinish = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    const done = Math.min(
      Math.floor(secondsElapsed),
      Math.floor(state.totalSecondsTarget)
    );
    router.replace({
      pathname: '/end-session',
      params: { timerId: timer.id, elapsed: done },
    });
  };

  const handleEndWork = () => {
    if (!isManualBasic || !isWorkInfinite) return;
    // haptic + phase sound are emitted by the phase-change effect on re-render.
    setRestTriggers((prev) => [...prev, secondsElapsed]);
  };

  // Bouton "Stop" de la notification : on termine la séance EN LA GARDANT
  // (écran de fin, historique), comme le "Fin" d'EMOM — depuis le volet de
  // notifications on ne peut pas faire d'appui long, et jeter la séance
  // sur un tap serait bien pire que la compter un peu courte.
  const handleStop = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    haptic.warning();
    const elapsedWhole = Math.floor(secondsElapsed);
    const done =
      state.totalSecondsTarget > 0
        ? Math.min(elapsedWhole, Math.floor(state.totalSecondsTarget))
        : elapsedWhole;
    router.replace({
      pathname: '/end-session',
      params: {
        timerId: timer.id,
        elapsed: done,
        ...(isManualBasic ? { ctx: JSON.stringify({ restTriggers }) } : {}),
      },
    });
  };

  const displaySeconds = isWorkInfinite
    ? Math.floor(state.phaseSecondsLeft)
    : Math.ceil(state.phaseSecondsLeft);
  const centerLabel = isWorkInfinite ? 'ÉCOULÉ' : 'RESTANT';

  // Decompte sonore des trois dernieres secondes d'une phase (sons 1/2/3
  // dans l'ordre de lecture : le 1 a T-3s, le 3 a T-1s — ce dernier dure
  // 1,5 s et couvre donc la bascule elle-meme, d'ou l'absence de son propre
  // au changement de phase). Pas de decompte quand le temps monte (BASIC en
  // travail libre n'a pas de fin prevue) ni en pause.
  const lastCueRef = useRef(null);
  useEffect(() => {
    if (isPaused || isWorkInfinite || state.isComplete) return;
    if (displaySeconds < 1 || displaySeconds > 3) return;
    // La cle inclut le tour : deux tours d'affilee portent le meme libelle de
    // phase (BASIC, EMOM), et sans lui le decompte ne sonnerait qu'au premier.
    const cue = `${state.currentRound}:${state.phaseLabel}:${displaySeconds}`;
    if (lastCueRef.current === cue) return;
    lastCueRef.current = cue;
    sound.playNextPhase(4 - displaySeconds);
  }, [displaySeconds, isPaused, isWorkInfinite, state.isComplete, state.currentRound, state.phaseLabel]);
  const ctaLabel = isPaused ? 'EN PAUSE' : 'EN COURS';

  // Libellé du 3ᵉ bouton de la notification : "Passer" partout, sauf BASIC en
  // travail libre où il joue le rôle du bouton central (REPOS / FINI), et
  // EMOM où avancer d'une minute n'a pas de sens (pas de bouton du tout).
  const notifSkipLabel = isEmom
    ? null
    : isManualBasic && isWorkInfinite
    ? isLastBasicWork
      ? 'Fini'
      : 'Repos'
    : 'Passer';

  // Notification persistante (Android) : démarrée avec l'écran, coupée avec
  // lui — quitter Running, quelle qu'en soit la raison, retire la notif et
  // arrête le service de premier plan.
  useEffect(() => {
    startTimerNotification();
    return () => {
      stopTimerNotification();
      // Quitter Running en pleine phrase ne doit pas laisser le coach
      // continuer à parler par-dessus l'écran suivant (Home, fin de séance…).
      stopVoiceCoach();
    };
  }, []);

  // Une réécriture par seconde affichée (même valeur que le gros chiffre),
  // plus à chaque changement de phase / tour / pause.
  useEffect(() => {
    if (state.isComplete) return;
    updateTimerNotification({
      timerName: timer.name,
      color: timer.color,
      phaseLabel: state.phaseLabel,
      roundLabel: state.roundLabel,
      seconds: displaySeconds,
      phaseTotal: state.phaseSecondsTotal,
      countUp: isWorkInfinite,
      isPaused,
      skipLabel: notifSkipLabel,
    });
  }, [displaySeconds, state.phaseLabel, state.roundLabel, isPaused, isWorkInfinite, notifSkipLabel, state.isComplete]);

  // Les boutons de la notification pilotent les MÊMES handlers que l'écran.
  // Ref pour s'abonner une seule fois tout en lisant toujours la dernière
  // version des handlers (ils capturent l'état courant à chaque rendu).
  const actionsRef = useRef(null);
  actionsRef.current = {
    // Gardes explicites : un tap sur un bouton déjà obsolète (notif pas
    // encore réécrite) ne doit pas inverser l'état par erreur.
    [TIMER_ACTIONS.PAUSE]: () => {
      if (!isPaused) handlePauseToggle();
    },
    [TIMER_ACTIONS.RESUME]: () => {
      if (isPaused) handlePauseToggle();
    },
    [TIMER_ACTIONS.SKIP]: isManualBasic && isWorkInfinite ? handleEndWork : handleSkip,
    [TIMER_ACTIONS.STOP]: handleStop,
  };
  useEffect(
    () => onTimerNotificationAction((action) => actionsRef.current?.[action]?.()),
    []
  );

  // Pulse ambiant — overlay LinearGradient timer.bgColors, opacity 0→0.15→0 cycle 2s
  const pulseOpacity = useSharedValue(0);
  useEffect(() => {
    if (isPaused) {
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = withTiming(0, { duration: 300 });
    } else {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }
    return () => cancelAnimation(pulseOpacity);
  }, [isPaused]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  // Ring breathing — scale [1, 1.012, 1] cycle 1s quand running
  const ringScale = useSharedValue(1);
  useEffect(() => {
    if (isPaused) {
      cancelAnimation(ringScale);
      ringScale.value = withTiming(1, { duration: 300 });
    } else {
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.012, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }
    return () => cancelAnimation(ringScale);
  }, [isPaused]);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  // Phase label + time transition à chaque phase change
  const phaseY = useSharedValue(0);
  const phaseOpacity = useSharedValue(1);
  const timeScale = useSharedValue(1);
  const timeOpacity = useSharedValue(1);
  useEffect(() => {
    phaseY.value = 8;
    phaseOpacity.value = 0;
    phaseY.value = withDelay(100, withTiming(0, { duration: 300, easing: easeImpact }));
    phaseOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));

    timeScale.value = 0.7;
    timeOpacity.value = 0;
    timeScale.value = withSpring(1, springEnergetic);
    timeOpacity.value = withTiming(1, { duration: 300 });
  }, [state.phaseLabel]);
  const phaseLabelStyle = useAnimatedStyle(() => ({
    opacity: phaseOpacity.value,
    transform: [{ translateY: phaseY.value }],
  }));
  const timeStyle = useAnimatedStyle(() => ({
    opacity: timeOpacity.value,
    transform: [{ scale: timeScale.value }],
  }));

  // (V) Repos = la couleur du mode, éteinte. Dérivée une fois par mode, pas
  // une palette écrite à la main : un mode ajouté plus tard est couvert seul.
  const restColors = useMemo(
    () => restGradient(timer.bgColors, { textMode: timer.textMode }),
    [timer.bgColors, timer.textMode]
  );

  // Le fondu est lent (700 ms) : une bascule instantanée se lirait comme un
  // bug d'affichage, alors qu'un fondu se lit comme "on redescend".
  const restVeil = useSharedValue(state.isRest ? 1 : 0);
  useEffect(() => {
    restVeil.value = withTiming(state.isRest ? 1 : 0, {
      duration: 700,
      easing: easeImpact,
    });
  }, [state.isRest]);

  return (
    // (V) Le fond ne change pas de couleur : c'est la MÊME couleur, éteinte,
    // fondue par-dessus pendant l'inter-série (voir lib/phase-colors.js).
    // Le mode garde donc son identité, il baisse juste d'intensité le temps
    // de souffler. Passer par GradientBackground plutôt que par un calque
    // peint ici garantit que les deux couches ont la même géométrie radiale.
    <GradientBackground
      colors={timer.bgColors}
      textMode={timer.textMode}
      overlayColors={restColors}
      overlayOpacity={restVeil}
    >
      {/* Pulse ambiant — suit la phase, sinon il repeindrait la couleur
          pleine par-dessus le repos toutes les deux secondes. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, pulseStyle]}
      >
        <LinearGradient
          colors={state.isRest ? restColors : timer.bgColors}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TopBar
          tokens={t}
          name={timer.name}
          tag={ctaLabel}
          roundLabel={state.roundLabel}
          onReturn={handleReturn}
          progress={state.totalProgress}
          markers={state.phaseMarkers}
          isPaused={isPaused}
        />

        <View style={[styles.center, isReduced && styles.centerReduced]}>
          {isMini ? (
            /* (V) Mini — le temps, la phase, rien d'autre. L'anneau dit la
               même chose que la barre de progression déjà en haut, mais
               coûte toute la hauteur dont le chrono a besoin pour rester
               lisible à distance. */
            <Animated.View style={[styles.miniCenter, timeStyle]}>
              <Animated.Text
                style={[
                  styles.phaseLabel,
                  styles.miniPhaseLabel,
                  { color: t.tertiary },
                  phaseLabelStyle,
                ]}
                numberOfLines={1}
              >
                {state.phaseLabel}
              </Animated.Text>
              <Text
                style={[
                  styles.bigTime,
                  { color: t.primary, fontSize: bigTimeSize, lineHeight: Math.round(bigTimeSize * 1.05) },
                ]}
                numberOfLines={1}
              >
                {formatDuration(displaySeconds)}
              </Text>
              <Text style={[styles.restantLabel, styles.miniRestantLabel, { color: t.tertiary }]} numberOfLines={1}>
                {centerLabel}
              </Text>
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                styles.ringWrap,
                { width: ring, height: ring, marginBottom: scaled(isReduced ? 14 : 32, ui) },
                ringStyle,
              ]}
            >
              <TickRing
                progress={state.ringProgress}
                size={ring}
                colorActive={t.ringActive}
                colorInactive={t.ringInactive}
              />
              <View style={styles.ringCenter} pointerEvents="none">
                <Animated.Text
                  style={[
                    styles.phaseLabel,
                    { color: t.tertiary },
                    state.phaseLabel.length > 16 && { fontSize: 9, letterSpacing: 2.5 },
                    phaseLabelStyle,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {state.phaseLabel}
                </Animated.Text>
                <Animated.Text
                  style={[
                    styles.bigTime,
                    { color: t.primary, fontSize: bigTimeSize, lineHeight: Math.round(bigTimeSize * 1.05) },
                    timeStyle,
                  ]}
                >
                  {formatDuration(displaySeconds)}
                </Animated.Text>
                <Text style={[styles.restantLabel, { color: t.tertiary }]}>{centerLabel}</Text>
              </View>
            </Animated.View>
          )}

          {/* Le déroulé des phases est un repère de confort : premier bloc
              sacrifié quand la hauteur manque. */}
          {!isReduced && <PhasesPills phases={state.phasesList} timer={timer} tokens={t} />}
        </View>

        <BottomControls
          tokens={t}
          isPaused={isPaused}
          onReset={handleReset}
          onPauseToggle={handlePauseToggle}
          onSkip={handleSkip}
          showEndWork={isManualBasic && isWorkInfinite}
          endWorkLabel={isLastBasicWork ? 'FINI' : 'REPOS'}
          onEndWork={handleEndWork}
          hideSkip={isManualBasic && isWorkInfinite}
          showFinish={isEmom}
          onFinish={handleFinish}
        />
      </SafeAreaView>

      {isPaused && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <BlurView
            intensity={8}
            tint="dark"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(0,0,0,0.15)' },
            ]}
          />
        </Animated.View>
      )}
    </GradientBackground>
  );
}

function TopBar({ tokens, name, tag, roundLabel, onReturn, progress, markers, isPaused }) {
  const dotScale = useSharedValue(1);
  const dotOpacity = useSharedValue(0.6);
  useEffect(() => {
    if (isPaused) {
      cancelAnimation(dotScale);
      cancelAnimation(dotOpacity);
      dotScale.value = withTiming(1, { duration: 300 });
      dotOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      dotScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
      dotOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }
    return () => {
      cancelAnimation(dotScale);
      cancelAnimation(dotOpacity);
    };
  }, [isPaused]);
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotOpacity.value,
  }));

  return (
    <View style={styles.topBar}>
      <View style={styles.topRow}>
        <LongPressButton
          label="Retour"
          size={44}
          duration={1500}
          borderColor={tokens.btnBorder}
          ringColor={tokens.primary}
          labelColor={tokens.muted}
          pressedBg={tokens.chipBg}
          onComplete={onReturn}
        >
          <Text style={[styles.backArrow, { color: tokens.primary }]}>‹</Text>
        </LongPressButton>

        <View style={styles.topCenter}>
          <Text style={[styles.topName, { color: tokens.tertiary }]}>{name}</Text>
          <View style={styles.topTagRow}>
            <Animated.View
              style={[styles.statusDot, { backgroundColor: tokens.primary }, dotStyle]}
            />
            <Text style={[styles.topTag, { color: tokens.primary }]}>{tag}</Text>
          </View>
        </View>

        <View style={styles.topRight}>
          <Text style={[styles.topRoundLabel, { color: tokens.tertiary }]}>TOUR</Text>
          <Text style={[styles.topRoundValue, { color: tokens.primary }]}>{roundLabel}</Text>
        </View>
      </View>

      {/* Avancement global jusqu'à l'objectif de la séance. Volontairement
          insensible à la pause : elle ne change ni de couleur ni de rythme,
          elle dit seulement où on en est. Les découpes matérialisent les
          phases (tours EMOM, travail/repos TABATA, blocs MIX). */}
      <View style={[styles.progressTrack, { backgroundColor: tokens.ringInactive }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: tokens.primary,
              width: `${Math.min(100, progress * 100)}%`,
            },
          ]}
        />
        {(markers ?? []).map((m, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[
              styles.progressNotch,
              { backgroundColor: tokens.trackNotch, left: `${m * 100}%` },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function PhasesPills({ phases, timer, tokens }) {
  if (!phases || phases.length === 0) return null;
  const isDark = timer.textMode === 'dark';
  const currentTextColor = isDark ? '#FFFFFF' : '#0A0A0A';

  return (
    <View style={styles.phasesWrap}>
      <Text style={[styles.derouleLabel, { color: tokens.muted }]}>Déroulé</Text>
      <View style={styles.phasesRow}>
        {phases.map((p, i) => {
          const isCurrent = p.status === 'current';
          const isDone = p.status === 'done';
          const bg = isCurrent ? tokens.primary : isDone ? 'transparent' : tokens.chipBg;
          const border = isCurrent ? tokens.primary : isDone ? tokens.chipDone : tokens.chipBorder;
          const color = isCurrent ? currentTextColor : isDone ? tokens.chipDone : tokens.chipText;
          return (
            <PhaseChip
              key={i}
              index={i}
              isCurrent={isCurrent}
              bg={bg}
              border={border}
              color={color}
              label={p.label}
              tokens={tokens}
            />
          );
        })}
      </View>
    </View>
  );
}

function PhaseChip({ index, isCurrent, bg, border, color, label, tokens }) {
  const entryY = useSharedValue(16);
  const entryOpacity = useSharedValue(0);
  const entryScale = useSharedValue(0.85);
  useEffect(() => {
    const delay = 350 + index * 50;
    entryY.value = withDelay(delay, withSpring(0, springEnergetic));
    entryOpacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    entryScale.value = withDelay(delay, withSpring(1, springEnergetic));
  }, []);
  const entryStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ translateY: entryY.value }, { scale: entryScale.value }],
  }));

  // Pulse ring sur le chip current
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  useEffect(() => {
    if (isCurrent) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 750, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 })
        ),
        -1
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(0, { duration: 750, easing: Easing.out(Easing.ease) })
        ),
        -1
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = 0;
    }
    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
    };
  }, [isCurrent]);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.phaseChip,
        { backgroundColor: bg, borderColor: border },
        entryStyle,
      ]}
    >
      {isCurrent && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.phaseChipPulse,
            { borderColor: tokens.primary },
            pulseStyle,
          ]}
        />
      )}
      <Text style={[styles.phaseText, { color }]}>{label}</Text>
    </Animated.View>
  );
}

function BottomControls({
  tokens,
  isPaused,
  onReset,
  onPauseToggle,
  onSkip,
  showEndWork,
  endWorkLabel,
  onEndWork,
  hideSkip,
  showFinish,
  onFinish,
}) {
  // (V) Les commandes gardent leur taille de cible (on les vise en plein
  // effort, parfois en sueur) : seule la marge autour se resserre.
  const level = useLayoutLevel();
  const isReduced = level === 'mini' || level === 'compact';
  return (
    <View style={[styles.bottom, isReduced && styles.bottomReduced]}>
      <View style={styles.bottomRow}>
        <LongPressButton
          label="Reset"
          size={64}
          borderColor={tokens.btnBorder}
          ringColor={tokens.primary}
          labelColor={tokens.muted}
          pressedBg={tokens.chipBg}
          onComplete={onReset}
        >
          <Text style={[styles.bottomIcon, { color: tokens.primary }]}>↺</Text>
        </LongPressButton>

        {showEndWork ? (
          <View style={[styles.roundBtnShadowWrap, { backgroundColor: tokens.ctaBg }]}>
            <Pressable
              onPress={onEndWork}
              style={({ pressed }) => [
                styles.endWorkBtn,
                {
                  backgroundColor: tokens.ctaBg,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <Text
                style={[styles.endWorkText, { color: tokens.ctaText }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {endWorkLabel}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.roundBtnShadowWrap, { backgroundColor: tokens.ctaBg }]}>
            <Pressable
              onPress={onPauseToggle}
              style={({ pressed }) => [
                styles.pauseBtn,
                {
                  backgroundColor: tokens.ctaBg,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Text style={[styles.pauseIcon, { color: tokens.ctaText }]}>
                {isPaused ? '▶' : '❚❚'}
              </Text>
            </Pressable>
          </View>
        )}

        {showFinish ? (
          // EMOM : "Fin" prend la place de Skip (avancer d'une minute n'a pas
          // de sens sur un timer calé sur l'horloge). Appui long comme les
          // autres boutons destructeurs — terminer par erreur coûte la séance.
          <LongPressButton
            label="Fin"
            size={64}
            duration={1000}
            borderColor={tokens.btnBorder}
            ringColor={tokens.primary}
            labelColor={tokens.muted}
            pressedBg={tokens.chipBg}
            onComplete={onFinish}
          >
            <Text style={[styles.finishIcon, { color: tokens.primary }]}>■</Text>
          </LongPressButton>
        ) : hideSkip ? (
          <View style={{ width: 64, height: 64 }} />
        ) : (
          <LongPressButton
            label="Skip"
            size={64}
            duration={1000}
            borderColor={tokens.btnBorder}
            ringColor={tokens.primary}
            labelColor={tokens.muted}
            pressedBg={tokens.chipBg}
            onComplete={onSkip}
          >
            <Text style={[styles.bottomIcon, { color: tokens.primary }]}>▶▶</Text>
          </LongPressButton>
        )}
      </View>
    </View>
  );
}

const fallbackState = () => ({
  phase: '',
  phaseLabel: '—',
  phaseSecondsTotal: 0,
  phaseSecondsLeft: 0,
  currentRound: 0,
  totalRounds: 0,
  roundLabel: '—',
  totalSecondsTarget: 0,
  totalProgress: 0,
  ringProgress: 0,
  isComplete: false,
  phaseMarkers: [],
  phasesList: [],
});

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backArrow: {
    fontSize: 22,
    fontFamily: fonts.sansBold,
    marginTop: -3,
  },
  topCenter: {
    alignItems: 'center',
    paddingTop: 4,
  },
  topName: {
    fontFamily: fonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  topTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  topTag: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  topRight: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  topRoundLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  topRoundValue: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 20,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressNotch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    // `left` est le pourcentage exact de la frontière : on recentre le trait
    // dessus au lieu de le faire démarrer après.
    marginLeft: -1,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  ringWrap: {
    width: 320,
    height: 320,
    marginBottom: 32,
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bigTime: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 76,
    letterSpacing: -3,
    lineHeight: 80,
    includeFontPadding: false,
  },
  restantLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 8,
  },

  phasesWrap: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  derouleLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 2.7,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  phasesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  phaseChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 40,
    alignItems: 'center',
    overflow: 'visible',
  },
  phaseChipPulse: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderWidth: 2,
    borderRadius: 999,
  },
  phaseText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  bottom: {
    paddingHorizontal: 24,
    // Les commandes tombaient trop près du bord bas (et du geste système
    // Android) : on les remonte franchement. S'ajoute à l'inset bas du
    // SafeAreaView.
    paddingBottom: 36,
    paddingTop: 12,
  },
  // (V) Mise en page réduite — voir lib/responsive.js
  bottomReduced: {
    paddingBottom: 12,
    paddingTop: 6,
  },
  centerReduced: {
    paddingHorizontal: 12,
  },
  miniCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPhaseLabel: {
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 2,
  },
  miniRestantLabel: {
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  bottomIcon: {
    fontSize: 18,
    fontFamily: fonts.sansBold,
  },
  finishIcon: {
    fontSize: 15,
    fontFamily: fonts.sansBold,
  },
  pauseBtn: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBtnShadowWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  pauseIcon: {
    fontSize: 28,
    fontFamily: fonts.sansExtraBold,
  },
  endWorkBtn: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endWorkText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 18,
    letterSpacing: 1.7,
    includeFontPadding: false,
  },
});
