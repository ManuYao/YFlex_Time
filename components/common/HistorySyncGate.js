import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { syncHistory } from '../../lib/historySync';
import { onHistoryChanged } from '../../lib/history';

// Déclenche la synchronisation de l'historique : à la connexion, au retour au
// premier plan, et 2 s après chaque changement local (fin de séance,
// suppression). Ne rend rien.
const FOREGROUND_MIN_GAP_MS = 30 * 1000;
const CHANGE_DEBOUNCE_MS = 2000;

export default function HistorySyncGate() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!userId) return undefined;

    const run = () => {
      lastRunRef.current = Date.now();
      syncHistory();
    };
    run();

    let timer = null;
    const offChange = onHistoryChanged(() => {
      clearTimeout(timer);
      timer = setTimeout(run, CHANGE_DEBOUNCE_MS);
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastRunRef.current > FOREGROUND_MIN_GAP_MS) run();
    });

    return () => {
      clearTimeout(timer);
      offChange();
      sub.remove();
    };
  }, [userId]);

  return null;
}
