/* Teinte de repos — signaler l'inter-série sans trahir la couleur du mode.
 *
 * Demande explicite de l'utilisateur (23/09/2026) : pendant la pause entre
 * deux séries, l'écran doit faire comprendre « c'est le moment de souffler »,
 * mais « il ne faut pas que les couleurs soient trop prononcées qui perdent
 * la couleur du timer ». Une première version inventait une palette par mode
 * (BASIC gris -> vert franc, MIX violet -> bleu) : elle a été jetée, elle
 * remplaçait l'identité de chaque mode au lieu de la nuancer.
 *
 * D'où le principe retenu : on n'invente AUCUNE couleur. On part de celle du
 * mode et on l'éteint — même teinte, moins saturée, plus sombre. Un TABATA
 * reste jaune, un EMOM reste vert ; la couleur passe simplement en veille,
 * comme une lumière qu'on baisse. Conséquence voulue : ajouter un 6e mode
 * demain ne demande aucune entrée ici.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function hexToRgb(hex) {
  // Le test de type est nécessaire : sans lui `123` devient la chaîne "123",
  // lue comme la forme courte #112233 — un nombre passerait pour une couleur.
  if (typeof hex !== 'string') return null;
  const s = hex.replace('#', '').trim();
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

const toHex = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');

function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h, s, l };
}

function hslToHex({ h, s, l }) {
  if (s === 0) {
    const v = l * 255;
    return `#${toHex(v)}${toHex(v)}${toHex(v)}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return `#${toHex(channel(h + 1 / 3) * 255)}${toHex(channel(h) * 255)}${toHex(channel(h - 1 / 3) * 255)}`;
}

// Combien on éteint. Mesuré à l'oeil sur les 5 modes : en dessous la pause ne
// se remarque pas, au-dessus la couleur du mode n'est plus reconnaissable.
const REST_SATURATION = 0.55;
const REST_LIGHTNESS = 0.68;

// Un mode achromatique (BASIC, gris pur) ne peut pas être désaturé : sans ce
// plancher sa phase de repos serait un gris à peine plus sombre, illisible
// comme signal. On lui rend une pointe de chaleur, assez pour que l'oeil voie
// un changement, trop peu pour en faire "un timer rouge".
const ACHROMATIC_MAX_S = 0.08;
const WARM_HUE = 0.045; // ~16° — l'orange rouge de la DA, pas une teinte neuve
const WARM_INJECT_S = 0.16;

// TABATA écrit en NOIR sur son fond (textMode: 'dark'). Trop assombrir son
// dégradé rendrait son propre texte illisible, donc l'extinction y est bornée :
// sa pause est plus douce que celle des autres modes, et c'est voulu — du
// texte noir sur un ocre déjà sombre devient vite pénible à lire en plein
// effort. La valeur est au-dessus de ce que donnerait REST_LIGHTNESS seul
// (0.60 * 0.68 = 0.41), sinon la borne ne servirait jamais à rien.
const DARK_TEXT_MIN_L = 0.45;

export function restTint(hex, { textMode = 'light' } = {}) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex; // couleur illisible : mieux vaut ne rien changer

  const { h, s, l } = rgbToHsl(rgb);
  const achromatic = s <= ACHROMATIC_MAX_S;

  const nextH = achromatic ? WARM_HUE : h;
  const nextS = achromatic ? WARM_INJECT_S : s * REST_SATURATION;
  let nextL = l * REST_LIGHTNESS;

  // Le plancher ne s'applique qu'à une couleur qui était au-dessus : sur un
  // arrêt de dégradé déjà sombre il n'y a plus de texte noir à protéger, et
  // le relever reviendrait à annuler l'extinction au lieu de la borner.
  if (textMode === 'dark' && l > DARK_TEXT_MIN_L) {
    nextL = Math.max(nextL, DARK_TEXT_MIN_L);
  }

  return hslToHex({ h: nextH, s: clamp(nextS, 0, 1), l: clamp(nextL, 0, 1) });
}

// Le fond est un dégradé à 3 arrêts : on éteint les trois de la même façon,
// sinon le dégradé se déforme au lieu de baisser d'intensité.
export function restGradient(colors, opts) {
  if (!Array.isArray(colors)) return colors;
  return colors.map((c) => restTint(c, opts));
}
