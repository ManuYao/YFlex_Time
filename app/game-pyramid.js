import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { useSettings } from '../contexts/SettingsContext';
import { haptic } from '../hooks/useHaptic';
import { fonts } from '../lib/fonts';
import { goBackSafe } from '../lib/navigation';
import { playGameGo, preloadGameSounds } from '../lib/gameSounds';
import { createFixedNumberCaller } from '../lib/gameVoice';
import { speakGame, stopVoiceCoach } from '../lib/voiceCoach';
import { loadPyramidScores, savePyramidScore, deletePyramidScore } from '../lib/gamePyramidScores';
import {
  DEFAULT_EXERCISE,
  DEFAULT_TEMPO,
  EXERCISES,
  MUSCLE_GROUPS,
  exercisesOf,
  getExercise,
  tempoMs,
} from '../lib/gameCount';
import {
  DEFAULT_FORMAT,
  DEFAULT_PEAK,
  FORMATS,
  PEAKS,
  bestPyramidScore,
  buildSets,
  getFormat,
  plannedSeconds,
  repStepMs,
  repsDone,
  restSeconds,
  totalReps,
} from '../lib/gamePyramid';

const KEEP_AWAKE_TAG = 'flextimer-game';
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

  const [phase, setPhase] = useState('ready'); // ready | countdown | set | rest | confirm | done
  const [formatId, setFormatId] = useState(DEFAULT_FORMAT);
  const [peak, setPeak] = useState(DEFAULT_PEAK);
  const [exerciseId, setExerciseId] = useState(DEFAULT_EXERCISE);
  const [sets, setSets] = useState(() => buildSets(DEFAULT_FORMAT, DEFAULT_PEAK));
  const [setIndex, setSetIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [restLeft, setRestLeft] = useState(0);
  const [restTotal, setRestTotal] = useState(1);
  const [scores, setScores] = useState([]);
  const [result, setResult] = useState(null); // { total, record, complete }
  const [finalCount, setFinalCount] = useState(0);

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

  const exercise = getExercise(exerciseId);
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

  // Enregistre le score définitif (après la confirmation) et montre le résultat.
  const commitScore = async (value, complete = false) => {
    if (phaseRef.current === 'done') return;
    const cfg = cfgRef.current;
    const previousBest = bestPyramidScore(scoresRef.current, cfg.exerciseId, cfg.formatId, cfg.peak);
    goPhase('done');
    setResult({ total: value, record: value > 0 && value > previousBest, complete });
    haptic.success();
    if (value > 0) {
      const list = await savePyramidScore({
        exercise: cfg.exerciseId,
        format: cfg.formatId,
        peak: cfg.peak,
        total: value,
        complete,
        tempo: cfg.tempoId,
      });
      scoresRef.current = list;
      setScores(list);
    }
  };

  // Toute la pyramide faite : pas de confirmation, rien à corriger.
  const completePyramid = () => {
    const cfg = cfgRef.current;
    const all = totalReps(setsRef.current);
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
    const baseMs = tempoMs(cfg.exerciseId, cfg.tempoId);
    // Répétitions déjà faites avant cette série, et total prévu : la voix ralentit
    // peu à peu avec la fatigue (voir FATIGUE_SLOWDOWN dans lib/gamePyramid.js).
    const doneBefore = repsDone(setsRef.current, i);
    const plannedTotal = totalReps(setsRef.current);
    const caller = callerRef.current;
    if (!caller) return;
    setIndexRef.current = i;
    setSetIndex(i);
    countRef.current = 0;
    setCount(0);
    goPhase('set');
    let nextAt = Date.now();

    const tick = () => {
      if (phaseRef.current !== 'set') return;
      const n = countRef.current + 1;
      countRef.current = n;
      caller.say(n);
      setCount(n);
      nextAt += repStepMs(baseMs, doneBefore + n, plannedTotal);
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

  const startGame = () => {
    haptic.medium();
    const planned = buildSets(formatId, peak);
    setsRef.current = planned;
    setSets(planned);
    // Le rythme est toujours « Normal » : pas de choix dans ce jeu.
    cfgRef.current = { exerciseId, tempoId: DEFAULT_TEMPO, formatId, peak, gender: settings.voiceGender };
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    // Son décodé d'avance, sinon le bip final saute.
    preloadGameSounds();
    // Un lecteur par chiffre de la pyramide, créé pendant le décompte (décodage
    // des MP3) puis jamais rechargé : voir lib/gameVoice.js.
    callerRef.current = createFixedNumberCaller(settings.voiceGender, Math.max(...planned));
    callerRef.current.preload(1, Math.max(...planned));
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
      return false;
    });
    return () => sub.remove();
  }, []);

  const handleDelete = async (id) => {
    haptic.warning();
    const list = await deletePyramidScore(id);
    scoresRef.current = list;
    setScores(list);
  };

  const chooseFormat = (id) => {
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

  const best = bestPyramidScore(scores, exercise.id, formatId, peak);
  const mine = useMemo(
    () => scores.filter((s) => EXERCISES[s.exercise] && FORMATS[s.format]),
    [scores]
  );
  const total = totalReps(sets);
  const minutes = Math.max(1, Math.round(plannedSeconds(sets, tempoMs(exercise.id, DEFAULT_TEMPO)) / 60));
  const ring = Math.min(RING, Math.round(height * 0.34));
  // Repos : prochaine série en très gros, décompte dans un anneau plus petit.
  const nextSize = Math.max(96, Math.min(170, Math.round(height * 0.19)));
  const miniRing = Math.round(ring * 0.58);
  const restNumSize = Math.min(64, Math.round(miniRing * 0.4));
  const target = sets[setIndex] ?? 0;
  const nextTarget = sets[setIndex + 1] ?? 0;

  const renderTop = (title) => (
    <View style={styles.topBar}>
      <IconButton
        icon="back"
        halo="left"
        haptic={haptic.light}
        onPress={() => goBackSafe(router)}
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
              style={styles.flex}
              contentContainerStyle={styles.readyContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.tag}>JEU · {exercise.label.toUpperCase()}</Text>
              <Text style={styles.rules}>
                Des séries qui montent, qui descendent, ou les deux. Une voix compte chaque répétition,
                puis tu te reposes avant la suivante. Va le plus loin possible : quand tu lâches, appuie
                sur le bouton.
              </Text>

              <Text style={styles.sectionLabel}>FORMAT</Text>
              <View style={styles.chips}>
                {Object.values(FORMATS).map((f) => {
                  const on = f.id === formatId;
                  return (
                    <PressTap
                      key={f.id}
                      onPress={() => chooseFormat(f.id)}
                      tapScale={0.96}
                      containerStyle={styles.chipWrap}
                      style={[styles.chip, on && styles.chipOn]}
                      accessibilityLabel={`Format ${f.label}`}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                        {f.label}
                      </Text>
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
                  {sets.length} séries · {total} {exercise.unit} · environ {minutes} min
                </Text>
              </View>

              <Text style={styles.sectionLabel}>GROUPE MUSCULAIRE</Text>
              <View style={styles.chips}>
                {Object.values(MUSCLE_GROUPS).map((g) => {
                  const on = g.id === exercise.group;
                  return (
                    <PressTap
                      key={g.id}
                      onPress={() => {
                        if (on) return;
                        haptic.selection();
                        setExerciseId(g.exercises[0]);
                      }}
                      tapScale={0.96}
                      containerStyle={styles.chipWrap}
                      style={[styles.chip, on && styles.chipOn]}
                      accessibilityLabel={`Groupe ${g.label}`}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{g.label}</Text>
                    </PressTap>
                  );
                })}
              </View>

              {exercisesOf(exercise.group).length > 1 && (
                <>
                  <Text style={styles.sectionLabel}>EXERCICE</Text>
                  <View style={styles.chips}>
                    {exercisesOf(exercise.group).map((ex) => {
                      const on = ex.id === exercise.id;
                      return (
                        <PressTap
                          key={ex.id}
                          onPress={() => {
                            haptic.selection();
                            setExerciseId(ex.id);
                          }}
                          tapScale={0.96}
                          containerStyle={styles.chipWrap}
                          style={[styles.chip, on && styles.chipSoftOn]}
                          accessibilityLabel={`Exercice ${ex.label}`}
                        >
                          <Text style={[styles.chipText, on && styles.chipTextSoftOn]} numberOfLines={1}>
                            {ex.label}
                          </Text>
                        </PressTap>
                      );
                    })}
                  </View>
                </>
              )}

              <View style={styles.bestRow}>
                <AppIcon name="trophies" size={18} color="#FFFFFF" />
                <Text style={styles.bestText}>
                  {best > 0
                    ? `Ton record : ${best} ${exercise.unit}`
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
                scores={mine}
                accent={ACCENT}
                getValue={scoreValue}
                renderRow={(s, inDay) => (
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreCount}>{s.total}</Text>
                    <Text style={styles.scoreMeta}>
                      {EXERCISES[s.exercise].label} · {FORMATS[s.format].label} {s.peak}
                      {inDay ? '' : ` · ${formatDay(s.at)}`}
                      {s.complete ? ' · terminée' : ''}
                    </Text>
                    <PressTap
                      onPress={() => handleDelete(s.id)}
                      tapScale={0.9}
                      style={styles.scoreDelete}
                      accessibilityLabel="Supprimer ce score"
                    >
                      <AppIcon name="close" size={14} color="rgba(255,255,255,0.7)" />
                    </PressTap>
                  </View>
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

        {phase === 'set' && (
          <View style={styles.center}>
            {/* Lisible de loin (téléphone posé au sol) : la série en cours, son objectif
                et la suivante sont en gros, pas en petite ligne sous l'anneau. */}
            <Text style={styles.setHeader}>
              SÉRIE {setIndex + 1}
              <Text style={styles.setHeaderDim}> / {sets.length}</Text>
            </Text>
            <View style={[styles.ringWrap, { width: ring, height: ring }]}>
              <TickRing
                progress={target > 0 ? count / target : 0}
                size={ring}
                colorActive={ACCENT}
                colorInactive={ACCENT_FAINT}
              />
              <View style={styles.ringCenter} pointerEvents="none">
                <Text style={styles.bigNumber}>{count}</Text>
              </View>
            </View>
            <Text style={styles.goalCaption}>OBJECTIF DE LA SÉRIE</Text>
            <Text style={styles.goalNumber}>
              {target}
              <Text style={styles.goalUnit}> {exercise.unit}</Text>
            </Text>
            <Text style={styles.nextHint}>
              {nextTarget > 0 ? `Ensuite : ${nextTarget} ${exercise.unit}` : 'Dernière série !'}
            </Text>
            <View style={styles.liveBars}>
              <PyramidBars sets={sets} activeIndex={setIndex} height={64} />
            </View>
            <View style={styles.bottomBar}>
              <Button
                variant="danger"
                icon="stop"
                label="J’ai lâché"
                haptic={haptic.medium}
                onPress={finish}
                fullWidth
              />
            </View>
          </View>
        )}

        {phase === 'rest' && (
          <View style={styles.center}>
            <Text style={styles.tag}>REPOS · SÉRIE {setIndex + 1} FAITE</Text>
            {/* Ce qu'on veut savoir de loin pendant le repos : la PROCHAINE série, en très
                gros. Le décompte est plus petit et porte son unité « s » : avant, il était
                en gros au centre et, comme le repos vaut les répétitions de la plus grosse
                série voisine, il affichait le même chiffre que la série suivante (« 8 » pour
                8 secondes ET 8 pompes) : on croyait que c'était le nombre à faire. */}
            <Text style={styles.nextLabel}>PROCHAINE SÉRIE</Text>
            <Text style={[styles.nextBig, { fontSize: nextSize, lineHeight: Math.round(nextSize * 1.18) }]}>
              {nextTarget}
            </Text>
            <Text style={styles.nextUnit}>{exercise.unit}</Text>
            <View style={[styles.ringWrap, styles.restRing, { width: miniRing, height: miniRing }]}>
              <TickRing
                progress={restTotal > 0 ? 1 - restLeft / restTotal : 0}
                size={miniRing}
                colorActive={ACCENT_DIM}
                colorInactive={ACCENT_FAINT}
              />
              <View style={styles.ringCenter} pointerEvents="none">
                <Text
                  style={[
                    styles.restNumber,
                    { fontSize: restNumSize, lineHeight: Math.round(restNumSize * 1.19) },
                    restLeft === 1 && styles.countdownGo,
                  ]}
                >
                  {restLeft}
                  <Text style={styles.restUnit}> s</Text>
                </Text>
              </View>
            </View>
            <View style={styles.liveBars}>
              <PyramidBars sets={sets} activeIndex={setIndex + 1} height={64} />
            </View>
            <View style={styles.bottomBar}>
              <Button
                variant="danger"
                icon="stop"
                label="Je m’arrête"
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
            {renderTop('La pyramide')}
            <View style={styles.center}>
              <Text style={styles.tag}>{result?.complete ? 'PYRAMIDE TERMINÉE' : 'TON SCORE'}</Text>
              <Text style={styles.bigNumber}>{result?.total ?? 0}</Text>
              <Text style={styles.hint}>
                {exercise.unit} sur {total}
              </Text>
              {result?.record && <Text style={styles.record}>NOUVEAU RECORD</Text>}
              {!result?.record && best > 0 && (
                <Text style={styles.hint}>
                  Ton record : {best} {exercise.unit}
                </Text>
              )}
              <View style={styles.bottomBar}>
                <Button
                  variant="solid"
                  icon="reset"
                  label="Rejouer"
                  haptic={haptic.medium}
                  onPress={() => {
                    setResult(null);
                    goPhase('ready');
                  }}
                  fullWidth
                />
              </View>
            </View>
          </>
        )}
      </SafeAreaView>

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
  // Écran de série : « SÉRIE 7 / 15 », objectif et série suivante lisibles de loin.
  // Anton : lineHeight à ×1,18 de la taille, jamais égal.
  setHeader: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 52,
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlign: 'center',
  },
  setHeaderDim: { color: 'rgba(255,255,255,0.45)' },
  goalCaption: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 12,
  },
  goalNumber: {
    fontFamily: fonts.display,
    fontSize: 64,
    lineHeight: 76,
    color: ACCENT,
    includeFontPadding: false,
    textAlign: 'center',
  },
  goalUnit: { fontFamily: fonts.sansExtraBold, fontSize: 24, color: '#FFFFFF' },
  nextHint: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    marginTop: 4,
  },
  // Écran de repos : la prochaine série en très gros (taille calculée selon la hauteur).
  nextLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  nextBig: {
    fontFamily: fonts.display,
    color: ACCENT,
    includeFontPadding: false,
    textAlign: 'center',
  },
  nextUnit: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  restRing: { marginTop: 18 },
  restNumber: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlign: 'center',
  },
  restUnit: { fontFamily: fonts.sansBold, fontSize: 20, color: 'rgba(255,255,255,0.65)' },
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
  // Le « 1 » final prend la couleur du jeu : c'est le moment de commencer (décompte de
  // départ ET dernier « 1 » du repos de la pyramide, sinon il se confond avec le « 1 » de
  // la première répétition de la série, blanc lui aussi).
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
