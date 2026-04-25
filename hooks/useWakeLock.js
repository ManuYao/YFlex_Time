import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const TAG = 'flextimer-session';

export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;

    let cancelled = false;
    activateKeepAwakeAsync(TAG).catch(() => {});

    return () => {
      cancelled = true;
      try {
        deactivateKeepAwake(TAG);
      } catch {}
      void cancelled;
    };
  }, [active]);
}
