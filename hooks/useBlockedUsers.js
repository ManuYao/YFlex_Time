import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { blockUser, ensureBlocks, getBlocksState, subscribeBlocks, unblockUser } from '../lib/blocks';

/**
 * Les personnes que JE bloque (lib/blocks.js). La liste est partagée par tout
 * l'app : bloquer depuis un commentaire retire aussi leurs mix du fil, et la
 * liste des Paramètres est à jour sans rien recharger.
 *
 * `isBlocked(id)` est toujours faux sans compte ou tant que la liste n'est pas
 * chargée : on ne masque jamais sur une supposition.
 */
export function useBlockedUsers() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const snap = useSyncExternalStore(subscribeBlocks, getBlocksState, getBlocksState);

  useEffect(() => {
    ensureBlocks(userId);
  }, [userId]);

  // Une liste d'un autre compte (changement de compte) ne compte pas.
  const map = userId && snap.userId === userId ? snap.map : EMPTY;

  return useMemo(() => {
    const ids = new Set(Object.keys(map));
    return {
      ready: !!userId && snap.loaded && snap.userId === userId,
      ids,
      list: Object.entries(map).map(([id, name]) => ({ id, name })),
      isBlocked: (id) => !!id && ids.has(id),
      block: (blockedId, name) => blockUser(userId, blockedId, name),
      unblock: (blockedId) => unblockUser(userId, blockedId),
    };
  }, [map, userId, snap.loaded, snap.userId]);
}

const EMPTY = Object.freeze({});
