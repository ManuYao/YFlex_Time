import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { loadHistory, computeHeatCounts, computeModeTotals } from '../lib/history';
import { TIMERS } from '../lib/timers-config';

// Recharge l'historique à chaque focus de l'écran (même pattern que
// app/history.js) : la Home est retrouvée via router.replace après chaque
// séance, donc heatMap/statsMap doivent se recalculer sans remount du
// provider. Un seul loadHistory() sert aux deux dérivés pour éviter une
// double lecture AsyncStorage par focus.
//
// `loaded` : l'historique a été lu au moins une fois. L'accueil attend ce signal
// pour choisir le timer de départ (lib/smartStart.js) : tant qu'il est faux,
// `heatMap` et `statsMap` sont vides, ce qui se lirait comme « aucune séance ».
// Relu à CHAQUE retour sur l'accueil : si les chiffres sont identiques on garde
// les MÊMES objets (sinon l'accueil entier se redessine à chaque retour d'un
// écran, alors que rien n'a changé).
const sameHeat = (a, b) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
};
const sameStats = (a, b) => {
  const ka = Object.keys(a);
  return (
    ka.length === Object.keys(b).length &&
    ka.every((k) => {
      const x = a[k];
      const y = b[k];
      return !!y && x.count === y.count && x.totalSeconds === y.totalSeconds && x.timeLabel === y.timeLabel;
    })
  );
};

export function useTimerHeat() {
  const [heatMap, setHeatMap] = useState({});
  const [statsMap, setStatsMap] = useState({});
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadHistory().then((list) => {
        if (cancelled) return;
        const nextHeat = computeHeatCounts(list);
        setHeatMap((prev) => (sameHeat(prev, nextHeat) ? prev : nextHeat));
        const nextStats = {};
        for (const timer of TIMERS) {
          nextStats[timer.id] = computeModeTotals(list, timer.id);
        }
        setStatsMap((prev) => (sameStats(prev, nextStats) ? prev : nextStats));
        setLoaded(true);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return { heatMap, statsMap, loaded };
}
