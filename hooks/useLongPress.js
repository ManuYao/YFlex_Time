import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from './useHaptic';

const TICK_MS = 50;
// Écart maximal toléré entre deux « tics » (normalement ~50 ms). Au-delà, le code
// de l'app a été GELÉ un instant (téléphone chargé) : on ne peut plus savoir si le
// doigt est resté posé — l'événement « relâché » attend dans la file. Sans cette
// garde, un gel de plus de `duration` faisait aboutir le maintien tout seul à la
// reprise (ex. les trophées qui s'ouvraient sans qu'on les maintienne).
const STALL_MS = 400;

export function useLongPress(onComplete, duration = 3000, { silent = false } = {}) {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastTickRef = useRef(0);
  const lastSecondRef = useRef(-1);
  const completedRef = useRef(false);

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = useCallback(() => {
    if (intervalRef.current) return;
    completedRef.current = false;
    lastSecondRef.current = -1;
    setIsPressing(true);
    setProgress(0);
    startTimeRef.current = Date.now();
    lastTickRef.current = startTimeRef.current;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const gap = now - lastTickRef.current;
      lastTickRef.current = now;
      if (gap > STALL_MS) {
        // Gel détecté : on annule plutôt que d'aboutir par erreur (voir STALL_MS).
        stopInterval();
        setIsPressing(false);
        setProgress(0);
        return;
      }
      const elapsed = now - startTimeRef.current;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);

      const currSecond = Math.floor(elapsed / 1000);
      if (currSecond > lastSecondRef.current && currSecond < duration / 1000) {
        lastSecondRef.current = currSecond;
        if (!silent) haptic.light();
      }

      if (p >= 1 && !completedRef.current) {
        completedRef.current = true;
        stopInterval();
        if (!silent) haptic.success();
        setTimeout(() => {
          setIsPressing(false);
          setProgress(0);
          onComplete?.();
        }, 200);
      }
    }, TICK_MS);
  }, [duration, onComplete]);

  const cancel = useCallback(() => {
    if (!intervalRef.current && !isPressing) return;
    if (!completedRef.current && progress > 0 && progress < 1) {
      haptic.selection();
    }
    stopInterval();
    setIsPressing(false);
    setProgress(0);
  }, [isPressing, progress]);

  useEffect(() => {
    return () => stopInterval();
  }, []);

  return { isPressing, progress, start, cancel };
}
