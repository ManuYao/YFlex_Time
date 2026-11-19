// Géométrie des médailles de trophée (components/common/BadgeMedal.js et TrophyMedal.js).
// PUR : aucun import React Native, testable en Node.
//
// Une médaille = l'anneau de l'app (TickRing) : 60 graduations, une sur cinq plus longue.
// La page Trophées en montre 68 d'un coup : au lieu de 60 éléments <Line> par médaille,
// les graduations d'un même style sont regroupées dans UN seul tracé (« M…L…M…L… »), soit
// 4 à 8 tracés par médaille. Le dessin est identique, le coût de l'écran est bien moindre.

export const TICKS = 60;

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * Les graduations d'une médaille, regroupées par style.
 * @param {object} p
 * @param {number} p.c       centre (x = y) de la boîte
 * @param {number} p.outer   rayon extérieur des graduations
 * @param {number} p.ring    diamètre de l'anneau (sert à la longueur des graduations)
 * @param {number} p.active  nombre de graduations allumées (les `active` premières, depuis midi)
 * @param {number} [p.slots] nombre de couleurs de l'anneau : les graduations allumées se
 *                           partagent entre elles selon leur POSITION sur l'anneau
 * @returns {{ off: {minor: string, major: string}, lit: Array<{minor: string, major: string}> }}
 */
export const buildTickPaths = ({ c, outer, ring, active, slots = 1, bands = null }) => {
  const off = { minor: '', major: '' };
  // `bands` : [n0, n1, …] = les n0 premières graduations dans la couleur 0, les n1 suivantes
  // dans la couleur 1… (le grand anneau de la page Trophées). Sinon `slots` couleurs réparties
  // selon la position sur l'anneau.
  const count = bands ? Math.max(1, bands.length) : Math.max(1, slots);
  const lit = Array.from({ length: count }, () => ({ minor: '', major: '' }));
  const bandOf = (i) => {
    let from = 0;
    for (let b = 0; b < bands.length; b += 1) {
      from += bands[b];
      if (i < from) return b;
    }
    return bands.length - 1;
  };
  const litCount = bands ? bands.reduce((n, v) => n + v, 0) : active;
  for (let i = 0; i < TICKS; i += 1) {
    const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    const inner = outer - ring * (major ? 0.108 : 0.075);
    const seg =
      `M${r2(c + Math.cos(a) * inner)} ${r2(c + Math.sin(a) * inner)}` +
      `L${r2(c + Math.cos(a) * outer)} ${r2(c + Math.sin(a) * outer)}`;
    let bucket = off;
    if (i < litCount) bucket = lit[bands ? bandOf(i) : Math.min(count - 1, Math.floor((i * count) / TICKS))];
    if (major) bucket.major += seg;
    else bucket.minor += seg;
  }
  return { off, lit };
};

/**
 * Répartit les graduations allumées du grand anneau entre des parts (bronze, argent, or,
 * exploits…) : [n0, n1, …] dont la somme vaut round(60 × gagnés / total). Méthode du plus
 * fort reste : chaque part garde sa proportion, aucune graduation n'est perdue.
 */
export const ringSegments = (parts, total) => {
  const sum = parts.reduce((n, v) => n + v, 0);
  const lit = total > 0 ? Math.round((TICKS * sum) / total) : 0;
  if (!sum || !lit) return parts.map(() => 0);
  const raw = parts.map((n) => (n * lit) / sum);
  const base = raw.map((x) => Math.floor(x));
  let rest = lit - base.reduce((n, v) => n + v, 0);
  raw
    .map((x, i) => [x - base[i], i])
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => {
      if (rest > 0) {
        base[i] += 1;
        rest -= 1;
      }
    });
  return base;
};

// Un tracé vide ne se dessine pas : react-native-svg veut quand même un « d » valide.
export const orEmpty = (d) => d || 'M0 0';

// Assombrit une couleur « #RRGGBB » de la part `k` (0 à 1) : le bas du dégradé du cœur.
export const shadeHex = (hex, k) => {
  const n = parseInt(String(hex).slice(1, 7), 16);
  if (!Number.isFinite(n)) return '#000000';
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k)));
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};
