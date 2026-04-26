import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { useSettings } from '../contexts/SettingsContext';

const SOURCES = {
  tick: require('../assets/sounds/tick.mp3'),
  phase: require('../assets/sounds/phase.mp3'),
  complete: require('../assets/sounds/complete.mp3'),
};

let cache = null;
let loadingPromise = null;

const ensureLoaded = async () => {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch {}

    const result = {};
    for (const key of Object.keys(SOURCES)) {
      try {
        const { sound } = await Audio.Sound.createAsync(SOURCES[key], { shouldPlay: false });
        result[key] = sound;
      } catch {
        result[key] = null;
      }
    }
    cache = result;
    return result;
  })();

  return loadingPromise;
};

export function useSound() {
  const { settings } = useSettings();
  const enabledRef = useRef(settings.sound);
  const volumeRef = useRef((settings.volume ?? 75) / 100);

  enabledRef.current = settings.sound;
  volumeRef.current = (settings.volume ?? 75) / 100;

  useEffect(() => {
    ensureLoaded();
  }, []);

  const play = useCallback(async (key) => {
    if (!enabledRef.current) return;
    const sounds = await ensureLoaded();
    const s = sounds?.[key];
    if (!s) return;
    try {
      await s.setVolumeAsync(volumeRef.current);
      await s.replayAsync();
    } catch {}
  }, []);

  return {
    playTick: useCallback(() => play('tick'), [play]),
    playPhase: useCallback(() => play('phase'), [play]),
    playComplete: useCallback(() => play('complete'), [play]),
  };
}