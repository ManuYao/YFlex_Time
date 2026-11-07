import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import LaunchRing, { FineCrown, RadialGlow } from './LaunchRing';
import SpaceBackdrop from './SpaceBackdrop';
import useAmbiance from '../../hooks/useAmbiance';
import useArmed from '../../hooks/useArmed';
import { useSettings } from '../../contexts/SettingsContext';
import { fonts } from '../../lib/fonts';
import { playSound, playSoundSequence, preloadSound, isSoundEnabled } from '../../lib/sounds';
import { consumeLongSplash } from '../../lib/splash';
import { appReadyAt, onAppReady } from '../../lib/appReady';
import { introReveal } from '../../lib/introReveal';
import {
  EXIT_C_START,
  EXIT_MS,
  SPLASH_LONG_MIN_MS,
  exitA,
  exitC,
  splashExitAt,
  splashLookFor,
} from '../../lib/launchVisuals';

/**
 * Intro de démarrage, bloquante (voir lib/splash.js pour savoir quand elle se joue).
 *
 * UN ZOOM DANS L'ESPACE vers l'emblème. On part de loin, dans un décor d'espace (fond sombre teinté
 * de la couleur de la saison, étoiles fines à trois profondeurs, quelques motifs de la saison qui
 * passent — components/common/SpaceBackdrop.js) ; l'emblème, petit, grossit doucement vers nous
 * pendant que son anneau de 60 graduations s'allume, aux quatre couleurs des modes, et que le « F »
 * d'Anton se révèle. Le temps du zoom EST le temps de chargement de l'application derrière.
 *
 * LE CERCLE TOURNE AUTOUR DU « F », UNE OU DEUX FOIS selon le temps de chargement :
 *   - un tour accompagne toujours le zoom ;
 *   - si, quand ce premier tour s'achève, la page derrière n'est pas encore prête, un second tour
 *     s'enchaîne (et la sortie attend la fin de ce tour : jamais coupé en plein mouvement) ;
 *   - en version longue (deux sons), les deux tours se font toujours.
 * L'anneau retombe à chaque fois pile dans son orientation de départ (ses quatre couleurs sont
 * alignées), le « F » ne bouge pas.
 *
 * Puis l'emblème TIENT, et la sortie se joue comme un plan de cinéma, en trois temps :
 *   A. tous les éléments disparaissent (emblème, étoiles, motifs, textes) ;
 *   B. le vide : il ne reste que le fond sombre, un court instant ;
 *   C. le vrai écran apparaît, avec un petit zoom (0,92 → 1, comme si on avançait vers lui).
 * Léger, automatique, jamais brutal. Le zoom de l'écran passe par `lib/introReveal.js` (lu par
 * l'accueil) ; il est toujours remis à 1 à la fin.
 *
 * DEUX durées, calées sur le son :
 *   - courte : un seul son (`intro`) ;
 *   - longue (après une mise à jour, quand les sons sont actifs) : `intro` puis `introNew`, deux
 *     tours, « NOUVELLE VERSION » ; elle se referme QUE quand le dernier son est fini.
 * Dans les deux cas elle attend que l'écran derrière (accueil) soit prêt (lib/appReady.js, 6 s de
 * patience au plus). Pendant l'attente rien n'est figé : une dérive très lente continue.
 *
 * PRÉCHARGEMENT : tout l'arbre est monté et dessiné dans son état de départ AVANT que l'horloge
 * et le son ne démarrent (hooks/useArmed.js).
 *
 * Légèreté : `transform` et `opacity` sur le fil d'interface ; les 60 graduations n'animent chacune
 * que leur opacité. « Réduire les animations » : tout est posé d'emblée (décor, emblème, anneau),
 * seul le fondu de sortie reste.
 */

const INITIAL = Dimensions.get('window');

