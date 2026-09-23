// Incréments progressifs pour les roues de sélection en secondes
// (BASIC repos, EMOM intervalle, TABATA travail/repos). AMRAP reste en
// minutes entières (lib/timers-config.js) — un AMRAP de 47s n'a pas de sens,
// pas de logique dédiée ici.
//
// Principe : précision à la seconde tant que ça compte pour l'effort
// (< 30s), puis paliers qui s'élargissent pour défiler vite sans jamais
// tomber sur des valeurs qu'un coach n'utiliserait pas (6s, 8s, 23s...).
const getIncrement = (seconds) => {
  if (seconds < 30) return 1; // 5-29s : chaque seconde compte
  if (seconds < 120) return 5; // 30s-2min : paliers de 5s
  if (seconds < 300) return 10; // 2-5min : paliers de 10s
  if (seconds < 600) return 15; // 5-10min : paliers de 15s
  return 30; // 10min+ : paliers de 30s
};

// mustInclude : valeur déjà réglée par l'utilisateur (persistée) à garantir
// présente dans la roue même si elle ne tombe pas sur un palier de la
// grille actuelle — sinon une mise à jour de la formule ferait disparaître
// un réglage existant du sélecteur.
export const getTimeRange = (minSeconds, maxSeconds, mustInclude) => {
  const range = [];
  let current = minSeconds;
  while (current < maxSeconds) {
    range.push(current);
    current += getIncrement(current);
  }
  range.push(maxSeconds);

  if (
    typeof mustInclude === 'number' &&
    mustInclude >= minSeconds &&
    mustInclude <= maxSeconds &&
    !range.includes(mustInclude)
  ) {
    range.push(mustInclude);
    range.sort((a, b) => a - b);
  }

  return range;
};
