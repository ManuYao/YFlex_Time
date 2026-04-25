import { useCallback, useEffect, useRef, useState } from 'react';

const TICK_MS = 100;

export function useTimer({ autoStart = false, onTick, onComplete, durationCap } = {}) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);

  const startTimeRef = useRef(autoStart ? Date.now() : null);
  const elapsedAccumulatedRef = useRef(0);
  const intervalRef = useRef(null);
  const completedRef = useRef(false);

  const computeElapsed = useCallback(() => {
    if (isPaused || !startTimeRef.current) {
      return elapsedAccumulatedRef.current;
    }
    return elapsedAccumulatedRef.current + (Date.now() - startTimeRef.current) / 1000;
  }, [isPaused]);

  useEffect(() => {
    if (!isRunning || isPaused) return undefined;

    intervalRef.current = setInterval(() => {
      const elapsed = computeElapsed();
      const rounded = Math.floor(elapsed * 10) / 10;
      setSecondsElapsed((prev) => {
        const prevWhole = Math.floor(prev);
        const nextWhole = Math.floor(rounded);
        if (nextWhole > prevWhole) onTick?.(nextWhole);
        return rounded;
      });

      if (durationCap != null && elapsed >= durationCap && !completedRef.current) {
        completedRef.current = true;
        clearInterval(intervalRef.current);
        setIsRunning(false);
        onComplete?.();
      }
    }, TICK_MS);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, isPaused, computeElapsed, onTick, onComplete, durationCap]);

  const start = useCallback(() => {
    if (isRunning) return;
    startTimeRef.current = Date.now();
    elapsedAccumulatedRef.current = 0;
    completedRef.current = false;
    setSecondsElapsed(0);
    setIsPaused(false);
    setIsRunning(true);
  }, [isRunning]);

  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;
    elapsedAccumulatedRef.current += (Date.now() - startTimeRef.current) / 1000;
    startTimeRef.current = null;
    setIsPaused(true);
  }, [isRunning, isPaused]);

  const resume = useCallback(() => {
    if (!isPaused) return;
    startTimeRef.current = Date.now();
    setIsPaused(false);
  }, [isPaused]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    startTimeRef.current = null;
    elapsedAccumulatedRef.current = 0;
    completedRef.current = false;
    setSecondsElapsed(0);
    setIsPaused(false);
    setIsRunning(false);
  }, []);

  const seek = useCallback(
    (targetElapsed) => {
      elapsedAccumulatedRef.current = Math.max(0, targetElapsed);
      startTimeRef.current = isPaused ? null : Date.now();
      completedRef.current = false;
      setSecondsElapsed(elapsedAccumulatedRef.current);
    },
    [isPaused]
  );

  return { secondsElapsed, isRunning, isPaused, start, pause, resume, reset, seek };
}
