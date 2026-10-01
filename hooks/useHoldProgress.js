import { useCallback, useEffect, useRef } from 'react';
import { Easing, cancelAnimation, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic } from './useHaptic';

// Premier retour tactile : assez tard pour ne JAMAIS se déclencher sur un tap
// (< 200 ms), assez tôt pour que le doigt sente tout de suite que le maintien
// est pris en compte.
const FIRST_FEEDBACK_MS = 350;

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
 * `wasFired()` dit si le maintien a abouti : un enfant cliquable (étiquette)
 * s'en sert pour ignorer le tap que générerait le relâchement du doigt.
 */
export function useHoldProgress(onComplete, duration = 2000) {
  const progress = useSharedValue(0);
  const activeRef = useRef(false);
  const firedRef = useRef(false);
  const timersRef = useRef([]);
  // Toujours la dernière version du callback, sans recréer start() à chaque
  // rendu (ce qui couperait un appui en cours).
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    firedRef.current = false;
    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: Easing.linear });

    timersRef.current = [
      setTimeout(() => haptic.light(), FIRST_FEEDBACK_MS),
      setTimeout(() => haptic.light(), duration / 2),
      setTimeout(() => {
        activeRef.current = false;
        firedRef.current = true;
        timersRef.current = [];
        haptic.success();
        onCompleteRef.current?.();
        // La barre pleine reste un instant : on voit que ça a abouti.
        progress.value = withTiming(0, { duration: 400 });
      }, duration),
    ];
  }, [duration]);

  const cancel = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    cancelAnimation(progress);
    // Relâché trop tôt : la barre redescend vite, avec un petit retour.
    if (progress.value > 0.12) haptic.selection();
    progress.value = withTiming(0, { duration: 160 });
  }, []);

  const wasFired = useCallback(() => firedRef.current, []);

  useEffect(() => clearTimers, []);

  return { progress, start, cancel, wasFired };
}
