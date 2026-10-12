import { useSyncExternalStore } from 'react';

// TEMP — à retirer avant publication (avec la section « Ambiance (test) » de
// app/settings.js et les lignes `override` de hooks/useAmbiance.js).
//
// Force une ambiance précise pour pouvoir juger chaque saison et chaque fête sans
// attendre la bonne date. En mémoire seulement : jamais enregistré, tout redevient
// normal au prochain lancement de l'app.

// null = la date réelle ; sinon un id de lib/ambiance.js.
export const TEST_AMBIANCE_CYCLE = [
  null,
  'spring',
  'summer',
  'autumn',
  'winter',
  'yearend',
  'halloween',
  'valentine',
];

let override = null;
const listeners = new Set();

export function getAmbianceOverride() {
  return override;
}

export function setAmbianceOverride(id) {
  const next = TEST_AMBIANCE_CYCLE.includes(id) ? id : null;
  if (next === override) return;
  override = next;
  listeners.forEach((fn) => fn());
}

// Passe à l'ambiance suivante de la liste (puis revient à la date réelle).
export function cycleAmbianceOverride() {
  const i = TEST_AMBIANCE_CYCLE.indexOf(override);
  setAmbianceOverride(TEST_AMBIANCE_CYCLE[(i + 1) % TEST_AMBIANCE_CYCLE.length]);
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function useAmbianceOverride() {
  return useSyncExternalStore(subscribe, getAmbianceOverride, getAmbianceOverride);
}
