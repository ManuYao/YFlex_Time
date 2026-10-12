/**
 * Lancement d'une séance et intro de démarrage — logique PURE (aucun import React Native :
 * testable au `node`). Tout ce qui est partagé entre la transition de l'accueil
 * (components/common/LaunchTransition.js), le décompte (app/countdown.js) et l'intro de
 * démarrage (components/common/LaunchSplash.js) vit ici : géométrie des graduations,
 * taille de l'anneau, palettes par ambiance, particules.
 *
 * Langage commun : l'anneau de 60 graduations (la signature de l'app) qui « s'allume ».
 */

export const TICK_COUNT = 60;

// Part de la lueur qui reste allumée derrière l'anneau une fois la transition posée. Le décompte
// démarre exactement sur cette valeur : c'est ce qui rend l'enchaînement des deux écrans invisible.
export const LAUNCH_GLOW_REST = 0.22;

// Opacité d'une graduation « éteinte » (même valeur que `ringInactive` de lib/tokens.js).
export const TICK_BASE_OPACITY = 0.22;

// Les quatre couleurs des modes, en un quart d'anneau chacune (comme l'icône).
export const MODE_RING = ['#FF5454', '#FFC933', '#1FC777', '#9575FF'];

/**
 * Taille de l'anneau du lancement et du décompte, calculée de la même façon dans les deux
 * écrans à partir de la taille de la fenêtre. Arrondie au pair : un écart d'un pixel de mesure
 * entre deux écrans ne change jamais la taille.
 */
export function launchRingSize(width, height) {
  const w = Number.isFinite(width) ? width : 360;
  const h = Number.isFinite(height) ? height : 760;
  const s = Math.min(320, w - 48, h * 0.42);
  return Math.max(150, Math.round(s / 2) * 2);
}

/**
 * Les 60 graduations d'un anneau de `size` dp de côté.
 *   'app'  : la géométrie de TickRing (l'anneau du chrono) ;
 *   'icon' : la géométrie de l'icône de l'app (canevas de 512, graduations plus épaisses).
 * Départ à midi, sens des aiguilles d'une montre. `group` = quart d'anneau (0 à 3).
 */
export function tickGeometry(size, preset = 'app') {
  const c = size / 2;
  const k = size / 512;
  return Array.from({ length: TICK_COUNT }, (_, i) => {
    const angle = (i / TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    let rOut;
    let rIn;
    let width;
    if (preset === 'icon') {
      rOut = 204 * k;
      rIn = rOut - (major ? 42 : 27) * k;
      width = Math.max(1.4, (major ? 12.4 : 7.4) * k);
    } else {
      rOut = size / 2 - 4;
      rIn = rOut - (major ? 22 : 18);
      width = major ? 2.5 : 1.5;
    }
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x1: c + cos * rIn,
      y1: c + sin * rIn,
      x2: c + cos * rOut,
      y2: c + sin * rOut,
      width,
      major,
      group: Math.floor(i / 15),
    };
  });
}

/**
 * La fine couronne de 120 repères (deux tracés seulement : les petits et les grands), pour une
 * couronne de rayon `radius` dans un carré de côté 2 × (radius + 2).
 */
export function crownPaths(radius) {
  const box = (radius + 2) * 2;
  const c = box / 2;
  const k = radius / 226; // proportions de l'icône (rayon 226 sur 512)
  let minor = '';
  let major = '';
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2 - Math.PI / 2;
    const len = (i % 10 === 0 ? 13 : 8) * k;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const seg = `M${(c + cos * (radius - len)).toFixed(1)} ${(c + sin * (radius - len)).toFixed(1)}L${(c + cos * radius).toFixed(1)} ${(c + sin * radius).toFixed(1)}`;
    if (i % 10 === 0) major += seg;
    else minor += seg;
  }
  return {
    box,
    minor,
    major,
    minorWidth: Math.max(1, 2.6 * k),
    majorWidth: Math.max(1.4, 3.8 * k),
  };
}

/* ───────────── Couleurs ───────────── */

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(rgb) {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** Mélange deux couleurs hex (t = 0 → a, t = 1 → b). Une couleur illisible renvoie `a`. */
export function mixHex(a, b, t) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return a;
  return rgbToHex(ra.map((v, i) => v + (rb[i] - v) * t));
}

/* ───────────── Intro de démarrage : l'allure par ambiance ───────────── */

/**
 * Chaque ambiance a son allure : fond (centre, milieu, bord — ceux des icônes de saison, pour
 * que l'intro et l'icône soient de la même famille), couleurs des quatre quarts de l'anneau,
 * fine couronne [couleur, opacité] et le petit mot affiché sous l'anneau.
 *
 * Les saisons gardent les quatre couleurs des modes (la marque ne change pas) ; les moments
 * (fin d'année, Halloween, Saint-Valentin) donnent aussi leurs couleurs aux graduations. Aucun
 * symbole religieux : la fin d'année est neutre (étoiles, lumière).
 */
