import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

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
import { playSound, preloadSound } from '../lib/sounds';
import { createNumberCaller } from '../lib/gameVoice';
import { loadScores, saveScore, deleteScore } from '../lib/gameScores';
import {
  DEFAULT_EXERCISE,
  DEFAULT_TEMPO,
  EXERCISES,
  MAX_COUNT,
  MUSCLE_GROUPS,
  TEMPOS,
  bestScore,
  exercisesOf,
  getExercise,
  newPlanner,
  planAfter,
  tempoMs,
} from '../lib/gameCount';

const KEEP_AWAKE_TAG = 'flextimer-game';
const RING = 280;
const CONFIRM_RANGE = 5;
// Teinte du jeu : un bleu-vert profond, absent des 5 modes (rouge, gris, vert,
// jaune, violet), pour que le jeu ait sa propre identité.
const GAME_BG = ['#0F4252', '#0A2A35', '#04121A'];
const ACCENT = '#4DD8E8';
const ACCENT_DIM = 'rgba(77,216,232,0.28)';
const ACCENT_FAINT = 'rgba(77,216,232,0.12)';

const formatDay = (at) => {
  const d = new Date(at);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const scoreValue = (s) => s.count;

/**
 * « Le chef d'orchestre » (pompes) — une voix compte 1, 2, 3… et, de temps en
 * temps, se tait. Silence = on s'arrête, le compte reprend = on reprend. Celui
 * qui lâche appuie sur « J'ai lâché » : son score est le dernier chiffre dit.
 * Solo, sur la confiance : aucun capteur, aucun envoi, scores gardés sur le
 * téléphone (lib/gameScores.js) et supprimables.
 */
export default function GameCount() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { settings } = useSettings();

  const [phase, setPhase] = useState('ready'); // ready | countdown | playing | done
  const [tempoId, setTempoId] = useState(DEFAULT_TEMPO);
  const [exerciseId, setExerciseId] = useState(DEFAULT_EXERCISE);
  const [count, setCount] = useState(0);
  const [silent, setSilent] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [scores, setScores] = useState([]);
  const [result, setResult] = useState(null); // { count, record }

  const phaseRef = useRef('ready');
  const countRef = useRef(0);
  const callerRef = useRef(null);
  const loopTimer = useRef(null);
  const countdownTimers = useRef([]);
  const scoresRef = useRef([]);
  const tempoRef = useRef(DEFAULT_TEMPO);
  const exerciseRef = useRef(DEFAULT_EXERCISE);
  const selectedRef = useRef(0);
  const [finalCount, setFinalCount] = useState(0);

  const exercise = getExercise(exerciseId);

  const chooseExercise = (id) => {
    exerciseRef.current = id;
    setExerciseId(id);
  };

  const goPhase = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadScores().then((list) => {
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
    loopTimer.current = null;
    countdownTimers.current.forEach(clearTimeout);
    countdownTimers.current = [];
  };

  const releaseGame = () => {
    clearTimers();
    callerRef.current?.dispose();
    callerRef.current = null;
    try { deactivateKeepAwake(KEEP_AWAKE_TAG); } catch {}
  };

  // Quitte l'écran : plus de voix, plus de minuterie.
  useEffect(() => releaseGame, []);

  // Enregistre le score définitif (après la confirmation) et montre le résultat.
  const commitScore = async (value) => {
    if (phaseRef.current === 'done') return;
    const gameId = exerciseRef.current;
    const previousBest = bestScore(scoresRef.current, gameId);
    goPhase('done');
    setResult({ count: value, record: value > 0 && value > previousBest });
    haptic.success();
    if (value > 0) {
      const list = await saveScore({ game: gameId, count: value, tempo: tempoRef.current });
      scoresRef.current = list;
      setScores(list);
    }
  };

  // « J'ai lâché » : on ne peut pas toujours toucher le bouton pile à temps, donc
  // on demande de confirmer le score, ou de le corriger de 4 au plus vers le bas
  // (jamais vers le haut : on ne peut pas avoir fait plus que ce qui a été compté).
  const finish = () => {
    if (phaseRef.current !== 'playing') return;
    const final = countRef.current;
    releaseGame();
    setSilent(false);
    if (final <= 0) {
      commitScore(0);
      return;
    }
    haptic.medium();
    selectedRef.current = final;
    setFinalCount(final);
    goPhase('confirm');
  };

  const startPlaying = () => {
    const stepMs = tempoMs(exerciseRef.current, tempoRef.current);
    const caller = callerRef.current ?? createNumberCaller(settings.voiceGender);
    callerRef.current = caller;
    const planner = newPlanner(Math.random, exerciseRef.current);
    countRef.current = 0;
    setCount(0);
    setSilent(false);
    goPhase('playing');
    let nextAt = Date.now();

    const tick = () => {
      if (phaseRef.current !== 'playing') return;
      const n = countRef.current + 1;
      if (n > MAX_COUNT) {
        finish();
        return;
      }
      countRef.current = n;
      caller.say(n);
      caller.preload(n + 1, 2);
      setCount(n);
      const { delayMs, pauseMs } = planAfter(planner, n, stepMs);
      setSilent(pauseMs > 0);
      nextAt += delayMs;
      loopTimer.current = setTimeout(tick, Math.max(0, nextAt - Date.now()));
    };
    tick();
  };

  const startGame = () => {
    haptic.medium();
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    // Comme le vrai décompte : sons décodés d'avance, sinon le bip final saute.
    ['countdown1', 'countdown2', 'countdown3', 'go'].forEach(preloadSound);
    // Prépare les premiers chiffres pendant le décompte (décodage des MP3).
    callerRef.current = createNumberCaller(settings.voiceGender);
    callerRef.current.preload(1, 3);
    goPhase('countdown');
    setCountdown(3);
    playSound('countdown1');
    const steps = [
      [1000, () => { setCountdown(2); playSound('countdown2'); }],
      [2000, () => { setCountdown(1); playSound('countdown3'); }],
      [3000, () => { playSound('go'); }],
      [3850, startPlaying],
    ];
    countdownTimers.current = steps.map(([ms, fn]) => setTimeout(fn, ms));
  };

  const cancelCountdown = () => {
    releaseGame();
    goPhase('ready');
  };

  // Touche retour d'Android : pendant la partie elle compte comme « j'ai lâché ».
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phaseRef.current === 'playing') {
        finish();
        return true;
      }
      if (phaseRef.current === 'confirm') {
        commitScore(selectedRef.current);
        return true;
      }
      if (phaseRef.current === 'countdown') {
        cancelCountdown();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  const handleDelete = async (id) => {
    haptic.warning();
    const list = await deleteScore(id);
    scoresRef.current = list;
    setScores(list);
  };

  // Les 5 derniers chiffres comptés (le dernier = celui dit avant l'appui).
  const confirmValues = Array.from(
    { length: Math.min(CONFIRM_RANGE, finalCount + 1) },
    (_, i) => finalCount - (Math.min(CONFIRM_RANGE, finalCount + 1) - 1) + i
  );

  const best = bestScore(scores, exercise.id);
  const mine = useMemo(() => scores.filter((s) => EXERCISES[s.game]), [scores]);

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
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {phase === 'ready' && (
          <>
            {renderTop('Le chef d’orchestre')}
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.readyContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.tag}>JEU · {exercise.label.toUpperCase()}</Text>
              <Text style={styles.rules}>
                Une voix compte à voix haute. Dès qu’elle se tait, tu t’arrêtes. Quand elle reprend, tu
                reprends. Le premier qui lâche appuie sur le bouton.
              </Text>

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
                        chooseExercise(g.exercises[0]);
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
                            chooseExercise(ex.id);
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

              <Text style={styles.sectionLabel}>RYTHME</Text>
              <View style={styles.chips}>
                {Object.values(TEMPOS).map((t) => {
                  const on = t.id === tempoId;
                  return (
                    <PressTap
                      key={t.id}
                      onPress={() => {
                        haptic.selection();
                        tempoRef.current = t.id;
                        setTempoId(t.id);
                      }}
                      tapScale={0.96}
                      containerStyle={styles.chipWrap}
                      style={[styles.chip, on && styles.chipSoftOn]}
                      accessibilityLabel={`Rythme ${t.label}`}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextSoftOn]}>{t.label}</Text>
                    </PressTap>
                  );
                })}
              </View>

              <View style={styles.bestRow}>
                <AppIcon name="trophies" size={18} color="#FFFFFF" />
                <Text style={styles.bestText}>
                  {best > 0 ? `Ton record : ${best} ${exercise.unit}` : 'Pas encore de record — à toi de jouer'}
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
                    <Text style={styles.scoreCount}>{s.count}</Text>
                    <Text style={styles.scoreMeta}>
                      {EXERCISES[s.game].label}
                      {inDay ? '' : ` · ${formatDay(s.at)}`} · {TEMPOS[s.tempo]?.label ?? ''}
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
            <Text style={styles.countdownNumber}>{countdown}</Text>
            <Text style={styles.hint}>Mets-toi en position</Text>
            <View style={styles.bottomBar}>
              <Button variant="glass" label="Annuler" haptic={haptic.light} onPress={cancelCountdown} fullWidth />
            </View>
          </View>
        )}

        {phase === 'playing' && (
          <View style={styles.center}>
            <View style={styles.ringWrap}>
              <TickRing
                progress={(count % 60) / 60 || (count > 0 ? 1 : 0)}
                size={RING}
                colorActive={silent ? ACCENT_DIM : ACCENT}
                colorInactive={ACCENT_FAINT}
              />
              <View style={styles.ringCenter} pointerEvents="none">
                <Text style={[styles.bigNumber, silent && styles.bigNumberDim]}>{count}</Text>
              </View>
            </View>
            <Text style={styles.hint}>{silent ? 'Silence… ne bouge plus' : 'Suis la voix'}</Text>
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

        {phase === 'confirm' && (
          <View style={styles.center}>
            <Text style={styles.tag}>FIN DE PARTIE</Text>
            <Text style={[styles.bigNumber, styles.bigNumberDim]}>{finalCount}</Text>
          </View>
        )}

        {phase === 'done' && (
          <>
            {renderTop('Le chef d’orchestre')}
            <View style={styles.center}>
              <Text style={styles.tag}>TON SCORE</Text>
              <Text style={styles.bigNumber}>{result?.count ?? 0}</Text>
              <Text style={styles.hint}>{exercise.unit}</Text>
              {result?.record && <Text style={styles.record}>NOUVEAU RECORD</Text>}
              {!result?.record && best > 0 && (
                <Text style={styles.hint}>Ton record : {best} {exercise.unit}</Text>
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

      {/* Même feuille que la roue de l'app : fermer sans valider garde le score. */}
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
  chipTextOn: { color: '#04121A' },
  // Sélection douce (exercice, rythme) : fond blanc léger, pas de bleu plein,
  // pour qu'un seul rang (le groupe) porte la couleur vive.
  chipSoftOn: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.7)' },
  chipTextSoftOn: { color: '#FFFFFF' },
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
    backgroundColor: 'rgba(77,216,232,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(77,216,232,0.18)',
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
  ringWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
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
