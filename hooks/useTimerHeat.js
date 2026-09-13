import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { loadHistory, computeHeatCounts, computeModeTotals } from '../lib/history';
import { TIMERS } from '../lib/timers-config';

// Recharge l'historique à chaque focus de l'écran (même pattern que
// app/history.js) : la Home est retrouvée via router.replace après chaque
// séance, donc heatMap/statsMap doivent se recalculer sans remount du
// provider. Un seul loadHistory() sert aux deux dérivés pour éviter une
// double lecture AsyncStorage par focus.
export function useTimerHeat() {
  const [heatMap, setHeatMap] = useState({});
  const [statsMap, setStatsMap] = useState({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadHistory().then((list) => {
        if (cancelled) return;
        setHeatMap(computeHeatCounts(list));
        const nextStats = {};
        for (const timer of TIMERS) {
          nextStats[timer.id] = computeModeTotals(list, timer.id);
        }
        setStatsMap(nextStats);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return { heatMap, statsMap };
}
