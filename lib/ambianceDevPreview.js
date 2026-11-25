import { useSyncExternalStore } from 'react';

// OUTIL DE TEST — visible SEULEMENT en développement (`__DEV__`, serveur local), jamais dans un
// APK ni une mise à jour OTA (le bloc de la feuille d'ambiance n'existe pas hors `__DEV__`).
// À retirer quand Noël est validé (avec le bloc « Aperçu (développement) » de
// components/common/AmbianceSheet.js et les lignes `preview` de hooks/useAmbiance.js).
//
// Force une ambiance pour juger Noël (et les autres) sans attendre la bonne date. En mémoire
// seulement : jamais enregistré, tout redevient normal au prochain lancement.

// null = la date réelle ; sinon un id de lib/ambiance.js.
export const DEV_AMBIANCE_CYCLE = [null, 'christmas', 'yearend', 'winter', 'halloween', 'valentine'];

let forced = null;
const listeners = new Set();

const getForced = () => forced;

export function cycleDevAmbiance() {
  const i = DEV_AMBIANCE_CYCLE.indexOf(forced);
  forced = DEV_AMBIANCE_CYCLE[(i + 1) % DEV_AMBIANCE_CYCLE.length];
  listeners.forEach((fn) => fn());
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function useDevAmbiance() {
  return useSyncExternalStore(subscribe, getForced, getForced);
}
