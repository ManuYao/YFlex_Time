// Géométrie PURE de l'anneau de 60 graduations (components/common/TickRing.js) : aucun
// import React Native, donc testable avec Node.
//
// Les formules de `tickSegments` sont EXACTEMENT celles de l'ancien TickRing (même rayon,
// mêmes longueurs, même angle de départ à midi) : rien ne change à l'écran. Ce fichier ajoute
// seulement le REGROUPEMENT des graduations fixes en quelques tracés (voir tickPathGroups) :
// avant, chaque graduation était un nœud SVG à part (60 par anneau, plus de 500 sur l'accueil
// à 5 cartes).

export const TOTAL_TICKS = 60;
export const MAJOR_EVERY = 5; // une graduation sur cinq est plus longue et plus épaisse
export const MAJOR_WIDTH = 2.5;
export const MINOR_WIDTH = 1.5;

/** Les 60 segments d'un anneau de côté `size` : { x1, y1, x2, y2, isMajor, d }. */
export function tickSegments(size) {
  const center = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius - 18;
  return Array.from({ length: TOTAL_TICKS }).map((_, i) => {
    const angle = (i / TOTAL_TICKS) * Math.PI * 2 - Math.PI / 2;
    const isMajor = i % MAJOR_EVERY === 0;
    const r1 = isMajor ? innerRadius - 4 : innerRadius;
    const x1 = center + Math.cos(angle) * r1;
    const y1 = center + Math.sin(angle) * r1;
    const x2 = center + Math.cos(angle) * outerRadius;
    const y2 = center + Math.sin(angle) * outerRadius;
    return { x1, y1, x2, y2, isMajor, d: segmentPath(x1, y1, x2, y2) };
  });
}

// Millième de pixel : bien en dessous de ce que l'œil (ou un écran) peut distinguer, et des
// chaînes quatre fois plus courtes à transmettre au moteur de dessin.
const r3 = (v) => Math.round(v * 1000) / 1000;

/** « M x1 y1 L x2 y2 » : un segment (donc un trait à bouts arrondis) dans un tracé. */
export function segmentPath(x1, y1, x2, y2) {
  return `M${r3(x1)} ${r3(y1)}L${r3(x2)} ${r3(y2)}`;
}

/**
 * Regroupe les graduations FIXES en au plus 4 tracés, un par style :
 *   actives longues / actives courtes / éteintes longues / éteintes courtes.
 * `sweepMode` (mode « allumage ») : aucune graduation fixe n'est « active » (les actives sont
 * posées par-dessus, animées) — tout est éteint, comme avant.
 * Renvoie [{ key, active, width, d }] (les groupes vides sont omis).
 */
export function tickPathGroups(segments, activeTicks, sweepMode) {
  const b = { aM: [], am: [], iM: [], im: [] };
  for (let i = 0; i < segments.length; i++) {
    const active = !sweepMode && i < activeTicks;
    b[(active ? 'a' : 'i') + (segments[i].isMajor ? 'M' : 'm')].push(segments[i].d);
  }
  const out = [];
  if (b.aM.length) out.push({ key: 'aM', active: true, width: MAJOR_WIDTH, d: b.aM.join('') });
  if (b.am.length) out.push({ key: 'am', active: true, width: MINOR_WIDTH, d: b.am.join('') });
  if (b.iM.length) out.push({ key: 'iM', active: false, width: MAJOR_WIDTH, d: b.iM.join('') });
  if (b.im.length) out.push({ key: 'im', active: false, width: MINOR_WIDTH, d: b.im.join('') });
  return out;
}
