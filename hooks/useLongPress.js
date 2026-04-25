import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from './useHaptic';

const TICK_MS = 50;

export function useLongPress(onComplete, duration = 3000) {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
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

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);

      const currSecond = Math.floor(elapsed / 1000);
      if (currSecond > lastSecondRef.current && currSecond < duration / 1000) {
        lastSecondRef.current = currSecond;
        haptic.light();
      }

      if (p >= 1 && !completedRef.current) {
        completedRef.current = true;
        stopInterval();
        haptic.success();
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
