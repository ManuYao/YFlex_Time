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

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import Button from '../components/common/Button';
import PressTap from '../components/common/PressTap';
import AppIcon from '../components/common/AppIcon';
import TickRing from '../components/common/TickRing';
import WheelPicker from '../components/common/WheelPicker';
import BottomSheet from '../components/common/BottomSheet';
import { useSettings } from '../contexts/SettingsContext';
import { haptic } from '../hooks/useHaptic';
import { useKeyboardHeight, scrollToFocusedInput } from '../hooks/useKeyboardHeight';
import { fonts } from '../lib/fonts';
import { goBackSafe } from '../lib/navigation';
import { playSound, preloadSound } from '../lib/sounds';
import { scanPhoneVoices, speakGame, stopVoiceCoach } from '../lib/voiceCoach';
import {
  loadComboScores,
  saveComboScore,
  deleteComboScore,
  loadComboSetup,
  saveComboSetup,
} from '../lib/gameComboStore';
import {
  DEFAULT_DURATION,
  DEFAULT_SETUP,
  DURATIONS,
  EXO_MAX,
  EXO_SUGGESTIONS,
  PROBLEM_TEXT,
  WORD_MAX,
  bestComboScore,
  cleanText,
  confirmValues,
  formatClock,
  planCalls,
  sideLabel,
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

// Taille du mot selon sa longueur, pour qu'il tienne dans l'anneau.
const wordSize = (len) => (len <= 4 ? 104 : len <= 6 ? 80 : len <= 8 ? 62 : len <= 10 ? 50 : 42);

const durationLabel = (id) => DURATIONS.find((d) => d.id === id)?.label ?? '';

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

  const [phase, setPhase] = useState('ready'); // ready | countdown | playing | confirm | done
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [setup, setSetup] = useState(DEFAULT_SETUP);
  const [countdown, setCountdown] = useState(3);
  const [call, setCall] = useState(null); // { n, side }
  const [fresh, setFresh] = useState(false);
  const [remaining, setRemaining] = useState(DEFAULT_DURATION);
  const [scores, setScores] = useState([]);
  const [result, setResult] = useState(null); // { counts, total, record, complete }
  const [finalCounts, setFinalCounts] = useState({ a: 0, b: 0 });

  const phaseRef = useRef('ready');
  const callsRef = useRef(0);
  const sideCallsRef = useRef({ a: 0, b: 0 }); // appels criés pour chaque mot
  const completeRef = useRef(false); // la partie est allée jusqu'au bout du temps
  const cfgRef = useRef(null); // réglages figés au lancement
  const timers = useRef([]);
  const tickTimer = useRef(null);
  const scoresRef = useRef([]);
  const selectedRef = useRef({ a: 0, b: 0 }); // ce que la roue a choisi pour chaque mot
  const scrollRef = useRef(null);
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

  // Les mots sont dits par la voix du téléphone : on repère d'avance sa voix
  // « homme » (sinon le choix de voix serait ignoré ici) et on réveille le moteur
  // vocal, pour que le premier mot ne se fasse pas attendre.
  useEffect(() => {
    scanPhoneVoices().catch(() => {});
  }, []);

  // Enregistre le score définitif (après la confirmation) et montre le résultat.
  // `counts` = { a, b } : répétitions faites pour chaque mot ; le score est leur somme.
  const commitScore = async (counts, complete = false) => {
    if (phaseRef.current === 'done') return;
    const cfg = cfgRef.current;
    const total = counts.a + counts.b;
    const previousBest = bestComboScore(scoresRef.current, cfg.duration);
    goPhase('done');
    setResult({ counts, total, record: total > 0 && total > previousBest, complete });
    haptic.success();
    if (total > 0) {
      const list = await saveComboScore({
        duration: cfg.duration,
        counts,
        complete,
        setup: cfg.setup,
      });
      scoresRef.current = list;
      setScores(list);
    }
  };

  // Fin de partie, qu'on ait lâché ou que le temps soit écoulé : on demande tout
  // de suite combien de répétitions ont été faites POUR CHAQUE EXERCICE (la roue,
  // comme dans les autres jeux), déjà placée sur ce que la voix a crié. On ne peut
  // pas toujours toucher le bouton pile à temps, donc chaque roue permet de corriger
  // de 4 au plus vers le bas (jamais vers le haut : on ne peut pas avoir fait plus
  // que ce qui a été crié). Rien n'a été crié : rien à confirmer.
  const openConfirm = (complete) => {
    const counts = { ...sideCallsRef.current };
    completeRef.current = complete;
    if (counts.a + counts.b <= 0) {
      commitScore(counts, complete);
      return;
    }
    if (complete) haptic.success();
    else haptic.medium();
    selectedRef.current = counts;
    setFinalCounts(counts);
    goPhase('confirm');
  };

  // Le temps est écoulé.
  const completeGame = () => {
    if (phaseRef.current !== 'playing') return;
    const cfg = cfgRef.current;
    releaseGame();
    openConfirm(true);
    // Le dernier mot est loin (marge de fin) : « Terminé. » ne le coupe pas.
    setTimeout(() => speakGame('Terminé.', cfg.gender, { interrupt: true }), 600);
  };

  // « J'ai lâché ».
  const finish = () => {
    if (phaseRef.current !== 'playing') return;
    releaseGame();
    openConfirm(false);
  };

  // Toute la partie est tirée d'avance ; chaque appel part à son heure exacte
  // (calculée depuis le départ, donc sans dérive).
  const startPlaying = () => {
    const cfg = cfgRef.current;
    const plan = planCalls(cfg.duration);
    const startedAt = Date.now();
    const endAt = startedAt + cfg.duration * 1000;
    callsRef.current = 0;
    sideCallsRef.current = { a: 0, b: 0 };
    setCall(null);
    setRemaining(cfg.duration);
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
    later(cfg.duration * 1000, completeGame);

    let shown = cfg.duration;
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
    if (setupProblem(setup)) return;
    haptic.medium();
    const clean = {
      a: { word: cleanText(setup.a.word, WORD_MAX), exo: cleanText(setup.a.exo, EXO_MAX) },
      b: { word: cleanText(setup.b.word, WORD_MAX), exo: cleanText(setup.b.exo, EXO_MAX) },
    };
    cfgRef.current = { duration, setup: clean, gender: settings.voiceGender };
    saveComboSetup(clean);
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    // Comme le vrai décompte : sons décodés d'avance, sinon le bip final saute.
    ['countdown1', 'countdown2', 'countdown3', 'go'].forEach(preloadSound);
    goPhase('countdown');
    setCountdown(3);
    playSound('countdown1');
    later(1000, () => { setCountdown(2); playSound('countdown2'); });
    later(2000, () => { setCountdown(1); playSound('countdown3'); });
    later(3000, () => { playSound('go'); });
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
      if (current === 'confirm') {
        commitScore(selectedRef.current, completeRef.current);
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
    const list = await deleteComboScore(id);
    scoresRef.current = list;
    setScores(list);
  };

  const setField = (side, field, value) =>
    setSetup((s) => ({ ...s, [side]: { ...s[side], [field]: value } }));

  const problem = setupProblem(setup);
  const best = bestComboScore(scores, duration);
  const mine = scores.filter((s) => durationLabel(s.duration)).slice(0, 8);
  const ring = Math.min(RING, Math.round(height * 0.34));
  const live = cfgRef.current?.setup;
  const callWord = call && live ? live[call.side].word : '';
  const callExo = call && live ? live[call.side].exo : '';

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
            >
              <View ref={contentRef} collapsable={false} style={styles.readyInner}>
                <Text style={styles.tag}>JEU · DEUX MOTS, DEUX EXERCICES</Text>
                <Text style={styles.rules}>
                  Choisis deux mots et un exercice pour chacun. La voix en crie un au hasard : tu fais
                  tout de suite UNE répétition de l’exercice qui va avec. Enchaîne jusqu’à la fin du
                  temps.
                </Text>

                <Text style={styles.sectionLabel}>DURÉE</Text>
                <View style={styles.chips}>
                  {DURATIONS.map((d) => {
                    const on = d.id === duration;
                    return (
                      <PressTap
                        key={d.id}
                        onPress={() => {
                          haptic.selection();
                          setDuration(d.id);
                        }}
                        tapScale={0.96}
                        containerStyle={styles.chipWrap}
                        style={[styles.chip, on && styles.chipOn]}
                        accessibilityLabel={`Durée ${d.label}`}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{d.label}</Text>
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
                      ? `Ton record sur ${durationLabel(duration)} : ${best} répétitions`
                      : 'Pas encore de record ici — à toi de jouer'}
                  </Text>
                </View>

                <Button
                  variant="solid"
                  icon="play"
                  label="Lancer"
                  haptic={haptic.medium}
                  onPress={startGame}
                  disabled={!!problem}
                  fullWidth
                />

                {mine.length > 0 && (
                  <View style={styles.history}>
                    <Text style={styles.sectionLabel}>MES SCORES</Text>
                    {mine.map((s) => (
                      <View key={s.id} style={styles.scoreRow}>
                        <Text style={styles.scoreCount}>{s.total}</Text>
                        <Text style={styles.scoreMeta} numberOfLines={1}>
                          {durationLabel(s.duration)} · {s.detail || s.words} · {formatDay(s.at)}
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
                    ))}
                  </View>
                )}
              </View>
              <Animated.View style={liftStyle} />
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

        {phase === 'playing' && live && (
          <View style={styles.center}>
            <Text style={styles.clock}>{formatClock(remaining)}</Text>
            <View style={[styles.ringWrap, { width: ring, height: ring }]}>
              <TickRing
                progress={cfgRef.current ? 1 - remaining / cfgRef.current.duration : 0}
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

        {phase === 'confirm' && (
          <View style={styles.center}>
            <Text style={styles.tag}>FIN DE PARTIE</Text>
            <Text style={[styles.bigNumber, styles.bigNumberDim]}>{finalCounts.a + finalCounts.b}</Text>
          </View>
        )}

        {phase === 'done' && (
          <>
            {renderTop('Combo Bi-Exo')}
            <View style={styles.center}>
              <Text style={styles.tag}>{result?.complete ? 'PARTIE TERMINÉE' : 'TON SCORE'}</Text>
              <Text style={styles.bigNumber}>{result?.total ?? 0}</Text>
              <Text style={styles.hint}>répétitions sur {durationLabel(cfgRef.current?.duration)}</Text>
              {result && live && result.total > 0 && (
                <View style={styles.doneSplit}>
                  {['a', 'b'].map((side) => (
                    <View key={side} style={styles.doneSplitItem}>
                      <Text style={styles.doneSplitCount}>{result.counts[side]}</Text>
                      <Text style={styles.doneSplitLabel} numberOfLines={1}>
                        {sideLabel(live[side])}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
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

      {/* Même feuille que la roue de l'app, avec une roue par exercice : fermer sans
          valider garde ce que la voix a crié. */}
      {phase === 'confirm' && live && (
        <BottomSheet
          screenH={height}
          onClose={() => commitScore(selectedRef.current, completeRef.current)}
          zIndex={140}
        >
          {({ close }) => (
            <View>
              <Text style={styles.sheetKicker}>MODIFIER</Text>
              <Text style={styles.sheetTitle}>TON SCORE</Text>
              <Text style={styles.sheetHint}>
                Combien en as-tu fait de chaque ? Corrige de 4 au plus pour chacun.
              </Text>
              <View style={styles.wheelRow}>
                {['a', 'b'].map((side) => {
                  const shouted = finalCounts[side];
                  return (
                    <View key={side} style={styles.wheelCol}>
                      <Text style={styles.wheelTitle} numberOfLines={1}>
                        {sideLabel(live[side])}
                      </Text>
                      <Text style={styles.wheelSub} numberOfLines={1}>
                        {live[side].exo ? `« ${live[side].word} »` : ' '}
                      </Text>
                      {shouted > 0 ? (
                        <WheelPicker
                          key={`${side}${shouted}`}
                          values={confirmValues(shouted)}
                          selectedValue={shouted}
                          type="reps"
                          accentColor={ACCENT}
                          onChange={(v) => {
                            selectedRef.current = { ...selectedRef.current, [side]: v };
                          }}
                          visibleItems={5}
                        />
                      ) : (
                        // Mot jamais crié : rien à corriger.
                        <Text style={styles.wheelZero}>0</Text>
                      )}
                    </View>
                  );
                })}
              </View>
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
  history: { marginTop: 10, gap: 8 },
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
  wheelRow: { flexDirection: 'row', gap: 12 },
  wheelCol: { flex: 1 },
  wheelTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  wheelSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 4,
  },
  wheelZero: {
    fontFamily: fonts.display,
    fontSize: 56,
    lineHeight: 68,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingVertical: 76,
  },
  doneSplit: { flexDirection: 'row', gap: 12, alignSelf: 'stretch', marginTop: 18 },
  doneSplitItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,95,162,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,95,162,0.28)',
  },
  doneSplitCount: { fontFamily: fonts.monoBold, fontSize: 24, color: '#FFFFFF' },
  doneSplitLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
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
