import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TIMERS } from '../lib/timers-config';

const STORAGE_KEY = 'flexTimer_timerOverrides';

const TimersContext = createContext(null);

const formatComputedTotal = (totalSec) => {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (s === 0) return `${String(m).padStart(2, '0')}:00`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const applyOverrides = (timers, overrides) =>
  timers.map((t) => {
    const ovs = overrides[t.id] || {};
    let nextStats = t.stats.map((s) => (s.key in ovs ? { ...s, value: ovs[s.key] } : s));

    if (t.id === 'emom') {
      const interval = nextStats.find((s) => s.key === 'interval')?.value ?? 0;
      const rounds = nextStats.find((s) => s.key === 'rounds')?.value ?? 0;
      nextStats = nextStats.map((s) =>
        s.key === 'total' ? { ...s, value: formatComputedTotal(interval * rounds) } : s
      );
    }

    return { ...t, stats: nextStats };
  });

export function TimersProvider({ children }) {
  const [overrides, setOverrides] = useState({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setOverrides(JSON.parse(raw));
      } catch {}
      setHydrated(true);
    })();
  }, []);

  const persist = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const updateStat = useCallback(
    (timerId, statKey, value) => {
      setOverrides((prev) => {
        const next = {
          ...prev,
          [timerId]: { ...(prev[timerId] || {}), [statKey]: value },
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const resetTimer = useCallback(
    (timerId) => {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[timerId];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const timers = useMemo(() => applyOverrides(TIMERS, overrides), [overrides]);

  const value = useMemo(
    () => ({ timers, updateStat, resetTimer, hydrated }),
    [timers, updateStat, resetTimer, hydrated]
  );

  return <TimersContext.Provider value={value}>{children}</TimersContext.Provider>;
}

export function useTimers() {
  const ctx = useContext(TimersContext);
  if (!ctx) throw new Error('useTimers must be used within TimersProvider');
  return ctx;
}