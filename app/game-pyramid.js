import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import AmbianceBackdrop from '../components/common/AmbianceBackdrop';
import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import Button from '../components/common/Button';
import PressTap from '../components/common/PressTap';
import AppIcon from '../components/common/AppIcon';
import TickRing from '../components/common/TickRing';
import WheelPicker from '../components/common/WheelPicker';
import BottomSheet from '../components/common/BottomSheet';
import GameScoreList from '../components/screens/GameScoreList';
import GameTagOverlays from '../components/screens/GameTagOverlays';
import HoldToTag from '../components/common/HoldToTag';
import { useSettings } from '../contexts/SettingsContext';
import { haptic } from '../hooks/useHaptic';
import { usePremium } from '../hooks/usePremium';
import { playSound } from '../lib/sounds';
import { useGameExerciseTag } from '../hooks/useGameExerciseTag';
import { fonts } from '../lib/fonts';
import { goBackSafe } from '../lib/navigation';
import { playGameGo, preloadGameSounds } from '../lib/gameSounds';
import { createFixedNumberCaller } from '../lib/gameVoice';
import { speakGame, stopVoiceCoach } from '../lib/voiceCoach';
import {
  loadPyramidScores,
  savePyramidScore,
  deletePyramidScore,
  setPyramidScoreExercises,
} from '../lib/gamePyramidScores';
import { recordGameSession, setGameSessionExercises } from '../lib/gameHistory';
import { exercisesLabel, normalizeExercises, shouldHalo } from '../lib/gameExercises';
import {
  DEFAULT_FORMAT,
  DEFAULT_PEAK,
  FORMATS,
  PEAKS,
  PYRAMID_REP_MS,
  bestPyramidScore,
  buildSets,
  getFormat,
  plannedSeconds,
  repsDone,
  restSeconds,
  seriesLevel,
  seriesStepMs,
  totalReps,
} from '../lib/gamePyramid';

const KEEP_AWAKE_TAG = 'flextimer-game';
const DEMO_SCORE_ID = 'demo'; // score d'exemple de la démo de la bulle (jamais enregistré)
const RING = 280;
const CONFIRM_RANGE = 5;
// Teinte du jeu : un orange terre cuite, absent des 5 modes et différent du bleu-vert du chef d'orchestre.
const GAME_BG = ['#4A2410', '#2E1409', '#150904'];
const ACCENT = '#FF9A4D';
const ACCENT_DIM = 'rgba(255,154,77,0.28)';
const ACCENT_FAINT = 'rgba(255,154,77,0.12)';

