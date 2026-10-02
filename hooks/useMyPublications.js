import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { fetchMyPublishedMixes } from '../lib/publicMixes';

/**
 * Mes mix actuellement en ligne dans le fil public, pour afficher « EN LIGNE »
 * à côté des mix de « Mes mix ».
 *
 * `status` : 'login' (pas de compte : on ne peut rien savoir), 'loading',
 * 'ok', 'unavailable' (Supabase pas prêt) ou 'error' (réseau). Seul 'ok' permet
 * d'affirmer qu'un mix est privé : dans tous les autres cas l'écran n'affiche
 * AUCUN badge plutôt que de dire « privé » sur une supposition.
 */
export function useMyPublications() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState({ status: userId ? 'loading' : 'login', items: [] });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setState({ status: 'login', items: [] });
      return undefined;
    }
    let cancelled = false;
    setState((s) => (s.status === 'ok' ? s : { status: 'loading', items: [] }));
    fetchMyPublishedMixes(userId).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: res.reason === 'unavailable' ? 'unavailable' : 'error', items: [] });
        return;
      }
      setState({ status: 'ok', items: res.items });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { status: state.status, items: state.items, refresh };
}