const E_OUT = Easing.out(Easing.cubic);
const E_SOFT = Easing.inOut(Easing.sin);
const E_INOUT = Easing.inOut(Easing.cubic);
// Le zoom démarre sans à-coup puis ralentit longuement jusqu'à se poser.
const E_ZOOM = Easing.bezier(0.22, 0.06, 0.18, 1);
// Un tour de l'anneau : sinus doux au départ comme à l'arrivée, sans pointe de vitesse (~260°/s au
// plus, contre ~340°/s avec une courbe plus vive).
const E_TURN = Easing.inOut(Easing.sin);

// Calendrier (ms depuis l'armement). Courte : le zoom dure ZOOM_MS ; longue : ZOOM_LONG_MS. Les
// instants ci-dessous sont donnés pour la version courte et mis à l'échelle (`zf`) pour la longue.
const ZOOM_MS = 2300;
const ZOOM_LONG_MS = 3600;
const TURN1_AT = 250; // premier tour de l'anneau
const TURN1_MS = 2300;
const TURN_GAP = 200; // pause entre deux tours
const TURN2_MS = 2000; // second tour (si le chargement dure, ou version longue)
const HOLD_AFTER_TURN = 300; // l'emblème tient avant la sortie

// Le « F » d'Anton de l'icône (canevas de 512), voir design/build-icons.js.
const F_PATH =
  'M222.4 340.0L222.4 172.0L289.6 172.0L289.6 204.7L256.2 204.7L256.2 231.5L287.9 231.5L287.9 263.8L256.2 263.8L256.2 340.0Z';

// Sons à décoder pendant l'intro, pour que la première séance démarre sans latence.
const WARM_SOUNDS = ['countdown1', 'countdown2', 'countdown3', 'go', 'next1', 'next2', 'next3'];

export default function LaunchSplash({ onDone }) {
  // Les réglages (ambiance « Aucune », sons coupés) doivent être lus AVANT de rien montrer : sinon
  // un utilisateur sans ambiance verrait une fois la saison, et l'intro jouerait un son qu'il a
  // coupé. On attend donc les réglages (au plus 700 ms) puis UN rendu de plus : les effets des
  // fournisseurs (réglage des sons) ont alors tous tourné.
  const { hydrated } = useSettings();
  const [go, setGo] = useState(false);
  useEffect(() => {
    if (hydrated) {
      setGo(true);
      return undefined;
    }
    const id = setTimeout(() => setGo(true), 700);
    return () => clearTimeout(id);
  }, [hydrated]);

  if (!go) return <View style={styles.waiting} pointerEvents="none" />;
  return <SplashShow onDone={onDone} />;
}