const formatDay = (at) => {
  const d = new Date(at);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const scoreValue = (s) => s.total;

// Formats réservés à Premium : Évolutif et Dégressif. La pyramide complète reste gratuite.
const isPremiumFormat = (id) => id === 'up' || id === 'down';

// Une barre par série, haute comme son nombre de répétitions : on voit la
// pyramide et où on en est (faites = bleu, en cours = blanc, à venir = pâle).
const PyramidBars = React.memo(function PyramidBars({ sets, activeIndex, height = 56 }) {
  const top = Math.max(...sets);
  return (
    <View style={[styles.bars, { height }]}>
      {sets.map((r, i) => (
        <View key={i} style={styles.barSlot}>
          <View
            style={[
              styles.bar,
              { height: Math.max(4, Math.round((height * r) / top)) },
              activeIndex < 0 && styles.barAhead,
              activeIndex >= 0 && i < activeIndex && styles.barDone,
              i === activeIndex && styles.barNow,
            ]}
          />
        </View>
      ))}
    </View>
  );
});

/**
 * « La pyramide » — des séries qui montent (évolutif), descendent (dégressif)
 * ou font les deux (pyramide). Une voix compte les répétitions de chaque série,
 * puis annonce le repos, qui finit par le décompte 3-2-1-GO de l'app. Celui qui
 * lâche appuie sur « J'ai lâché » : son score est le total de répétitions faites.
 * Solo, sur la confiance : aucun capteur, aucun envoi, scores gardés sur le
 * téléphone (lib/gamePyramidScores.js) et supprimables.
 */
export default function GamePyramid() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { settings } = useSettings();
  const { isPremium } = usePremium();
  // Démo (Paramètres › À propos › « Revoir l'astuce des jeux ») : on arrive sur le menu du jeu avec
  // un score d'exemple tout en haut de « Mes scores » (jamais enregistré), pour revoir la bulle
  // d'explication sans jouer.
  const isDemo = useLocalSearchParams().demo === '1';

  const [phase, setPhase] = useState('ready'); // ready | countdown | set | rest | confirm | done
  const [formatId, setFormatId] = useState(DEFAULT_FORMAT);
  const [peak, setPeak] = useState(DEFAULT_PEAK);
  const [sets, setSets] = useState(() => buildSets(DEFAULT_FORMAT, DEFAULT_PEAK));
  const [setIndex, setSetIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [restLeft, setRestLeft] = useState(0);
  const [restTotal, setRestTotal] = useState(1);
  const [scores, setScores] = useState([]);
  const [result, setResult] = useState(null); // { total, record, complete, scoreId }
  const [demoExercises, setDemoExercises] = useState([]); // exercice noté dans la démo (jamais enregistré)
  const [finalCount, setFinalCount] = useState(0);
  const demoAtRef = useRef(Date.now());

  const phaseRef = useRef('ready');
  const countRef = useRef(0);
  const setIndexRef = useRef(0);
  const setsRef = useRef([]);
  const cfgRef = useRef(null); // réglages figés au lancement
  const callerRef = useRef(null);
  const loopTimer = useRef(null);
  const restTimer = useRef(null);
  const timers = useRef([]);
  const scoresRef = useRef([]);
  const selectedRef = useRef(0);
  // Temps réel de la partie, pour l'Historique (lib/gameHistory.js) : début du
  // premier set, fin (avant la roue de confirmation) et part passée à se reposer.
  const playStartRef = useRef(null);
  const playEndRef = useRef(null);
  const restMsRef = useRef(0);
  const restSinceRef = useRef(null);

  const format = getFormat(formatId);

  const goPhase = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const later = (ms, fn) => {
    timers.current.push(setTimeout(fn, ms));
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadPyramidScores().then((list) => {
        if (cancelled) return;
        scoresRef.current = list;
        setScores(list);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const clearTimers = () => {
    clearTimeout(loopTimer.current);
    clearTimeout(restTimer.current);
    loopTimer.current = null;
    restTimer.current = null;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const releaseGame = () => {
    clearTimers();
    callerRef.current?.dispose();
    callerRef.current = null;
    stopVoiceCoach();
    try { deactivateKeepAwake(KEEP_AWAKE_TAG); } catch {}
  };

  // Quitte l'écran : plus de voix, plus de minuterie.
  useEffect(() => releaseGame, []);

  // Ferme le repos en cours (s'il y en a un) dans le compte du temps de repos.
  const flushRest = () => {
    if (restSinceRef.current != null) {
      restMsRef.current += Date.now() - restSinceRef.current;
      restSinceRef.current = null;
    }
  };

  // Enregistre le score définitif (après la confirmation) et montre le résultat.
  const commitScore = async (value, complete = false) => {
    if (phaseRef.current === 'done') return;
    const cfg = cfgRef.current;
    const previousBest = bestPyramidScore(scoresRef.current, cfg.formatId, cfg.peak);
    goPhase('done');
    setResult({ total: value, record: value > 0 && value > previousBest, complete });
    haptic.success();
    if (value > 0) {
      // La partie entre dans l'Historique ; son id est gardé dans le score pour y noter
      // l'exercice plus tard (si la personne le maintient).
      const entry = await recordGameSession({
        game: 'pyramid',
        startedAt: playStartRef.current,
        endedAt: playEndRef.current ?? Date.now(),
        reps: value,
        restMs: restMsRef.current,
      });
      const list = await savePyramidScore({
        format: cfg.formatId,
        peak: cfg.peak,
        total: value,
        complete,
        historyId: entry?.id,
      });
      scoresRef.current = list;
      setScores(list);
      // Le score qu'on vient d'ajouter est toujours le premier de la liste.
      setResult((r) => (r ? { ...r, scoreId: list[0]?.id } : r));
      // La règle de la bulle (lib/gameTagTip.js) : si elle doit être montrée, ce sera sur le menu
      // du jeu, dès qu'on y revient.
      tag.noteGameFinished();
    }
  };

  // Enregistre l'exercice noté : dans le score ET dans la séance JEU de l'Historique (appelé par
  // le hook commun). En démo, rien n'est enregistré.
  const saveExercises = useCallback(async (id, exercises) => {
    if (id === DEMO_SCORE_ID) {
      setDemoExercises(normalizeExercises(exercises));
      return;
    }
    const score = scoresRef.current.find((s) => s.id === id);
    const list = await setPyramidScoreExercises(id, exercises);
    scoresRef.current = list;
    setScores(list);
    if (score?.historyId) setGameSessionExercises(score.historyId, exercises);
  }, []);

  // Toute la pyramide faite : pas de confirmation, rien à corriger.
  const completePyramid = () => {
    const cfg = cfgRef.current;
    const all = totalReps(setsRef.current);
    playEndRef.current = Date.now();
    releaseGame();
    commitScore(all, true);
    // La voix finit son dernier chiffre avant de dire « Terminé. »
    setTimeout(() => speakGame('Terminé.', cfg.gender), 700);
  };

  // « J'ai lâché » en pleine série : on ne peut pas toujours toucher le bouton pile
  // à temps, donc on demande de confirmer le total, ou de le corriger de 4 au plus
  // vers le bas (jamais vers le haut : on ne peut pas avoir fait plus que ce qui a
  // été compté). Pendant un repos, le total est exact : on l'enregistre tel quel.
  const finish = () => {
    const current = phaseRef.current;
    if (current !== 'set' && current !== 'rest') return;
    const i = setIndexRef.current;
    const final =
      current === 'set'
        ? repsDone(setsRef.current, i, countRef.current)
        : repsDone(setsRef.current, i + 1);
    playEndRef.current = Date.now();
    flushRest();
    releaseGame();
    if (final <= 0) {
      commitScore(0);
      return;
    }
    haptic.medium();
    if (current === 'rest') {
      commitScore(final);
      return;
    }
    selectedRef.current = final;
    setFinalCount(final);
    goPhase('confirm');
  };

  // Une série : la voix dit 1, 2, 3… au rythme de l'exercice, sans surprise.
  const startSet = (i) => {
    const cfg = cfgRef.current;
    const target = setsRef.current[i];
    const baseMs = PYRAMID_REP_MS; // un seul rythme pour tous les exercices
    // Répétitions déjà faites avant cette série, et total prévu : la voix ralentit
    // par paliers avec la fatigue (voir seriesLevel dans lib/gamePyramid.js). Le pas
    // est le même pour toute la série : c'est celui de sa bande-son.
    const doneBefore = repsDone(setsRef.current, i);
    const plannedTotal = totalReps(setsRef.current);
    const stepMs = seriesStepMs(baseMs, seriesLevel(doneBefore, target, plannedTotal));
    const caller = callerRef.current;
    if (!caller) return;
    setIndexRef.current = i;
    setSetIndex(i);
    countRef.current = 0;
    setCount(0);
    flushRest();
    if (i === 0) {
      playStartRef.current = Date.now();
      playEndRef.current = null;
      restMsRef.current = 0;
    }
    goPhase('set');
    let nextAt = Date.now();
    // UN seul ordre de lecture pour toute la série (« 1, 2, 3… n ») ; sans bande-son
    // (voix absente, série trop longue) on dit les chiffres un par un.
    const withSeries = caller.playSeries(target, seriesLevel(doneBefore, target, plannedTotal), stepMs);

    const tick = () => {
      if (phaseRef.current !== 'set') return;
      const n = countRef.current + 1;
      countRef.current = n;
      if (!withSeries) caller.say(n);
      setCount(n);
      nextAt += stepMs;
      // Après la dernière répétition, on laisse le temps de la finir avant le repos.
      loopTimer.current = setTimeout(n >= target ? endSet : tick, Math.max(0, nextAt - Date.now()));
    };
    tick();
  };

  const endSet = () => {
    if (phaseRef.current !== 'set') return;
    const i = setIndexRef.current;
    if (i >= setsRef.current.length - 1) {
      completePyramid();
      return;
    }
    startRest(i);
  };

  // Le repos suit la plus grosse des deux séries voisines ; seul le bip final
  // (« go », 0,85 s avant la fin) sonne, pas les bips 3-2-1 (règle des jeux).
  const startRest = (i) => {
    const cfg = cfgRef.current;
    const all = setsRef.current;
    const total = restSeconds(all[i], all[i + 1]);
    const endAt = Date.now() + total * 1000;
    restSinceRef.current = Date.now();
    goPhase('rest');
    setRestTotal(total);
    setRestLeft(total);
    haptic.light();
    // « Repos. » dure un demi-seconde : dit tout de suite, il est fini avant le bip
    // final, même pour le repos le plus court (5 s → bip à 4,15 s).
    later(250, () => speakGame('Repos.', cfg.gender));
    later(Math.max(0, total * 1000 - 850), playGameGo);
    later(total * 1000, () => startSet(i + 1));

    const tickRest = () => {
      if (phaseRef.current !== 'rest') return;
      setRestLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
      restTimer.current = setTimeout(tickRest, 250);
    };
    tickRest();
  };

  // Refus commun (format Premium sans Premium) : alerte, son de refus, page Premium.
  const denyPremium = () => {
    haptic.warning();
    playSound('blockedTimer');
    router.push('/premium');
  };

  const startGame = () => {
    // Filet : un format Premium ne part jamais sans Premium (réglage resté d'avant, etc.).
    if (!isPremium && isPremiumFormat(formatId)) {
      setFormatId(DEFAULT_FORMAT);
      setSets(buildSets(DEFAULT_FORMAT, peak));
      denyPremium();
      return;
    }
    haptic.medium();
    const planned = buildSets(formatId, peak);
    setsRef.current = planned;
    setSets(planned);
    // Ni choix d'exercice ni choix de rythme dans ce jeu (PYRAMID_REP_MS pour tout).
    cfgRef.current = { formatId, peak, gender: settings.voiceGender };
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    // Son décodé d'avance, sinon le bip final saute.
    preloadGameSounds();
    // Un lecteur par chiffre de la pyramide, créé pendant le décompte (décodage
    // des MP3) puis jamais rechargé : voir lib/gameVoice.js.
    const caller = createFixedNumberCaller(settings.voiceGender, Math.max(...planned));
    callerRef.current = caller;
    // Une bande-son par série (créée pendant le décompte) ; les chiffres isolés ne
    // servent plus que de secours, pour une série qui n'en aurait pas.
    const needed = [];
    let done = 0;
    const planTotal = totalReps(planned);
    planned.forEach((r) => {
      needed.push({ n: r, level: seriesLevel(done, r, planTotal) });
      done += r;
    });
    caller.preloadSeries(needed);
    if (needed.some(({ n, level }) => !caller.hasSeries(n, level))) caller.preload(1, Math.max(...planned));
    setSetIndex(0);
    goPhase('countdown');
    setCountdown(3);
    later(1000, () => { setCountdown(2); });
    later(2000, () => { setCountdown(1); });
    later(3000, playGameGo);
    later(3850, () => startSet(0));
  };

  const cancelCountdown = () => {
    releaseGame();
    goPhase('ready');
  };

  // Touche retour d'Android : pendant la partie elle compte comme « j'ai lâché ».
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const current = phaseRef.current;
      if (current === 'set' || current === 'rest') {
        finish();
        return true;
      }
      if (current === 'confirm') {
        commitScore(selectedRef.current);
        return true;
      }
      if (current === 'countdown') {
        cancelCountdown();
        return true;
      }
      // Sur le résultat : retour au menu DE CE JEU (réglage du format), pas au menu des jeux.
      if (current === 'done') {
        backToMenu();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // Du résultat au menu du jeu (la flèche en haut à gauche, et le retour d'Android).
  const backToMenu = () => {
    setResult(null);
    goPhase('ready');
  };

  // « Rejouer » rejoue VRAIMENT : même format, même sommet, le décompte repart tout de suite.
  const replay = () => {
    setResult(null);
    startGame();
  };

  const handleDelete = async (id) => {
    haptic.warning();
    const list = await deletePyramidScore(id);
    scoresRef.current = list;
    setScores(list);
  };

  const chooseFormat = (id) => {
    if (!isPremium && isPremiumFormat(id)) {
      denyPremium();
      return;
    }
    haptic.selection();
    setFormatId(id);
    setSets(buildSets(id, peak));
  };

  const choosePeak = (value) => {
    haptic.selection();
    setPeak(value);
    setSets(buildSets(formatId, value));
  };

  // Les 5 derniers totaux possibles (le dernier = celui compté avant l'appui).
  const confirmValues = Array.from(
    { length: Math.min(CONFIRM_RANGE, finalCount + 1) },
    (_, i) => finalCount - (Math.min(CONFIRM_RANGE, finalCount + 1) - 1) + i
  );

  const best = bestPyramidScore(scores, formatId, peak);
  const mine = useMemo(() => scores.filter((s) => FORMATS[s.format]), [scores]);
  // La liste « Mes scores » : en démo, un faux score tout récent est posé tout en haut (jamais
  // enregistré), pour pouvoir voir la bulle et essayer le maintien sans jouer.
  const listScores = useMemo(
    () =>
      isDemo
        ? [
            {
              id: DEMO_SCORE_ID,
              format: 'pyramid',
              peak: 8,
              total: 36,
              complete: true,
              at: demoAtRef.current,
              exercises: demoExercises,
            },
            ...mine,
          ]
        : mine,
    [isDemo, mine, demoExercises]
  );
  const findScore = (id) => listScores.find((s) => s.id === id);
  const doneScore = result?.scoreId ? findScore(result.scoreId) : null;
  // Noter l'exercice d'un score (maintien, fenêtre « Ton exercice », bulle du menu) : tout ce qui est
  // commun aux jeux vit dans hooks/useGameExerciseTag.js et components/screens/GameTagOverlays.js.
  const tag = useGameExerciseTag({ phase, scores: listScores, saveExercises, isDemo });
  const total = totalReps(sets);
  const minutes = Math.max(1, Math.round(plannedSeconds(sets, PYRAMID_REP_MS) / 60));
  const ring = Math.min(RING, Math.round(height * 0.34));
  const resting = phase === 'rest';
  const restWordSize = Math.round(Math.min(64, ring * 0.24));
  const target = sets[setIndex] ?? 0;
  const nextTarget = sets[setIndex + 1] ?? 0;

  // `onBack` : la flèche en haut à gauche. Par défaut elle quitte le jeu (retour au menu des
  // jeux) ; sur l'écran de résultat elle revient au menu DU JEU.
  const renderTop = (title, onBack = () => goBackSafe(router)) => (
    <View style={styles.topBar}>
      <IconButton
        icon="back"
        halo="left"
        haptic={haptic.light}
        onPress={onBack}
        accessibilityLabel="Retour"
      />
      <Text style={styles.topTitle}>{title}</Text>
      <View style={styles.topSpacer} />
    </View>
  );

  return (
    <GradientBackground colors={GAME_BG} ambient>
      {/* Décor de la saison une fois la partie lancée, jamais dans le réglage (règle des jeux) */}
      {phase !== 'ready' && <AmbianceBackdrop tone="light" />}
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {phase === 'ready' && (
          <>
            {renderTop('La pyramide')}
            <ScrollView
              ref={tag.readyScrollRef}
              style={styles.flex}
              contentContainerStyle={styles.readyContent}
              showsVerticalScrollIndicator={false}
              onScroll={tag.onReadyScroll}
              scrollEventThrottle={32}
            >
              <Text style={styles.tag}>JEU · RÉPÉTITIONS</Text>
              <Text style={styles.rules}>
                Des séries qui montent, qui descendent, ou les deux. Une voix compte chaque répétition,
                puis tu te reposes avant la suivante. Va le plus loin possible : quand tu lâches, appuie
                sur le bouton.
              </Text>

              <Text style={styles.sectionLabel}>FORMAT</Text>
              <View style={styles.chips}>
                {Object.values(FORMATS).map((f) => {
                  const on = f.id === formatId;
                  const locked = !isPremium && isPremiumFormat(f.id);
                  return (
                    <PressTap
                      key={f.id}
                      onPress={() => chooseFormat(f.id)}
                      tapScale={0.96}
                      containerStyle={styles.chipWrap}
                      style={[styles.chip, on && styles.chipOn]}
                      accessibilityLabel={locked ? `Format ${f.label}, réservé à Premium` : `Format ${f.label}`}
                    >
                      <View style={styles.chipInner}>
                        {isPremiumFormat(f.id) && <AppIcon name="crown" size={13} color="#F0C954" />}
                        <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                          {f.label}
                        </Text>
                      </View>
                    </PressTap>
                  );
                })}
              </View>
              <Text style={styles.formatHint}>{format.hint}</Text>

              <Text style={styles.sectionLabel}>SOMMET</Text>
              <View style={styles.chips}>
                {PEAKS.map((p) => {
                  const on = p === peak;
                  return (
                    <PressTap
                      key={p}
                      onPress={() => choosePeak(p)}
                      tapScale={0.96}
                      containerStyle={styles.chipWrap}
                      style={[styles.chip, on && styles.chipSoftOn]}
                      accessibilityLabel={`Sommet ${p} répétitions`}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextSoftOn]}>{p}</Text>
                    </PressTap>
                  );
                })}
              </View>

              <View style={styles.preview}>
                <PyramidBars sets={sets} activeIndex={-1} />
                <Text style={styles.previewText}>
                  {sets.length} séries · {total} répétitions · environ {minutes} min
                </Text>
              </View>

              <View style={styles.bestRow}>
                <AppIcon name="trophies" size={18} color="#FFFFFF" />
                <Text style={styles.bestText}>
                  {best > 0
                    ? `Ton record : ${best} répétitions`
                    : 'Pas encore de record ici — à toi de jouer'}
                </Text>
              </View>

              <Button
                variant="solid"
                icon="play"
                label="Lancer"
                haptic={haptic.medium}
                onPress={startGame}
                fullWidth
              />

              <GameScoreList
                scores={listScores}
                accent={ACCENT}
                getValue={scoreValue}
                renderRow={(s, inDay) => (
                  // Maintenir 1 s une ligne = noter (ou changer) son exercice ; le halo
                  // n'éclaire que le dernier score, tant qu'il n'a pas d'exercice.
                  <HoldToTag
                    ref={s.id === listScores[0]?.id ? tag.firstRowRef : undefined}
                    color={ACCENT}
                    radius={16}
                    invite={shouldHalo(s, listScores[0])}
                    onHold={() => tag.openTag(s.id)}
                    style={styles.scoreRow}
                    accessibilityLabel={`Score ${s.total}. Maintiens pour noter ton exercice.`}
                  >
                    <Text style={styles.scoreCount}>{s.total}</Text>
                    <Text style={styles.scoreMeta}>
                      {FORMATS[s.format].label} {s.peak}
                      {inDay ? '' : ` · ${formatDay(s.at)}`}
                      {s.complete ? ' · terminée' : ''}
                      {s.exercises?.length ? ` · ${exercisesLabel(s.exercises)}` : ''}
                    </Text>
                    <PressTap
                      onPress={() => handleDelete(s.id)}
                      tapScale={0.9}
                      style={styles.scoreDelete}
                      accessibilityLabel="Supprimer ce score"
                    >
                      <AppIcon name="close" size={14} color="rgba(255,255,255,0.7)" />
                    </PressTap>
                  </HoldToTag>
                )}
              />
            </ScrollView>
          </>
        )}

        {phase === 'countdown' && (
          <View style={styles.center}>
            <Text style={[styles.countdownNumber, countdown === 1 && styles.countdownGo]}>{countdown}</Text>
            <Text style={styles.hint}>Mets-toi en position</Text>
            <View style={styles.bottomBar}>
              <Button variant="glass" label="Annuler" haptic={haptic.light} onPress={cancelCountdown} fullWidth />
            </View>
          </View>
        )}

        {(phase === 'set' || phase === 'rest') && (
          <View style={styles.center}>
            {/* UN seul écran pour la série ET le repos : mêmes éléments, mêmes tailles, mêmes
                places, et UNE seule chose à lire (retour du 06/11 : trop de textes, « je ne sais
                plus où donner la tête »). Le chiffre orange sous l'anneau = combien de
                répétitions faire (cette série, ou la prochaine pendant le repos) ; la pyramide
                du bas dit déjà où on en est, donc ni « série 4 sur 15 » ni « ensuite ». Pendant
                le repos, l'anneau dit « REPOS » et se remplit : plus de chiffre blanc de
                secondes, qui se confondait avec le nombre de répétitions (« 8 s » / « 8 pompes »). */}
            <View style={[styles.ringWrap, { width: ring, height: ring }]}>
              <TickRing
                progress={
                  resting
                    ? restTotal > 0
                      ? 1 - restLeft / restTotal
                      : 0
                    : target > 0
                      ? count / target
                      : 0
                }
                size={ring}
                colorActive={resting ? ACCENT_DIM : ACCENT}
                colorInactive={ACCENT_FAINT}
              />
              <View style={styles.ringCenter} pointerEvents="none">
                {resting ? (
                  <Text
                    style={[styles.restWord, { fontSize: restWordSize, lineHeight: Math.round(restWordSize * 1.19) }]}
                    numberOfLines={1}
                  >
                    REPOS
                  </Text>
                ) : (
                  <Text style={styles.bigNumber}>{count}</Text>
                )}
              </View>
            </View>
            <Text style={styles.goalCaption}>{resting ? 'PROCHAINE SÉRIE' : 'OBJECTIF'}</Text>
            {/* Le chiffre seul, centré sur l'axe (comme celui de l'anneau) : plus de nom d'exercice
                ni d'unité, la pyramide n'est liée à aucun exercice (retour du 06/11). */}
            <Text style={styles.goalNumber}>{resting ? nextTarget : target}</Text>
            <View style={styles.liveBars}>
              {/* La barre blanche = la série dont parle le chiffre orange (en cours, ou la prochaine
                  pendant le repos) : on voit d'un coup d'œil si ça monte ou si ça redescend. */}
              <PyramidBars sets={sets} activeIndex={resting ? setIndex + 1 : setIndex} height={92} />
            </View>
            <View style={styles.bottomBar}>
              <Button
                variant="danger"
                icon="stop"
                label={resting ? 'Je m’arrête' : 'J’ai lâché'}
                haptic={haptic.medium}
                onPress={finish}
                fullWidth
              />
            </View>
          </View>
        )}

        {phase === 'confirm' && (
          <View style={styles.center}>
            <Text style={styles.tag}>FIN DE PARTIE</Text>
            <Text style={[styles.bigNumber, styles.bigNumberDim]}>{finalCount}</Text>
          </View>
        )}

        {phase === 'done' && (
          <>
            {renderTop('La pyramide', backToMenu)}
            <View style={styles.center}>
              {/* Le score : un halo l'entoure tant que l'exercice n'est pas noté, et le MAINTENIR
                  1 s ouvre « Ton exercice ». Rien ne s'ouvre tout seul. */}
              <HoldToTag
                color={ACCENT}
                radius={36}
                invite={!!doneScore && !doneScore.exercises?.length}
                onHold={() => tag.openTag(result?.scoreId)}
                style={styles.resultBlock}
                accessibilityLabel="Ton score. Maintiens pour noter ton exercice."
              >
                <Text style={styles.tag}>{result?.complete ? 'PYRAMIDE TERMINÉE' : 'TON SCORE'}</Text>
                <Text style={styles.bigNumber}>{result?.total ?? 0}</Text>
                <Text style={styles.hint}>
                  répétitions sur {total}
                </Text>
                {!!doneScore?.exercises?.length && (
                  <Text style={styles.resultExo} numberOfLines={1}>
                    {exercisesLabel(doneScore.exercises)}
                  </Text>
                )}
              </HoldToTag>
              {result?.record && <Text style={styles.record}>NOUVEAU RECORD</Text>}
              {!result?.record && best > 0 && (
                <Text style={styles.hint}>
                  Ton record : {best} répétitions
                </Text>
              )}
              <View style={styles.bottomBar}>
                <Button
                  variant="solid"
                  icon="reset"
                  label="Rejouer"
                  haptic={haptic.medium}
                  onPress={replay}
                  fullWidth
                />
              </View>
            </View>
          </>
        )}
      </SafeAreaView>

      {/* « Ton exercice » (ouverte seulement quand on maintient un score) et la bulle du menu. */}
      <GameTagOverlays tag={tag} phase={phase} screenH={height} accent={ACCENT} />

      {/* Même feuille que la roue de l'app : fermer sans valider garde le total. */}
      {phase === 'confirm' && (
        <BottomSheet screenH={height} onClose={() => commitScore(selectedRef.current)} zIndex={140}>
          {({ close }) => (
            <View>
              <Text style={styles.sheetKicker}>MODIFIER</Text>
              <Text style={styles.sheetTitle}>TON SCORE</Text>
              <Text style={styles.sheetHint}>Tu as lâché avant le bouton ? Corrige de 4 au plus.</Text>
              <WheelPicker
                key={finalCount}
                values={confirmValues}
                selectedValue={finalCount}
                type="reps"
                accentColor={ACCENT}
                onChange={(v) => {
                  selectedRef.current = v;
                }}
                visibleItems={5}
              />
              <Button
                variant="solid"
                icon="check"
                label="Valider"
                haptic={haptic.medium}
                onPress={close}
                fullWidth
                style={styles.sheetCta}
              />
              <Text style={styles.scrollHint}>FAIS DÉFILER POUR CHOISIR</Text>
            </View>
          )}
        </BottomSheet>
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  topSpacer: { width: 44 },
  readyContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 14,
  },
  tag: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 3,
    color: ACCENT,
    textAlign: 'center',
  },
  rules: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.82)',
  },
  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  chips: { flexDirection: 'row', gap: 10 },
  chipWrap: { flex: 1 },
  chip: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#FFFFFF' },
  chipTextOn: { color: '#1A0C04' },
  // Sélection douce (sommet, exercice, rythme) : fond blanc léger, pas de bleu
  // plein, pour que le format et le groupe portent seuls la couleur vive.
  chipSoftOn: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.7)' },
  chipTextSoftOn: { color: '#FFFFFF' },
  formatHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: -6,
  },
  preview: {
    gap: 10,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,154,77,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,154,77,0.18)',
  },
  previewText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, alignSelf: 'stretch' },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: 3, backgroundColor: ACCENT_DIM },
  barAhead: { backgroundColor: ACCENT_DIM },
  barDone: { backgroundColor: ACCENT },
  barNow: { backgroundColor: '#FFFFFF' },
  liveBars: { alignSelf: 'stretch', marginTop: 22, paddingHorizontal: 8 },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  bestText: { fontFamily: fonts.sansSemibold, fontSize: 14, color: '#FFFFFF' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,154,77,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,154,77,0.18)',
  },
  // Le score de l'écran de résultat : la zone que le halo entoure et qu'on maintient.
  resultBlock: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 22,
    paddingHorizontal: 40,
    borderRadius: 36,
  },
  resultExo: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: ACCENT,
    textAlign: 'center',
    marginTop: 2,
  },
  scoreCount: { fontFamily: fonts.monoBold, fontSize: 18, color: '#FFFFFF', minWidth: 44 },
  scoreMeta: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  scoreDelete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 6,
  },
  ringWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Anton : lineHeight à ×1,18 de la taille, jamais égal.
  bigNumber: {
    fontFamily: fonts.display,
    fontSize: 120,
    lineHeight: 142,
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlign: 'center',
  },
  bigNumberDim: { color: 'rgba(255,255,255,0.45)' },
  // Écran de série ET de repos (même squelette) : sous l'anneau, le nombre de répétitions à
  // faire (cette série, ou la prochaine pendant le repos), lisible de loin.
  // Anton : lineHeight à ×1,18 de la taille, jamais égal.
  goalCaption: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 12,
  },
  goalNumber: {
    fontFamily: fonts.display,
    fontSize: 80,
    lineHeight: 94,
    color: ACCENT,
    includeFontPadding: false,
    textAlign: 'center',
  },
  // Repos : le mot REPOS au centre de l'anneau (taille calculée sur l'anneau, en ligne ×1,19).
  // Opacité : 0,76 (réglage à la main de l'utilisateur) puis 0,92 le 06/11 (« éclaircir un peu plus »).
  restWord: {
    fontFamily: fonts.display,
    color: 'rgba(255,255,255,0.92)',
    includeFontPadding: false,
    textAlign: 'center',
  },
  sheetKicker: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  sheetTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
  },
  sheetHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  sheetCta: { marginTop: 16 },
  scrollHint: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 14,
  },
  countdownNumber: {
    fontFamily: fonts.display,
    fontSize: 160,
    lineHeight: 190,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  // Le « 1 » final du décompte de départ prend la couleur du jeu : c'est le moment de commencer.
  // (Depuis le 06/11 le repos n'affiche plus de décompte en chiffres : l'anneau dit « REPOS ».)
  countdownGo: { color: ACCENT },
  hint: {
    fontFamily: fonts.sansSemibold,
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 8,
  },
  record: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 14,
    letterSpacing: 3,
    color: '#F0C954',
    marginTop: 14,
    textShadowColor: 'rgba(240,201,84,0.45)',
    textShadowRadius: 12,
  },
  bottomBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
  },
});
