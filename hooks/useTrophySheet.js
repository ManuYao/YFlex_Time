import React, { useCallback, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import BadgeUnlockSheet from '../components/common/BadgeUnlockSheet';
import { pendingBadges, markBadgeSeen } from '../lib/badgeCelebration';

/**
 * Grande annonce de trophée sur un écran qui n'a pas la sienne (les jeux, à la fin d'une partie).
 *
 *   const { announce, trophySheet } = useTrophySheet('game');
 *   ... announce();            // quand le moment calme arrive (la partie est finie)
 *   ... {trophySheet}          // une fois, tout en bas du rendu de l'écran
 *
 * `announce` cherche ce qui vient d'être gagné à ce moment : les trophées au format « grande
 * annonce » s'affichent ici, une feuille à la fois (marqués vus à la fermeture) ; les autres partent
 * en notification, qui attend la fermeture de la feuille (lib/trophyNotices.js). Ne lève jamais.
 * Si on quitte l'écran avant de la voir, rien n'est perdu : elle ressort au prochain moment calme.
 */
export default function useTrophySheet(scope) {
  const { height } = useWindowDimensions();
  const [queue, setQueue] = useState([]);
  const queueRef = useRef([]);
  const totalRef = useRef(0);

  const announce = useCallback(async () => {
    try {
      const fresh = await pendingBadges(scope);
      if (!fresh.length) return;
      totalRef.current = fresh.length;
      queueRef.current = fresh;
      setQueue(fresh);
    } catch {}
  }, [scope]);

  const close = useCallback(async () => {
    const current = queueRef.current[0];
    if (current) await markBadgeSeen(current.timerId, current.tier);
    queueRef.current = queueRef.current.slice(1);
    setQueue(queueRef.current);
  }, []);

  const trophySheet =
    queue.length > 0 ? (
      <BadgeUnlockSheet
        key={`${queue[0].timerId}:${queue[0].tier}`}
        screenH={height}
        trophyId={queue[0].timerId}
        tier={queue[0].tier}
        position={totalRef.current - queue.length + 1}
        total={totalRef.current}
        onClose={close}
      />
    ) : null;

  return { announce, trophySheet };
}
