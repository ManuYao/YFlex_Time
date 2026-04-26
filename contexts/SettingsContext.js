import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setHapticEnabled } from '../hooks/useHaptic';

const STORAGE_KEY = 'flexTimer_settings';

const DEFAULTS = {
  sound: true,
  vibrate: true,
  volume: 75,
  autoStart: false,
  keepScreenOn: true,
  notifications: true,
  weeklyReport: false,
  language: 'fr',
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch {}
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    setHapticEnabled(settings.vibrate);
  }, [settings.vibrate]);

  const persist = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const update = useCallback(
    (key, value) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
    persist(DEFAULTS);
  }, [persist]);

  const value = useMemo(() => ({ settings, update, reset, hydrated }), [settings, update, reset, hydrated]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}