const LOOKS = {
  base: {
    bg: ['#1C1C1C', '#070707', '#000000'],
    ring: MODE_RING,
    crown: ['#FFFFFF', 0.34],
    greeting: null,
  },
  spring: {
    bg: ['#4E9A84', '#2C6A65', '#184650'],
    ring: MODE_RING,
    crown: ['#EBFFF5', 0.4],
    greeting: 'BON PRINTEMPS',
  },
  summer: {
    bg: ['#2FA3D6', '#1A6FA8', '#0F4476'],
    ring: MODE_RING,
    crown: ['#FFFFFF', 0.42],
    greeting: 'BEL ÉTÉ',
  },
  autumn: {
    bg: ['#B2602F', '#7A3A22', '#44201C'],
    ring: MODE_RING,
    crown: ['#FFE1BE', 0.38],
    greeting: 'BEL AUTOMNE',
  },
  winter: {
    bg: ['#7FA6D4', '#46698F', '#25395A'],
    ring: MODE_RING,
    crown: ['#EBF7FF', 0.55],
    greeting: 'BON HIVER',
  },
  yearend: {
    bg: ['#3B3B86', '#1F1F5A', '#10103A'],
    ring: ['#FFD76A', '#E9ECF7', '#FFD76A', '#E9ECF7'],
    crown: ['#FFD76A', 0.45],
    greeting: 'BONNES FÊTES',
  },
  halloween: {
    bg: ['#7A3AB0', '#3F1A6A', '#1D0B35'],
    ring: ['#FF8A2B', '#9BE04A', '#FF8A2B', '#C79BFF'],
    crown: ['#FFAA5A', 0.42],
    greeting: 'JOYEUX HALLOWEEN',
  },
  valentine: {
    bg: ['#C93D72', '#8A2150', '#4A1030'],
    ring: ['#FF6B8E', '#FFC1D2', '#FF6B8E', '#FFE0E8'],
    crown: ['#FFDCE6', 0.45],
    greeting: 'JOYEUSE SAINT-VALENTIN',
  },
};

/** L'allure de l'intro pour une ambiance (`null` ou inconnue : l'intro de base). */
export function splashLookFor(ambianceId) {
  const id = ambianceId && LOOKS[ambianceId] ? ambianceId : 'base';
  return { id, seasonal: id !== 'base', ...LOOKS[id] };
}

/* ───────────── Durées de l'intro ───────────── */

// Instants (ms depuis le début) où l'intro COMMENCE à se refermer ; le fondu de sortie (420 ms) s'y ajoute.
export const SPLASH_SHORT_MS = 1500; // intro courte : un seul son, ~1,9 s au total
export const SPLASH_LONG_MIN_MS = 3200; // intro longue : jamais plus courte que ça
export const SPLASH_LONG_MAX_MS = 9000; // filet de sécurité si le son ne dit jamais qu'il est fini
export const SPLASH_READY_GRACE_MS = 3000; // attente maximale de l'accueil, au-delà du temps prévu

/**
 * Quand l'intro commence-t-elle à se refermer ?
 *   - courte : à heure fixe ;
 *   - longue : quand le son est fini (donc elle suit la durée réelle de la seconde mélodie, que
 *     l'utilisateur peut raccourcir), jamais avant le minimum, jamais après le maximum ;
 *   - dans les deux cas pas avant que l'accueil soit prêt, dans la limite de la patience.
 * `audioDoneAt` : instant (ms depuis le début) où le son s'est terminé, ou null s'il ne l'est pas.
 * `readyAt` : instant où l'accueil s'est déclaré prêt, ou null.
 */
export function splashExitAt({ long, audioDoneAt = null, readyAt = null }) {
  const planned = long
    ? Math.min(SPLASH_LONG_MAX_MS, Math.max(SPLASH_LONG_MIN_MS, audioDoneAt ?? SPLASH_LONG_MAX_MS))
    : SPLASH_SHORT_MS;
  const readyCap = planned + SPLASH_READY_GRACE_MS;
  const ready = readyAt == null ? readyCap : Math.min(readyAt, readyCap);
  return Math.max(planned, ready);
}

/* ───────────── Particules ───────────── */

/** Générateur pseudo-aléatoire STABLE : une même clé donne toujours la même suite. */
export function seededRandom(key) {
  let seed = 11;
  const s = String(key);
  for (let i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/**
 * Particules d'une rafale qui jaillit du centre.
 *   angle  direction (radians), répartie sur le tour avec un peu de désordre
 *   dist   distance parcourue (dp)
 *   size   taille (dp)
 *   delay  retard de départ, en fraction de la rafale (0 à delayMax)
 *   spin   rotation totale (degrés)
 *   drift  glissement vertical ajouté (dp, positif = ça retombe, négatif = ça monte)
 *   color  couleur d'un point simple ; kind = forme d'ambiance (AmbianceShapes) si fournie
 */
export function burstParticles({
  seed,
  count,
  minDist,
  maxDist,
  minSize,
  maxSize,
  colors = ['#FFFFFF'],
  kinds = null,
  drift = 0,
  spin = 80,
  delayMax = 0.3,
  alpha = 1,
}) {
  const rnd = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.7;
    const dist = minDist + rnd() * (maxDist - minDist);
    return {
      angle,
      dist,
      size: Math.round(minSize + rnd() * (maxSize - minSize)),
      delay: rnd() * delayMax,
      spin: (rnd() - 0.5) * 2 * spin,
      drift: drift ? drift * (0.5 + rnd() * 0.8) : 0,
      color: colors[i % colors.length],
      kind: kinds ? kinds[i % kinds.length] : null,
      alpha,
    };
  });
}
