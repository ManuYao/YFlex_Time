import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer } from 'expo-audio';
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

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    try {
      tickRef.current = createAudioPlayer(TICK_SRC);
      phaseRef.current = createAudioPlayer(PHASE_SRC);
      completeRef.current = createAudioPlayer(COMPLETE_SRC);
      [tickRef, phaseRef, completeRef].forEach((r) => {
        if (r.current) r.current.volume = volumeRef.current;
      });
    } catch {}
    return () => {
      [tickRef, phaseRef, completeRef].forEach((r) => {
        try { r.current?.remove(); } catch {}
        r.current = null;
      });
    };
  }, []);

  useEffect(() => {
    [tickRef.current, phaseRef.current, completeRef.current].forEach((p) => {
      try { if (p) p.volume = volume; } catch {}
    });
  }, [volume]);

  const play = (ref) => {
    if (!enabledRef.current || !ref.current) return;
    try {
      ref.current.seekTo(0);
      ref.current.play();
    } catch {}
  };

  return {
    playTick: useCallback(() => play(tickRef), []),
    playPhase: useCallback(() => play(phaseRef), []),
    playComplete: useCallback(() => play(completeRef), []),
  };
}
