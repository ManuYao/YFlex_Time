import { useCallback, useEffect, useRef } from 'react';
import { Easing, cancelAnimation, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic } from './useHaptic';

// Premier retour tactile : assez tard pour ne JAMAIS se déclencher sur un tap
// (< 200 ms), assez tôt pour que le doigt sente tout de suite que le maintien
// est pris en compte.
const FIRST_FEEDBACK_MS = 350;
// Marge accordée au relâchement : le doigt qui lève quelques dizaines de ms
// avant la fin de la barre compte comme un maintien abouti (la barre était
// visiblement pleine ou presque).
const RELEASE_SLACK_MS = 60;

/**
 * Appui long « maintiens pour lancer », piloté sur le fil d'interface.
 *
 * Différence avec useLongPress (qui reste utilisé par les boutons ronds de la
 * séance) : la progression est une SharedValue Reanimated, donc la barre qui
 * se remplit ne refait pas rendre le composant à chaque 50 ms (une carte du
 * Planning, avec toutes ses étiquettes, ramait visiblement), et l'action part
 * à `duration` pile — pas de délai en plus après la fin du remplissage.
 *
 *   const hold = useHoldProgress(onLaunch, 2000);
 *   <Pressable onPressIn={hold.start} onPressOut={hold.cancel}> …
 *   <Animated.View style={useAnimatedStyle(() => ({ width: `${hold.progress.value * 100}%` }))} />
 *
 * UNE SEULE horloge : la barre et l'action partent du même `start()`. Ne jamais
 * la doubler avec le `onLongPress`/`delayLongPress` d'un Pressable (deux
 * minuteurs qui dérivent : barre pleine mais action jamais déclenchée).
 *
 * Relâchement tardif : si le doigt se lève alors que la durée est atteinte mais
 * que le minuteur JS n'a pas encore tourné (fil JS chargé), le maintien est
 * validé quand même — l'heure du doigt vient de l'événement tactile lui-même
 * (`nativeEvent.timestamp`), donc un fil JS occupé ne fausse pas le verdict.
 *
 * `wasFired()` dit si le maintien a abouti : un enfant cliquable (étiquette)
 * s'en sert pour ignorer le tap que générerait le relâchement du doigt.
 *
 * Options : `successHaptic: false` quand l'action vibre déjà elle-même.
 */
export function useHoldProgress(onComplete, duration = 2000, { successHaptic = true } = {}) {
  const progress = useSharedValue(0);
  const activeRef = useRef(false);
  const firedRef = useRef(false);
  const timersRef = useRef([]);
  const startWallRef = useRef(0);
  const startStampRef = useRef(null);
  // Toujours la dernière version du callback, sans recréer start() à chaque
  // rendu (ce qui couperait un appui en cours).
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const fire = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    firedRef.current = true;
    clearTimers();
    if (successHaptic) haptic.success();
    onCompleteRef.current?.();
    // La barre pleine reste un instant : on voit que ça a abouti.
    progress.value = withTiming(0, { duration: 400 });
  };

  const start = useCallback((event) => {
    if (activeRef.current) return;
    activeRef.current = true;
    firedRef.current = false;
    startWallRef.current = Date.now();
    startStampRef.current = event?.nativeEvent?.timestamp ?? null;
    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: Easing.linear });

    const timers = [setTimeout(() => haptic.light(), FIRST_FEEDBACK_MS)];
    // Tic intermédiaire seulement à partir de 1 s : sur un maintien plus court,
    // il tomberait presque sur le premier (deux vibrations collées = un bug).
    if (duration >= 1000) {
      timers.push(setTimeout(() => haptic.light(), duration / 2));
    }
    timers.push(setTimeout(fire, duration));
    timersRef.current = timers;
  }, [duration]);

  const cancel = useCallback((event) => {
    if (!activeRef.current) return;
    // Durée réellement tenue : horloge du système tactile si on l'a, sinon
    // l'horloge de l'app (jamais une valeur absurde).
    const endStamp = event?.nativeEvent?.timestamp;
    const startStamp = startStampRef.current;
    let held = Date.now() - startWallRef.current;
    if (typeof endStamp === 'number' && typeof startStamp === 'number') {
      const touchHeld = endStamp - startStamp;
      if (touchHeld >= 0 && touchHeld < duration * 20) held = touchHeld;
    }
    if (held >= duration - RELEASE_SLACK_MS) {
      fire();
      return;
    }
    activeRef.current = false;
    clearTimers();
    cancelAnimation(progress);
    // Relâché trop tôt : la barre redescend vite, avec un petit retour.
    if (progress.value > 0.12) haptic.selection();
    progress.value = withTiming(0, { duration: 160 });
  }, [duration]);

  const wasFired = useCallback(() => firedRef.current, []);

  useEffect(() => clearTimers, []);

  return { progress, start, cancel, wasFired };
}
