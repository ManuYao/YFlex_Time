import { useCallback, useEffect, useRef, useState } from 'react';

// Le temps de peindre les points AVANT le travail lourd (changement de vue,
// écriture du planning) : sans ce court délai, le gel du fil JS arrive avant
// que le bouton ait montré quoi que ce soit.
const PAINT_MS = 90;
// Garde levée un instant APRÈS l'action : un double appui arrive dans les
// quelques centaines de ms qui suivent le premier, quand la vue a déjà changé.
const SETTLE_MS = 280;

/**
 * Anti double-appui pour un bouton de validation (feuilles du Planning).
 *
 *   const guard = useSubmitGuard();
 *   <Button loading={guard.busyKey === 'ok'} onPress={() => guard.run('ok', action, haptic.medium)} />
 *   {guard.locked && <TouchShield />}
 *
 * `run(clé, action, onAccept)` :
 *  - refuse (renvoie false) tant qu'une validation est en cours ;
 *  - sinon passe `busyKey` à `clé` tout de suite (le bouton affiche ses
 *    points), appelle `onAccept` (la vibration) dans la foulée, lance `action`
 *    une fois les points peints, puis garde le verrou encore SETTLE_MS ;
 *  - `locked` = une validation est en cours ou vient de se terminer : sert à
 *    poser un TouchShield par-dessus la feuille, pour que le second appui d'un
 *    double-clic ne tombe pas sur ce que la nouvelle vue affiche à la même
 *    place.
 * Les minuteries sont coupées au démontage de la feuille.
 */
export function useSubmitGuard({ paintMs = PAINT_MS, settleMs = SETTLE_MS } = {}) {
  const [busyKey, setBusyKey] = useState(null);
  const lockRef = useRef(false);
  const timers = useRef(new Set());
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    []
  );

  const later = useCallback((fn, ms) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  const run = useCallback(
    (key, action, onAccept) => {
      if (lockRef.current) return false;
      lockRef.current = true;
      setBusyKey(key);
      onAccept?.();
      later(() => {
        const release = () =>
          later(() => {
            lockRef.current = false;
            if (mounted.current) setBusyKey(null);
          }, settleMs);
        let result;
        try {
          result = action();
        } catch (e) {
          release();
          throw e;
        }
        if (result && typeof result.then === 'function') {
          result.then(release, release);
        } else {
          release();
        }
      }, paintMs);
      return true;
    },
    [later, paintMs, settleMs]
  );

  return { busyKey, locked: busyKey != null, run };
}
