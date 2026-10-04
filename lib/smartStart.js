// Démarrage intelligent de l'accueil : à l'ouverture, on se place sur le timer le
// plus utilisé plutôt que toujours sur le premier de la liste.
//
// « Le plus utilisé » = celui qui a le plus de FLAMMES, c'est-à-dire le plus de
// lancements sur les 7 derniers jours (la même mesure que le badge de série des
// cartes, lib/history.js computeHeatCounts). Départage, dans l'ordre :
//   1. le plus de séances au total (toute l'histoire) ;
//   2. à égalité complète, celui qui vient en premier dans la liste.
// Si les 7 derniers jours sont vides mais qu'il existe un historique (quelqu'un
// qui revient après une pause), c'est le total qui décide. Aucune séance du tout :
// `null`, l'accueil reste sur son premier timer.
//
// Fichier PUR, sans React Native : testable directement avec `node`.

/**
 * @param {string[]} timerIds  ids des timers, dans l'ordre d'affichage
 * @param {Record<string, number>} heatMap  flammes (lancements sur 7 jours) par timer
 * @param {Record<string, {count?: number}>} totalsMap  totaux de toujours par timer
 * @returns {number|null} l'index à afficher, ou `null` s'il n'y a rien à privilégier
 */
export const pickSmartStartIndex = (timerIds, heatMap = {}, totalsMap = {}) => {
  let best = -1;
  let bestHeat = 0;
  let bestTotal = 0;
  for (let i = 0; i < timerIds.length; i++) {
    const id = timerIds[i];
    const heat = Number(heatMap?.[id]) || 0;
    const total = Number(totalsMap?.[id]?.count) || 0;
    if (heat === 0 && total === 0) continue;
    if (heat > bestHeat || (heat === bestHeat && total > bestTotal)) {
      best = i;
      bestHeat = heat;
      bestTotal = total;
    }
  }
  return best >= 0 ? best : null;
};

/**
 * L'index sur lequel l'accueil s'ouvre :
 *  1. le timer qu'on vient de quitter (`lastTimerId`, passé au retour d'une séance) :
 *     on retrouve exactement là où on était, jamais de saut ;
 *  2. sinon le timer le plus utilisé (pickSmartStartIndex) ;
 *  3. sinon le premier.
 */
export const resolveStartIndex = (timerIds, { lastTimerId, heatMap, totalsMap } = {}) => {
  if (lastTimerId) {
    const i = timerIds.indexOf(lastTimerId);
    if (i >= 0) return i;
  }
  return pickSmartStartIndex(timerIds, heatMap, totalsMap) ?? 0;
};
