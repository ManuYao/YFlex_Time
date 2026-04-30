import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { useSettings } from '../contexts/SettingsContext';

const TICK_SRC = require('../assets/sounds/tick.mp3');
const PHASE_SRC = require('../assets/sounds/phase.mp3');
const COMPLETE_SRC = require('../assets/sounds/complete.mp3');

export function useSound() {
  const { settings } = useSettings();
  const tickRef = useRef(null);
  const phaseRef = useRef(null);
  const completeRef = useRef(null);

  const enabledRef = useRef(settings.sound);
  enabledRef.current = settings.sound;
  const volume = (settings.volume ?? 75) / 100;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tick, phase, complete] = await Promise.all([
          Audio.Sound.createAsync(TICK_SRC, { volume, shouldPlay: false }),
          Audio.Sound.createAsync(PHASE_SRC, { volume, shouldPlay: false }),
          Audio.Sound.createAsync(COMPLETE_SRC, { volume, shouldPlay: false }),
        ]);
        if (cancelled) {
          tick.sound.unloadAsync();
          phase.sound.unloadAsync();
          complete.sound.unloadAsync();
          return;
        }
        tickRef.current = tick.sound;
        phaseRef.current = phase.sound;
        completeRef.current = complete.sound;
      } catch {}
    })();
    return () => {
      cancelled = true;
      tickRef.current?.unloadAsync().catch(() => {});
      phaseRef.current?.unloadAsync().catch(() => {});
      completeRef.current?.unloadAsync().catch(() => {});
      tickRef.current = null;
      phaseRef.current = null;
      completeRef.current = null;
    };
  }, []);

  useEffect(() => {
    [tickRef.current, phaseRef.current, completeRef.current].forEach((s) => {
      try { s?.setVolumeAsync(volume); } catch {}
    });
  }, [volume]);

  const play = (ref) => {
    if (!enabledRef.current || !ref.current) return;
    try {
      ref.current.replayAsync();
    } catch {}
  };

  return {
    playTick: useCallback(() => play(tickRef), []),
    playPhase: useCallback(() => play(phaseRef), []),
    playComplete: useCallback(() => play(completeRef), []),
  };
}
