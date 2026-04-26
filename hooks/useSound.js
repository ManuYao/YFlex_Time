import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { useSettings } from '../contexts/SettingsContext';

const TICK_SRC = require('../assets/sounds/tick.mp3');
const PHASE_SRC = require('../assets/sounds/phase.mp3');
const COMPLETE_SRC = require('../assets/sounds/complete.mp3');

export function useSound() {
  const { settings } = useSettings();
  const tickPlayer = useAudioPlayer(TICK_SRC);
  const phasePlayer = useAudioPlayer(PHASE_SRC);
  const completePlayer = useAudioPlayer(COMPLETE_SRC);

  const enabledRef = useRef(settings.sound);
  enabledRef.current = settings.sound;
  const volume = (settings.volume ?? 75) / 100;

  useEffect(() => {
    [tickPlayer, phasePlayer, completePlayer].forEach((p) => {
      try {
        p.volume = volume;
      } catch {}
    });
  }, [volume, tickPlayer, phasePlayer, completePlayer]);

  const play = (player) => {
    if (!enabledRef.current || !player) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {}
  };

  return {
    playTick: useCallback(() => play(tickPlayer), [tickPlayer]),
    playPhase: useCallback(() => play(phasePlayer), [phasePlayer]),
    playComplete: useCallback(() => play(completePlayer), [completePlayer]),
  };
}