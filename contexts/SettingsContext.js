import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setHapticEnabled, setHapticStrength } from '../hooks/useHaptic';
import { configureSounds } from '../lib/sounds';
import { configureVoiceCoach } from '../lib/voiceCoach';

const STORAGE_KEY = 'flexTimer_settings';

const DEFAULTS = {
  sound: true,
  vibrate: true,
  vibrateStrength: 'medium',
  volume: 75,
  // Voix du coach (expo-speech, TTS) : OFF par défaut — les bips (`sound`)
  // sont déjà allumés, ne pas cumuler deux systèmes sonores d'entrée. Coupe
  // globalement, tous modes confondus (pas de réglage par mode/TABATA).
  voiceCoach: false,
  // 'male' | 'female' — simulé par un décalage de hauteur (pitch), voir
  // lib/voiceCoach.js. N'apparaît dans Paramètres que si voiceCoach est actif.
  voiceGender: 'female',
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

  useEffect(() => {
    setHapticStrength(settings.vibrateStrength);
  }, [settings.vibrateStrength]);

  useEffect(() => {
    configureSounds({ enabled: settings.sound, volume: (settings.volume ?? 75) / 100 });
  }, [settings.sound, settings.volume]);

  useEffect(() => {
    configureVoiceCoach({ enabled: settings.voiceCoach, gender: settings.voiceGender });
  }, [settings.voiceCoach, settings.voiceGender]);

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