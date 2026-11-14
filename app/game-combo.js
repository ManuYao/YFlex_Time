import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import AmbianceBackdrop from '../components/common/AmbianceBackdrop';
import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import Button from '../components/common/Button';
import PressTap from '../components/common/PressTap';
import AppIcon from '../components/common/AppIcon';
import TickRing from '../components/common/TickRing';
import GameScoreList from '../components/screens/GameScoreList';
import GameTagOverlays from '../components/screens/GameTagOverlays';
import HoldToTag from '../components/common/HoldToTag';
import { useGameExerciseTag } from '../hooks/useGameExerciseTag';
import { exercisesLabel, shouldHalo } from '../lib/gameExercises';
import { useSettings } from '../contexts/SettingsContext';
import { haptic } from '../hooks/useHaptic';
import { usePremium } from '../hooks/usePremium';
import { useKeyboardHeight, scrollToFocusedInput } from '../hooks/useKeyboardHeight';
import { fonts } from '../lib/fonts';
import { goBackSafe } from '../lib/navigation';
import { DEFAULT_TEMPO, TEMPOS } from '../lib/gameCount';
import { playGameGo, preloadGameSounds } from '../lib/gameSounds';
import { areGameWordsReady, prepareGameWords, speakGame, stopVoiceCoach } from '../lib/voiceCoach';
import {
  loadComboScores,
  saveComboScore,
  deleteComboScore,
  loadComboSetup,
  saveComboSetup,
  setComboScoreExercises,
} from '../lib/gameComboStore';
import { recordGameSession, setGameSessionExercises } from '../lib/gameHistory';
import {
  DEFAULT_SETUP,
  EXO_MAX,
  EXO_SUGGESTIONS,
  GAME_SECONDS,
  PROBLEM_TEXT,
  WORD_MAX,
  bestComboScore,
  cleanText,
  formatClock,
  planCalls,
  setupProblem,
} from '../lib/gameCombo';

const KEEP_AWAKE_TAG = 'flextimer-game';
const RING = 280;

// Teinte du jeu : un rose vif, absent des 5 modes et différent du bleu-vert du
// chef d'orchestre et de l'orange de la pyramide.
const GAME_BG = ['#4A1230', '#2E0B1D', '#16050F'];
const ACCENT = '#FF5FA2';
const ACCENT_DIM = 'rgba(255,95,162,0.28)';
const ACCENT_FAINT = 'rgba(255,95,162,0.12)';
const ON_ACCENT = '#2A0A18';
const FRESH_MS = 1300; // un mot reste « allumé » ce temps-là, puis s'atténue

