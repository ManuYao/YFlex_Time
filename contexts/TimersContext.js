import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TIMERS } from '../lib/timers-config';
import {
  loadMixes,
  upsertMix as persistUpsertMix,
  removeMix as persistRemoveMix,
  loadActiveMixId,
  setActiveMixId as persistActiveMixId,
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

const applyMixToTimer = (timer, activeMix) => {
  if (timer.id !== 'mix') return timer;
  const blocks = activeMix?.blocks || [];
  const total = getMixTotalDuration(blocks);
  const nameValue = activeMix?.name?.toUpperCase() || '—';
  const stats = timer.stats.map((s) => {
    if (s.key === 'name') return { ...s, value: nameValue };
    if (s.key === 'blocks') return { ...s, value: String(blocks.length) };
    if (s.key === 'duration') return { ...s, value: formatComputedTotal(total) };
    return s;
  });
  return { ...timer, stats, _mix: activeMix || null };
};

const applyOverrides = (timers, overrides, activeMix) =>
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
    return applyMixToTimer(withOverrides, activeMix);
  });

export function TimersProvider({ children }) {
  const [overrides, setOverrides] = useState({});
  const [mixes, setMixes] = useState([]);
  const [activeMixId, setActiveMixIdState] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setOverrides(JSON.parse(raw));
      } catch {}
      try {
        const list = await loadMixes();
        setMixes(list);
        const stored = await loadActiveMixId();
        const fallback = list[0]?.id || null;
        setActiveMixIdState(stored && list.some((m) => m.id === stored) ? stored : fallback);
        if (!stored && fallback) await persistActiveMixId(fallback);
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

  const saveMix = useCallback(async (mix) => {
    const next = await persistUpsertMix(mix);
    setMixes(next);
    setActiveMixIdState(mix.id);
    await persistActiveMixId(mix.id);
  }, []);

  const deleteMix = useCallback(
    async (id) => {
      const next = await persistRemoveMix(id);
      setMixes(next);
      if (activeMixId === id) {
        const fallback = next[0]?.id || null;
        setActiveMixIdState(fallback);
        await persistActiveMixId(fallback);
      }
    },
    [activeMixId]
  );

  const setActiveMix = useCallback(async (id) => {
    setActiveMixIdState(id);
    await persistActiveMixId(id);
  }, []);

  const activeMix = useMemo(
    () => mixes.find((m) => m.id === activeMixId) || null,
    [mixes, activeMixId]
  );

  const timers = useMemo(
    () => applyOverrides(TIMERS, overrides, activeMix),
    [overrides, activeMix]
  );

  const value = useMemo(
    () => ({
      timers,
      updateStat,
      resetTimer,
      hydrated,
      mixes,
      activeMix,
      activeMixId,
      saveMix,
      deleteMix,
      setActiveMix,
    }),
    [timers, updateStat, resetTimer, hydrated, mixes, activeMix, activeMixId, saveMix, deleteMix, setActiveMix]
  );

  return <TimersContext.Provider value={value}>{children}</TimersContext.Provider>;
}

export function useTimers() {
  const ctx = useContext(TimersContext);
  if (!ctx) throw new Error('useTimers must be used within TimersProvider');
  return ctx;
}
