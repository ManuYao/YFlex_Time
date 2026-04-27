import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TIMERS } from '../lib/timers-config';
import {
  addToLibrary as persistAddToLibrary,
  removeFromLibrary as persistRemoveFromLibrary,
  saveCurrentMix as persistCurrentMix,
  hydrateMixState,
} from '../lib/mixes';
import { getMixTotalDuration } from '../lib/mix-blocks';

const STORAGE_KEY = 'flexTimer_timerOverrides';

const TimersContext = createContext(null);

const formatComputedTotal = (totalSec) => {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (s === 0) return `${String(m).padStart(2, '0')}:00`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const applyMixToTimer = (timer, currentMix) => {
  if (timer.id !== 'mix') return timer;
  const blocks = currentMix?.blocks || [];
  const total = getMixTotalDuration(blocks);
  const nameValue = currentMix?.name?.toUpperCase() || '—';
  const stats = timer.stats.map((s) => {
    if (s.key === 'name') return { ...s, value: nameValue };
    if (s.key === 'blocks') return { ...s, value: String(blocks.length) };
    if (s.key === 'duration') return { ...s, value: formatComputedTotal(total) };
    return s;
  });
  const phases = blocks.length === 0
    ? ['EMPTY']
    : blocks
        .slice(0, 5)
        .map((b) => (b.label || b.type || '—').toUpperCase().slice(0, 8))
        .concat(blocks.length > 5 ? ['…'] : []);
  return { ...timer, stats, phases, _mix: currentMix || null };
};

const applyOverrides = (timers, overrides, currentMix) =>
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

    const withOverrides = { ...t, stats: nextStats };
    return applyMixToTimer(withOverrides, currentMix);
  });

export function TimersProvider({ children }) {
  const [overrides, setOverrides] = useState({});
  const [library, setLibrary] = useState([]);
  const [currentMix, setCurrentMixState] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setOverrides(JSON.parse(raw));
      } catch {}
      try {
        const { currentMix: cur, library: lib } = await hydrateMixState();
        setLibrary(lib);
        setCurrentMixState(cur);
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

  const saveCurrentMix = useCallback(async (mix) => {
    setCurrentMixState(mix);
    await persistCurrentMix(mix);
  }, []);

  const saveAsLibraryEntry = useCallback(async (mix) => {
    const next = await persistAddToLibrary(mix);
    setLibrary(next);
  }, []);

  const removeFromLibrary = useCallback(async (id) => {
    const next = await persistRemoveFromLibrary(id);
    setLibrary(next);
  }, []);

  const loadFromLibrary = useCallback(async (id) => {
    const target = library.find((m) => m.id === id);
    if (!target) return null;
    setCurrentMixState(target);
    await persistCurrentMix(target);
    return target;
  }, [library]);

  const timers = useMemo(
    () => applyOverrides(TIMERS, overrides, currentMix),
    [overrides, currentMix]
  );

  const value = useMemo(
    () => ({
      timers,
      updateStat,
      resetTimer,
      hydrated,
      library,
      currentMix,
      saveCurrentMix,
      saveAsLibraryEntry,
      removeFromLibrary,
      loadFromLibrary,
    }),
    [timers, updateStat, resetTimer, hydrated, library, currentMix, saveCurrentMix, saveAsLibraryEntry, removeFromLibrary, loadFromLibrary]
  );

  return <TimersContext.Provider value={value}>{children}</TimersContext.Provider>;
}

export function useTimers() {
  const ctx = useContext(TimersContext);
  if (!ctx) throw new Error('useTimers must be used within TimersProvider');
  return ctx;
}