const formatDay = (at) => {
  const d = new Date(at);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const scoreValue = (s) => s.total;

// Taille du mot selon sa longueur, pour qu'il tienne dans l'anneau.
const wordSize = (len) => (len <= 4 ? 104 : len <= 6 ? 80 : len <= 8 ? 62 : len <= 10 ? 50 : 42);


/**
 * « Combo Bi-Exo » — deux mots, deux exercices. La voix crie un des deux mots au
 * hasard ; on fait aussitôt UNE répétition de l'exercice qui va avec. Les mots
 * et les exercices sont ceux du joueur (toujours deux mots différents). Celui
 * qui lâche appuie sur « J'ai lâché » : son score est le nombre d'appels
 * entendus. Solo, sur la confiance : aucun capteur, aucun envoi, scores gardés
 * sur le téléphone (lib/gameComboStore.js) et supprimables.
 */
export default function GameCombo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { settings } = useSettings();
  const { isPremium, loaded: premiumLoaded } = usePremium();

  // Combo Bi-Exo est réservé à Premium. Le menu des jeux refuse déjà le toucher ; ce filet
  // couvre un accès direct (lien, démo) : on renvoie vers la page Premium, sans rien jouer.
  useEffect(() => {
    if (premiumLoaded && !isPremium) router.replace('/premium');
  }, [premiumLoaded, isPremium, router]);

  const [phase, setPhase] = useState('ready'); // ready | countdown | playing | done
  const [tempoId, setTempoId] = useState(DEFAULT_TEMPO);
  const [setup, setSetup] = useState(DEFAULT_SETUP);
  const [countdown, setCountdown] = useState(3);
  const [call, setCall] = useState(null); // { n, side }
  const [fresh, setFresh] = useState(false);
  const [remaining, setRemaining] = useState(GAME_SECONDS);
  const [scores, setScores] = useState([]);
  const [result, setResult] = useState(null); // { counts, total, record, complete }
  const [audioReady, setAudioReady] = useState(false); // les mots sont préchargés

  const phaseRef = useRef('ready');
  const callsRef = useRef(0);
  const sideCallsRef = useRef({ a: 0, b: 0 }); // appels criés pour chaque mot
  const cfgRef = useRef(null); // réglages figés au lancement
  const timers = useRef([]);
  const tickTimer = useRef(null);
  const scoresRef = useRef([]);
  // Début réel et fin de la partie, pour l'Historique (lib/gameHistory.js).
  const playStartRef = useRef(null);
  const playEndRef = useRef(null);
  const contentRef = useRef(null);

  const keyboardHeight = useKeyboardHeight();
  const liftStyle = useAnimatedStyle(() => ({
    height: Math.max(insets.bottom + 24, keyboardHeight.value + 16),
  }));

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
      loadComboScores().then((list) => {
        if (cancelled) return;
        scoresRef.current = list;
        setScores(list);
      });
      loadComboSetup().then((saved) => {
        if (!cancelled) setSetup(saved);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const clearTimers = () => {
    clearTimeout(tickTimer.current);
    tickTimer.current = null;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const releaseGame = () => {
    clearTimers();
    stopVoiceCoach();
    try { deactivateKeepAwake(KEEP_AWAKE_TAG); } catch {}
  };

  // Quitte l'écran : plus de voix, plus de minuterie.
  useEffect(() => releaseGame, []);

  // Les mots sont dits par la voix du téléphone. Dès qu'ils changent (et au départ),
  // on les précharge : le moteur vocal est réveillé et la voix « homme » repérée,
  // pour que le premier mot ne se fasse pas attendre. Tant que ce n'est pas fait,
  // « Lancer » reste éteint et le dit. Un mot déjà préparé ne fait rien attendre.
  const voiceGender = settings.voiceGender;
  const wordsKey = `${setup.a.word}|${setup.b.word}`;
  useEffect(() => {
    if (setupProblem(setup)) {
      // Rien à charger tant qu'il n'y a pas deux mots : le bouton dit déjà pourquoi.
      setAudioReady(false);
      return undefined;
    }
    const words = [cleanText(setup.a.word, WORD_MAX), cleanText(setup.b.word, WORD_MAX)];
    if (areGameWordsReady(words, voiceGender)) {
      setAudioReady(true);
      return undefined;
    }
    setAudioReady(false);
    let cancelled = false;
    // On laisse finir la frappe avant de charger.
    const timer = setTimeout(() => {
      // Même si le moteur ne répond pas, on débloque (la parole n'en dépend pas).
      prepareGameWords(words, voiceGender)
        .catch(() => false)
        .then(() => {
          if (!cancelled) setAudioReady(true);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [wordsKey, voiceGender]);

  // Enregistre le score et montre le résultat.
  // `counts` = { a, b } : mots criés pour chaque mot ; le score est leur somme.
  const commitScore = async (counts, complete = false) => {
    if (phaseRef.current === 'done') return;
    const cfg = cfgRef.current;
    const total = counts.a + counts.b;
    const previousBest = bestComboScore(scoresRef.current, cfg.tempoId);
    goPhase('done');
    setResult({ counts, total, record: total > 0 && total > previousBest, complete });
    haptic.success();
    if (total > 0) {
      // La partie entre dans l'Historique ; son id est gardé dans le score pour y noter
      // l'exercice plus tard (si la personne le maintient).
      const entry = await recordGameSession({
        game: 'combo',
        startedAt: playStartRef.current,
        endedAt: playEndRef.current ?? Date.now(),
        reps: total,
      });
      const list = await saveComboScore({
        tempo: cfg.tempoId,
        counts,
        complete,
        setup: cfg.setup,
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
  // le hook commun, hooks/useGameExerciseTag.js).
  const saveExercises = useCallback(async (id, exercises) => {
    const score = scoresRef.current.find((s) => s.id === id);
    const list = await setComboScoreExercises(id, exercises);
    scoresRef.current = list;
    setScores(list);
    if (score?.historyId) setGameSessionExercises(score.historyId, exercises);
  }, []);

  // Fin de partie : le score est enregistré et affiché tout de suite, sans rien
  // demander (choix de l'utilisateur pour ce jeu : pas de roue de confirmation
  // comme dans les autres jeux). Le score est le nombre de mots criés.
  // Le temps est écoulé.
  const completeGame = () => {
    if (phaseRef.current !== 'playing') return;
    const cfg = cfgRef.current;
    playEndRef.current = Date.now();
    releaseGame();
    commitScore({ ...sideCallsRef.current }, true);
    // Le dernier mot est loin (marge de fin) : « Terminé. » ne le coupe pas.
    setTimeout(() => speakGame('Terminé.', cfg.gender, { interrupt: true }), 600);
  };

  // « J'ai lâché ».
  const finish = () => {
    if (phaseRef.current !== 'playing') return;
    playEndRef.current = Date.now();
    releaseGame();
    commitScore({ ...sideCallsRef.current }, false);
  };

  // Toute la partie est tirée d'avance ; chaque appel part à son heure exacte
  // (calculée depuis le départ, donc sans dérive).
  const startPlaying = () => {
    const cfg = cfgRef.current;
    const plan = planCalls(cfg.setup, cfg.tempoId);
    const startedAt = Date.now();
    const endAt = startedAt + GAME_SECONDS * 1000;
    callsRef.current = 0;
    sideCallsRef.current = { a: 0, b: 0 };
    playStartRef.current = startedAt;
    playEndRef.current = null;
    setCall(null);
    setRemaining(GAME_SECONDS);
    goPhase('playing');

    plan.forEach(({ atMs, side }) => {
      later(Math.max(0, startedAt + atMs - Date.now()), () => {
        if (phaseRef.current !== 'playing') return;
        const n = callsRef.current + 1;
        callsRef.current = n;
        sideCallsRef.current[side] += 1;
        setCall({ n, side });
        setFresh(true);
        haptic.light();
        speakGame(cfg.setup[side].word, cfg.gender, { interrupt: true });
        later(FRESH_MS, () => setFresh(false));
      });
    });
    later(GAME_SECONDS * 1000, completeGame);

    let shown = GAME_SECONDS;
    const tick = () => {
      if (phaseRef.current !== 'playing') return;
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      if (left !== shown) {
        shown = left;
        setRemaining(left);
      }
      tickTimer.current = setTimeout(tick, 250);
    };
    tick();
  };

  const startGame = () => {
    if (setupProblem(setup) || !audioReady) return;
    haptic.medium();
    const clean = {
      a: { word: cleanText(setup.a.word, WORD_MAX), exo: cleanText(setup.a.exo, EXO_MAX) },
      b: { word: cleanText(setup.b.word, WORD_MAX), exo: cleanText(setup.b.exo, EXO_MAX) },
    };
    cfgRef.current = { tempoId, setup: clean, gender: settings.voiceGender };
    saveComboSetup(clean);
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    // Son décodé d'avance, sinon le bip final saute.
    preloadGameSounds();
    goPhase('countdown');
    setCountdown(3);
    later(1000, () => { setCountdown(2); });
    later(2000, () => { setCountdown(1); });
    later(3000, playGameGo);
    later(3850, startPlaying);
  };

  const cancelCountdown = () => {
    releaseGame();
    goPhase('ready');
  };

  // Touche retour d'Android : pendant la partie elle compte comme « j'ai lâché ».
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const current = phaseRef.current;
      if (current === 'playing') {
        finish();
        return true;
      }
      if (current === 'countdown') {
        cancelCountdown();
        return true;
      }
      // Sur le résultat : retour au menu DE CE JEU, pas au menu des jeux.
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

  const handleDelete = async (id) => {
    haptic.warning();
    const list = await deleteComboScore(id);
    scoresRef.current = list;
    setScores(list);
  };

  const setField = (side, field, value) =>
    setSetup((s) => ({ ...s, [side]: { ...s[side], [field]: value } }));

  const problem = setupProblem(setup);
  const loadingAudio = !problem && !audioReady;
  const best = bestComboScore(scores, tempoId);
  // Noter l'exercice d'un score (maintien, fenêtre « Ton exercice », bulle du menu) : tout ce qui est
  // commun aux jeux vit dans hooks/useGameExerciseTag.js et components/screens/GameTagOverlays.js.
  // Le défilement du menu sert aussi au clavier des mots : un seul `scrollRef`, celui du hook.
  const tag = useGameExerciseTag({ phase, scores, saveExercises });
  const scrollRef = tag.readyScrollRef;
  const doneScore = result?.scoreId ? scores.find((s) => s.id === result.scoreId) : null;
  const ring = Math.min(RING, Math.round(height * 0.34));
  const live = cfgRef.current?.setup;
  const callWord = call && live ? live[call.side].word : '';
  const callExo = call && live ? live[call.side].exo : '';

  // `onBack` : la flèche en haut à gauche (par défaut : quitter le jeu, retour au menu des jeux ;
  // sur l'écran de résultat : retour au menu DU JEU).
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

  // Un mot, son exercice et des idées d'exercice à toucher.
  const renderSide = (side, label) => {
    const value = setup[side];
    return (
      <View style={styles.sideCard}>
        <Text style={styles.sideLabel}>{label}</Text>
        <TextInput
          value={value.word}
          onChangeText={(v) => setField(side, 'word', v)}
          onFocus={() => setTimeout(() => scrollToFocusedInput(scrollRef, contentRef), 60)}
          placeholder="Le mot crié"
          placeholderTextColor="rgba(255,255,255,0.30)"
          autoCapitalize="sentences"
          autoCorrect={false}
          maxLength={WORD_MAX}
          style={styles.input}
          accessibilityLabel={`${label}, le mot crié`}
        />
        <Text style={styles.sideSub}>EXERCICE</Text>
        <View style={styles.suggestions}>
          {EXO_SUGGESTIONS.map((name) => {
            const on = value.exo === name;
            return (
              <PressTap
                key={name}
                onPress={() => {
                  haptic.selection();
                  // Retoucher l'exercice choisi l'enlève : il reste facultatif.
                  setField(side, 'exo', on ? '' : name);
                }}
                tapScale={0.95}
                style={[styles.suggestion, on && styles.suggestionOn]}
                accessibilityLabel={`Exercice ${name}`}
              >
                <Text style={[styles.suggestionText, on && styles.suggestionTextOn]}>{name}</Text>
              </PressTap>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <GradientBackground colors={GAME_BG} ambient>
      {/* Décor de la saison une fois la partie lancée, jamais dans le réglage (règle des jeux) */}
      {phase !== 'ready' && <AmbianceBackdrop tone="light" />}
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {phase === 'ready' && (
          <>
            {renderTop('Combo Bi-Exo')}
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={styles.readyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onScroll={tag.onReadyScroll}
              scrollEventThrottle={32}
            >
              <View ref={contentRef} collapsable={false} style={styles.readyInner}>
                <Text style={styles.tag}>JEU · DEUX MOTS, DEUX EXERCICES</Text>
                <Text style={styles.rules}>
                  Choisis deux mots et un exercice pour chacun. La voix en crie un au hasard : tu fais
                  tout de suite UNE répétition de l’exercice qui va avec. Enchaîne pendant 3 min 30. Le
                  temps entre deux mots s’adapte aux exercices : se relever en demande plus.
                </Text>

                <Text style={styles.sectionLabel}>RYTHME</Text>
                <View style={styles.chips}>
                  {Object.values(TEMPOS).map((t) => {
                    const on = t.id === tempoId;
                    return (
                      <PressTap
                        key={t.id}
                        onPress={() => {
                          haptic.selection();
                          setTempoId(t.id);
                        }}
                        tapScale={0.96}
                        containerStyle={styles.chipWrap}
                        style={[styles.chip, on && styles.chipOn]}
                        accessibilityLabel={`Rythme ${t.label}`}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
                      </PressTap>
                    );
                  })}
                </View>

                {renderSide('a', 'MOT 1')}
                {renderSide('b', 'MOT 2')}

                {problem && <Text style={styles.problem}>{PROBLEM_TEXT[problem]}</Text>}

                <View style={styles.bestRow}>
                  <AppIcon name="trophies" size={18} color="#FFFFFF" />
                  <Text style={styles.bestText}>
                    {best > 0
                      ? `Ton record (${TEMPOS[tempoId].label}) : ${best} répétitions`
                      : 'Pas encore de record ici — à toi de jouer'}
                  </Text>
                </View>

                <Button
                  variant="solid"
                  icon={loadingAudio ? undefined : 'play'}
                  label={loadingAudio ? 'Chargement des audios…' : 'Lancer'}
                  haptic={haptic.medium}
                  onPress={startGame}
                  disabled={!!problem || loadingAudio}
                  fullWidth
                />

                <GameScoreList
                  scores={scores}
                  accent={ACCENT}
                  getValue={scoreValue}
                  renderRow={(s, inDay) => (
                    // Maintenir 1 s une ligne = noter (ou changer) son exercice ; le halo
                    // n'éclaire que le dernier score, tant qu'il n'a pas d'exercice.
                    <HoldToTag
                      ref={s.id === scores[0]?.id ? tag.firstRowRef : undefined}
                      color={ACCENT}
                      radius={16}
                      invite={shouldHalo(s, scores[0])}
                      onHold={() => tag.openTag(s.id)}
                      style={styles.scoreRow}
                      accessibilityLabel={`Score ${s.total}. Maintiens pour noter ton exercice.`}
                    >
                      <Text style={styles.scoreCount}>{s.total}</Text>
                      <Text style={styles.scoreMeta} numberOfLines={1}>
                        {TEMPOS[s.tempo]?.label} · {s.detail || s.words}
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
              </View>
              <Animated.View style={liftStyle} />
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

        {phase === 'playing' && live && (
          <View style={styles.center}>
            <Text style={styles.clock}>{formatClock(remaining)}</Text>
            <View style={[styles.ringWrap, { width: ring, height: ring }]}>
              <TickRing
                progress={1 - remaining / GAME_SECONDS}
                size={ring}
                colorActive={ACCENT}
                colorInactive={ACCENT_FAINT}
              />
              <View style={styles.ringCenter} pointerEvents="none">
                <View style={[styles.wordBox, { width: ring * 0.74 }]}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.word,
                      { fontSize: wordSize(callWord.length), lineHeight: Math.round(wordSize(callWord.length) * 1.2) },
                      !fresh && styles.wordDim,
                    ]}
                  >
                    {callWord ? callWord.toLocaleUpperCase('fr-FR') : '…'}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={[styles.exo, !fresh && styles.exoDim]} numberOfLines={1}>
              {callExo || (call ? ' ' : 'Prépare-toi')}
            </Text>
            <Text style={styles.hint}>
              {call ? `Appel n°${call.n}` : 'Le premier mot arrive'}
            </Text>
            <View style={styles.recap}>
              {['a', 'b'].map((side) => {
                const on = call?.side === side;
                return (
                  <View key={side} style={[styles.recapPill, on && styles.recapPillOn]}>
                    <Text style={[styles.recapWord, on && styles.recapWordOn]} numberOfLines={1}>
                      {live[side].word}
                    </Text>
                    <Text style={[styles.recapExo, on && styles.recapExoOn]} numberOfLines={1}>
                      {live[side].exo || ' '}
                    </Text>
                  </View>
                );
              })}
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

        {phase === 'done' && (
          <>
            {renderTop('Combo Bi-Exo', backToMenu)}
            <View style={styles.center}>
              {/* Le score : un halo l'entoure tant que l'exercice n'est pas noté, et le MAINTENIR
                  1 s ouvre « Ton exercice » (avec les deux exercices de la partie déjà cochés).
                  Rien ne s'ouvre tout seul. */}
              <HoldToTag
                color={ACCENT}
                radius={36}
                invite={!!doneScore && !doneScore.exercises?.length}
                onHold={() => tag.openTag(result?.scoreId)}
                style={styles.resultBlock}
                accessibilityLabel="Ton score. Maintiens pour noter ton exercice."
              >
                <Text style={styles.tag}>{result?.complete ? 'PARTIE TERMINÉE' : 'TON SCORE'}</Text>
                <Text style={styles.bigNumber}>{result?.total ?? 0}</Text>
                <Text style={styles.hint}>répétitions en {formatClock(GAME_SECONDS)}</Text>
                {!!doneScore?.exercises?.length && (
                  <Text style={styles.resultExo} numberOfLines={1}>
                    {exercisesLabel(doneScore.exercises)}
                  </Text>
                )}
              </HoldToTag>
              {result?.record && <Text style={styles.record}>NOUVEAU RECORD</Text>}
              {!result?.record && best > 0 && (
                <Text style={styles.hint}>Ton record : {best} répétitions</Text>
              )}
              <View style={styles.bottomBar}>
                <Button
                  variant="solid"
                  icon="reset"
                  label="Rejouer"
                  haptic={haptic.medium}
                  onPress={() => {
                    // Rejoue VRAIMENT (mêmes mots, même rythme) ; si les mots ne sont pas
                    // prêts, on retombe sur le menu du jeu plutôt que de ne rien faire.
                    setResult(null);
                    if (setupProblem(setup) || !audioReady) {
                      goPhase('ready');
                      return;
                    }
                    startGame();
                  }}
                  fullWidth
                />
              </View>
            </View>
          </>
        )}
      </SafeAreaView>

      {/* « Ton exercice » (ouverte seulement quand on maintient un score ; le combo coche d'office
          les deux exercices écrits par le joueur) et la bulle du menu. */}
      <GameTagOverlays
        tag={tag}
        phase={phase}
        screenH={height}
        accent={ACCENT}
        initialFor={(s) => (s.exercises?.length ? s.exercises : s.exos ?? [])}
      />
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
  readyContent: { paddingHorizontal: 20 },
  readyInner: { gap: 14 },
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
  chipTextOn: { color: ON_ACCENT },
  sideCard: {
    gap: 10,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,95,162,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,95,162,0.2)',
  },
  sideLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: ACCENT,
  },
  sideSub: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontFamily: fonts.sansSemibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestion: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  suggestionOn: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.7)' },
  suggestionText: { fontFamily: fonts.sansSemibold, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  suggestionTextOn: { color: '#FFFFFF' },
  problem: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: '#F0C954',
    textAlign: 'center',
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  bestText: { fontFamily: fonts.sansSemibold, fontSize: 14, color: '#FFFFFF', flex: 1 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,95,162,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,95,162,0.18)',
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
  clock: {
    fontFamily: fonts.monoBold,
    fontSize: 22,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
  },
  ringWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordBox: { alignItems: 'center', overflow: 'hidden' },
  // Anton / Saira : lineHeight à ×1,2 de la taille, jamais égal.
  word: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlign: 'center',
  },
  wordDim: { color: 'rgba(255,255,255,0.5)' },
  exo: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 26,
    color: ACCENT,
    textAlign: 'center',
    marginTop: 14,
  },
  exoDim: { color: ACCENT_DIM },
  recap: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 18 },
  recapPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  recapPillOn: { backgroundColor: 'rgba(255,95,162,0.18)', borderColor: ACCENT },
  recapWord: { fontFamily: fonts.sansExtraBold, fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  recapWordOn: { color: '#FFFFFF' },
  recapExo: { fontFamily: fonts.sansMedium, fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  recapExoOn: { color: 'rgba(255,255,255,0.85)' },
  // Anton : lineHeight à ×1,18 de la taille, jamais égal.
  bigNumber: {
    fontFamily: fonts.display,
    fontSize: 120,
    lineHeight: 142,
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlign: 'center',
  },
  countdownNumber: {
    fontFamily: fonts.display,
    fontSize: 160,
    lineHeight: 190,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  // Le « 1 » final prend la couleur du jeu : c'est le moment de commencer.
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
