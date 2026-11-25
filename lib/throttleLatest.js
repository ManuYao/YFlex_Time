// Limite la fréquence d'une mise à jour qui arrive en rafale — fichier PUR (aucun import), testé en
// Node (E:\ftb\ambiance\tools\test-throttle.mjs).
//
// Cas visé : on tire sur le bord d'une fenêtre flottante / d'un écran partagé. Android envoie alors
// un événement de mise en page à CHAQUE pas, et chacun refaisait tout l'accueil (5 cartes, anneaux,
// décors) : le fil JavaScript n'arrivait plus à suivre. On ne garde que la dernière valeur reçue :
//   - le PREMIER appel passe tout de suite (la 1ʳᵉ mesure, un changement isolé : aucun retard) ;
//   - ensuite, au plus une mise à jour toutes les `ms` ;
//   - la DERNIÈRE valeur reçue est TOUJOURS appliquée (au plus `ms` après), donc l'état final est exact.
export const RESIZE_THROTTLE_MS = 100;

export function createLatestThrottle(apply, ms, clock = {}) {
  const now = clock.now || Date.now;
  const setTimer = clock.setTimeout || setTimeout;
  const clearTimer = clock.clearTimeout || clearTimeout;
  let last = -Infinity;
  let timer = null;
  let pending;
  let has = false;

  const flush = () => {
    timer = null;
    if (!has) return;
    const value = pending;
    has = false;
    pending = undefined;
    last = now();
    apply(value);
  };

  return {
    push(value) {
      pending = value;
      has = true;
      const wait = ms - (now() - last);
      if (wait <= 0) {
        if (timer != null) {
          clearTimer(timer);
          timer = null;
        }
        flush();
      } else if (timer == null) {
        timer = setTimer(flush, wait);
      }
    },
    // Démontage : plus rien ne doit s'appliquer ensuite.
    cancel() {
      if (timer != null) clearTimer(timer);
      timer = null;
      has = false;
      pending = undefined;
    },
  };
}