function SplashShow({ onDone }) {
  const reduced = useReducedMotion();
  const { ambiance } = useAmbiance();
  const look = useMemo(() => splashLookFor(ambiance?.id), [ambiance?.id]);
  const armed = useArmed();

  // Version LONGUE : mise à jour installée ('update') ou nouvelle saison / nouveau moment
  // ('season'). Elle écrit le nom de la saison tout en bas ; « NOUVELLE VERSION » seulement pour
  // une mise à jour. La courte, celle de tous les jours, n'écrit rien de plus.
  const [longReason] = useState(() => consumeLongSplash());
  const isLong = !!longReason;
  const zoomMs = isLong ? ZOOM_LONG_MS : ZOOM_MS;
  const zf = zoomMs / ZOOM_MS;

  const [size, setSize] = useState({ width: INITIAL.width, height: INITIAL.height });
  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };
  // L'emblème couvre ~83 % de la largeur (proportions relevées sur le reel de l'app).
  const S = Math.max(200, Math.round(Math.min(300, size.width - 60, size.height * 0.42)));

  /* ───── valeurs animées ───── */

  const zoom = useSharedValue(reduced ? 1 : 0);
  const drift = useSharedValue(0);
  const finale = useSharedValue(0);
  const embOp = useSharedValue(reduced ? 1 : 0);
  const ringRot = useSharedValue(0);
  const crownOp = useSharedValue(reduced ? 1 : 0);
  const fOp = useSharedValue(reduced ? 1 : 0);
  const fScale = useSharedValue(reduced ? 1 : 0.94);
  const mark = useSharedValue(reduced ? 1 : 0);
  const label = useSharedValue(reduced ? 1 : 0);
  const seasonName = useSharedValue(reduced ? 1 : 0);
  const breath = useSharedValue(0);

  /* ───── le calendrier de l'intro ───── */

  const startedAtRef = useRef(Date.now());
  const audioDoneRef = useRef(null);
  const minExitRef = useRef(0); // jamais de sortie avant la fin d'un tour commencé
  const exitTimerRef = useRef(null);
  const turn2TimerRef = useRef(null);
  const exitingRef = useRef(false);
  const doneRef = useRef(false);

  const done = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    introReveal.value = 1; // un écran ne reste jamais invisible
    onDone();
  }, [onDone]);

  const startExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    clearTimeout(exitTimerRef.current);
    clearTimeout(turn2TimerRef.current);
    // Le vrai écran est caché derrière l'intro : on le prépare (loin, invisible) puis on le révèle
    // en zoomant, au temps C, quand le vide s'ouvre.
    introReveal.value = 0;
    introReveal.value = withDelay(
      Math.round(EXIT_C_START * EXIT_MS),
      withTiming(1, { duration: Math.round((1 - EXIT_C_START) * EXIT_MS), easing: E_INOUT })
    );
    finale.value = withTiming(1, { duration: EXIT_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(done)();
    });
    // Secours : l'intro ne doit jamais rester collée à l'écran.
    setTimeout(done, EXIT_MS + 900);
  }, [done]);

  // Recalculé à chaque nouvelle information (début, son terminé, accueil prêt, second tour) : une
  // seule minuterie, toujours calée sur la dernière heure de fermeture connue.
  const reschedule = useCallback(() => {
    if (exitingRef.current) return;
    const readyAbs = appReadyAt();
    const at = Math.max(
      splashExitAt({
        long: isLong,
        audioDoneAt: audioDoneRef.current,
        readyAt: readyAbs == null ? null : readyAbs - startedAtRef.current,
      }),
      minExitRef.current
    );
    clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(
      startExit,
      Math.max(0, startedAtRef.current + at - Date.now())
    );
  }, [isLong, startExit]);

  // Rien ne démarre avant que tout soit monté et dessiné (`armed`) : ni l'image, ni le son.
  useEffect(() => {
    if (!armed) return undefined;
    startedAtRef.current = Date.now();

    // Le son part en même temps que l'image.
    if (isLong && isSoundEnabled()) {
      playSoundSequence(['intro', 'introNew'], () => {
        audioDoneRef.current = Date.now() - startedAtRef.current;
        reschedule();
      });
    } else if (isLong) {
      // Sons coupés : rien à attendre, la durée minimale de la version longue fait foi.
      audioDoneRef.current = SPLASH_LONG_MIN_MS;
    } else {
      playSound('intro');
    }

    if (!reduced) {
      const T = (ms) => Math.round(ms * zf);
      zoom.value = withTiming(1, { duration: zoomMs, easing: E_ZOOM });
      // Dérive très lente, qui continue pendant l'attente : l'écran n'est jamais figé.
      drift.value = withTiming(1, { duration: 16000, easing: Easing.linear });
      embOp.value = withDelay(T(150), withTiming(1, { duration: 700, easing: E_SOFT }));
      crownOp.value = withDelay(T(800), withTiming(1, { duration: 800, easing: E_OUT }));
      fOp.value = withDelay(T(1050), withTiming(1, { duration: 800, easing: E_OUT }));
      fScale.value = withDelay(T(1050), withTiming(1, { duration: 1000, easing: E_OUT }));
      mark.value = withDelay(T(1600), withTiming(1, { duration: 600, easing: E_OUT }));

      // Premier tour de l'anneau autour du F, avec le zoom.
      ringRot.value = withDelay(TURN1_AT, withTiming(360, { duration: TURN1_MS, easing: E_TURN }));
      const turn1End = TURN1_AT + TURN1_MS;
      minExitRef.current = turn1End + HOLD_AFTER_TURN;

      // Second tour : si la page derrière n'est pas prête quand le premier s'achève — ou toujours en
      // version longue. La sortie attend sa fin (+ la tenue de l'emblème).
      const turn2At = turn1End + TURN_GAP;
      if (isLong) minExitRef.current = turn2At + TURN2_MS + HOLD_AFTER_TURN;
      turn2TimerRef.current = setTimeout(() => {
        if (exitingRef.current) return;
        if (isLong || appReadyAt() == null) {
          ringRot.value = withTiming(720, { duration: TURN2_MS, easing: E_TURN });
          minExitRef.current = Math.max(
            minExitRef.current,
            Date.now() - startedAtRef.current + TURN2_MS + HOLD_AFTER_TURN
          );
          reschedule();
        }
      }, turn2At);

      if (isLong) {
        label.value = withDelay(zoomMs, withTiming(1, { duration: 600, easing: E_OUT }));
        seasonName.value = withDelay(T(1900), withTiming(1, { duration: 700, easing: E_OUT }));
        breath.value = withDelay(
          zoomMs,
          withRepeat(withTiming(1, { duration: 2400, easing: E_SOFT }), -1, true)
        );
      }
    } else if (isLong) {
      label.value = 1;
    }

    reschedule();
    const unsubscribe = onAppReady(reschedule);

    // On profite de l'intro pour décoder les sons de la première séance.
    const warm = setTimeout(() => WARM_SOUNDS.forEach(preloadSound), 700);

    return () => {
      clearTimeout(exitTimerRef.current);
      clearTimeout(turn2TimerRef.current);
      clearTimeout(warm);
      unsubscribe();
      introReveal.value = 1;
    };
  }, [armed]);

  /* ───── styles ───── */

  // L'intro entière ne s'efface qu'au temps C : c'est alors que le vide s'ouvre sur le vrai écran.
  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - exitC(finale.value) }));
  // L'emblème grossit doucement vers nous ; au temps A il s'efface en grossissant à peine.
  const embStyle = useAnimatedStyle(() => {
    const a = exitA(finale.value);
    const scale = reduced
      ? 1
      : (0.3 + 0.7 * zoom.value) *
        (1 + 0.04 * drift.value) *
        (1 + 0.15 * a) *
        (1 + 0.012 * breath.value);
    return { opacity: embOp.value * (1 - a), transform: [{ scale }] };
  });
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${ringRot.value}deg` }] }));
  const crownStyle = useAnimatedStyle(() => ({ opacity: crownOp.value }));
  const fStyle = useAnimatedStyle(() => ({
    opacity: fOp.value,
    transform: [{ scale: 0.86 * fScale.value }],
  }));
  // La lueur derrière le « F » reste très discrète : un « F » blanc sur un blob blanc ne se lirait pas.
  const fGlowStyle = useAnimatedStyle(() => ({ opacity: fOp.value * 0.18 }));
  const auraStyle = useAnimatedStyle(() => ({ opacity: embOp.value * 0.08 }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.value * 0.7 * (1 - exitA(finale.value)),
    transform: [{ translateY: (1 - mark.value) * -4 }],
  }));
  const seasonStyle = useAnimatedStyle(() => ({
    opacity: seasonName.value * 0.85 * (1 - exitA(finale.value)),
    transform: [{ translateY: (1 - seasonName.value) * 6 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: label.value * 0.7 * (1 - exitA(finale.value)),
    transform: [{ translateY: (1 - label.value) * 4 }],
  }));

  // « FLEX TIMER » au-dessus de la fine couronne, même quand l'emblème a fini de grossir
  // (dérive et respiration comprises) : sans cette marge il chevauchait la couronne.
  const markGap = Math.round((S / 2 + 25) * 1.06 - S / 2) + 26;
  const crownRadius = S / 2 + 16;
  const crownBox = (crownRadius + 2) * 2;
  const auraSize = S * 1.8;
  const fGlowSize = S * 0.6;

  return (
    <Animated.View style={[styles.root, rootStyle]} onLayout={handleLayout}>
      <Pressable style={StyleSheet.absoluteFill} />

      {/* L'espace : fond teinté de la saison, étoiles à trois profondeurs, motifs qui passent */}
      <SpaceBackdrop
        width={size.width}
        height={size.height}
        ambiance={ambiance}
        zoom={zoom}
        finale={finale}
        drift={drift}
        play={armed}
        reduced={reduced}
      />

      <View style={[styles.stage, { width: S, height: S }]} pointerEvents="none">
        {/* L'emblème, qui grossit vers nous */}
        <Animated.View style={[styles.abs, { left: 0, top: 0, width: S, height: S }, embStyle]}>
          {/* Lumière très douce derrière */}
          <Animated.View
            style={[
              styles.abs,
              { left: S / 2 - auraSize / 2, top: S / 2 - auraSize / 2, width: auraSize, height: auraSize },
              auraStyle,
            ]}
          >
            <RadialGlow size={auraSize} color="#FFFFFF" id="splashAura" />
          </Animated.View>

          {/* Fine couronne de 120 repères, immobile */}
          <Animated.View
            style={[
              styles.abs,
              { left: S / 2 - crownBox / 2, top: S / 2 - crownBox / 2, width: crownBox, height: crownBox },
              crownStyle,
            ]}
          >
            <FineCrown radius={crownRadius} color={look.crown[0]} opacity={look.crown[1]} />
          </Animated.View>

          {/* L'anneau de 60 graduations (proportions du reel), aux quatre couleurs : c'est lui
              qui tourne autour du F, une ou deux fois */}
          <Animated.View style={[styles.abs, { left: 0, top: 0, width: S, height: S }, ringStyle]}>
            <LaunchRing
              size={S}
              preset="soft"
              color={look.ring}
              baseOpacity={0}
              mode={reduced ? 'static' : 'fill'}
              staticOpacity={1}
              startDelay={Math.round(350 * zf)}
              sweepMs={Math.round(1100 * zf)}
              riseMs={450}
              play={armed}
            />
          </Animated.View>

          {/* Lueur discrète derrière le « F », puis le « F » (il ne tourne pas) */}
          <Animated.View
            style={[
              styles.abs,
              { left: S / 2 - fGlowSize / 2, top: S / 2 - fGlowSize / 2, width: fGlowSize, height: fGlowSize },
              fGlowStyle,
            ]}
          >
            <RadialGlow size={fGlowSize} color="#FFFFFF" id="splashFGlow" />
          </Animated.View>
          <Animated.View style={[styles.abs, { left: 0, top: 0, width: S, height: S }, fStyle]}>
            <Svg width={S} height={S} viewBox="0 0 512 512">
              <Path d={F_PATH} fill="#FFFFFF" />
            </Svg>
          </Animated.View>
        </Animated.View>

        {/* Le nom, discret, au-dessus de l'emblème (il ne grossit pas) */}
        <Animated.Text style={[styles.mark, { top: -markGap, left: -60, width: S + 120 }, markStyle]}>
          FLEX TIMER
        </Animated.Text>

        {/* Mise à jour : on dit pourquoi l'intro est longue */}
        {longReason === 'update' ? (
          <Animated.Text style={[styles.label, { top: S + 28, left: -60, width: S + 120 }, labelStyle]}>
            NOUVELLE VERSION
          </Animated.Text>
        ) : null}
      </View>

      {/* Version longue : le nom de la saison, tout en bas */}
      {isLong && ambiance ? (
        <Animated.Text
          pointerEvents="none"
          style={[styles.season, { top: size.height * 0.78 }, seasonStyle]}
        >
          {ambiance.label.toUpperCase()}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Écran noir pendant la lecture des réglages (même noir que le voile de _layout.js).
  waiting: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: '#000000',
  },
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Carré de S × S centré à l'écran : tout se place en coordonnées de ce carré (le centre est
  // à S / 2). Les couches plus grandes que lui (aura) débordent librement.
  stage: {
    position: 'relative',
  },
  abs: {
    position: 'absolute',
  },
  mark: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 6,
    color: '#FFFFFF',
  },
  season: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 8,
    color: '#FFFFFF',
  },
  label: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 5,
    color: '#FFFFFF',
  },
});
