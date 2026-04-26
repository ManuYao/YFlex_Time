import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSettings } from '../contexts/SettingsContext';

const TAG = 'flextimer-session';

export function useWakeLock(active = true) {
  const { settings } = useSettings();
  const enabled = active && settings.keepScreenOn;

  useEffect(() => {
    if (!enabled) return undefined;
    activateKeepAwakeAsync(TAG).catch(() => {});
    return () => {
      try {
        deactivateKeepAwake(TAG);
      } catch {}
    };
  }, [enabled]);
}