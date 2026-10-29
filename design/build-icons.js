#!/usr/bin/env node
// Icônes Flex Timer : base + 4 saisons + 3 moments (même DA que l'ambiance de l'app), en SVG puis en PNG.
//
//   node design/build-icons.js            -> écrit design/icons/<variante>/… et l'aperçu design/icons/_apercu.png
//   node design/build-icons.js --apply    -> en plus, copie l'icône de BASE dans assets/ (voir plus bas)
//
// Le moteur de rendu (resvg) vit hors du projet : RESVG_PATH pour changer son emplacement.
// Les décors saisonniers sont dans design/icon-motifs.json (un morceau de SVG par variante).
//
// ⚠️ Les fichiers de assets/ font partie de l'empreinte native : les remplacer coupe les mises à jour OTA
//    des téléphones déjà installés. À ne faire que pour le prochain APK (voir CLAUDE.md, « ICÔNE »).

const fs = require('fs');
const path = require('path');
const { Resvg } = require(process.env.RESVG_PATH || 'E:/ftb/tools/node_modules/@resvg/resvg-js');
const MOTIFS = require('./icon-motifs.json');

const OUT = path.join(__dirname, 'icons');
const ASSETS = path.join(__dirname, '..', 'assets');

// Le « F » d'Anton (tracé extrait de la police), centré dans un canevas de 512, 168 de haut.
const F_PATH =
  'M222.4 340.0L222.4 172.0L289.6 172.0L289.6 204.7L256.2 204.7L256.2 231.5L287.9 231.5L287.9 263.8L256.2 263.8L256.2 340.0Z';

// Les quatre couleurs des modes : AMRAP, TABATA, EMOM, MIX (un quart d'anneau chacune, de 12 h dans le sens horaire).
const MODE = ['#FF5454', '#FFC933', '#1FC777', '#9575FF'];

// Fond de la base : trois niveaux de clarté (centre, milieu, bord). Le 2 est celui retenu.
const LEVELS = {
  1: ['#34343D', '#1C1C22', '#141418'],
  2: ['#4B4B5A', '#2A2A35', '#1B1B23'],
  3: ['#62627A', '#383848', '#262633'],
};
const BASE_LEVEL = 2;

// bg = [centre, milieu, bord] ; col = couleurs des 4 quarts ; fine = [couleur, opacité] de la fine couronne.
// Comme dans l'app (ambiance), la couleur des modes ne change JAMAIS : seuls le fond, la fine couronne
// (couleur d'accent de la saison) et les petits motifs (design/build-motifs.js) changent.
const VARIANTS = {
  base: { label: 'Base', bg: LEVELS[BASE_LEVEL], col: MODE, fine: ['#FFFFFF', 0.34] },
  spring: { label: 'Printemps', bg: ['#4E9A84', '#2C6A65', '#184650'], col: MODE, fine: ['#FFD3E3', 0.5] },
  summer: { label: 'Été', bg: ['#2FA3D6', '#1A6FA8', '#0F4476'], col: MODE, fine: ['#FFE389', 0.5] },
  autumn: { label: 'Automne', bg: ['#B2602F', '#7A3A22', '#44201C'], col: MODE, fine: ['#FFC27A', 0.5] },
  winter: { label: 'Hiver', bg: ['#7FA6D4', '#46698F', '#25395A'], col: MODE, fine: ['#EBF7FF', 0.6] },
  yearend: { label: "Fin d'année", bg: ['#3B3B86', '#1F1F5A', '#10103A'], col: MODE, fine: ['#FFE08A', 0.5] },
  halloween: { label: 'Halloween', bg: ['#7A3AB0', '#3F1A6A', '#1D0B35'], col: MODE, fine: ['#FFAA5A', 0.5] },
  valentine: { label: 'Saint-Valentin', bg: ['#C93D72', '#8A2150', '#4A1030'], col: MODE, fine: ['#FFDCE6', 0.55] },
};

// ---------- Géométrie : 60 graduations + fine couronne de 120 repères (canevas de 512) ----------
const C = 256;
const seg = (R, len, i, n) => {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return `M${(C + c * (R - len)).toFixed(1)} ${(C + s * (R - len)).toFixed(1)}L${(C + c * R).toFixed(1)} ${(C + s * R).toFixed(1)}`;
};
const minor = ['', '', '', ''];
const major = ['', '', '', ''];
for (let i = 0; i < 60; i++) {
  const g = Math.floor(i / 15);
  if (i % 5 === 0) major[g] += seg(204, 42, i, 60);
  else minor[g] += seg(204, 27, i, 60);
}
let fineMinor = '';
let fineMajor = '';
for (let i = 0; i < 120; i++) {
  if (i % 10 === 0) fineMajor += seg(226, 13, i, 120);
  else fineMinor += seg(226, 8, i, 120);
}

const ringPaths = (colors) =>
  colors
    .map((c, g) => `<path d="${minor[g]}" stroke="${c}" stroke-width="7.4"/><path d="${major[g]}" stroke="${c}" stroke-width="12.4"/>`)
    .join('');

// Le dessin lui-même (sans fond), dans un canevas de 512. `sfx` rend les identifiants uniques quand on assemble plusieurs icônes.
function art(v, sfx, { mono = false } = {}) {
  const cfg = VARIANTS[v];
  if (mono) {
    return `<g fill="none" stroke-linecap="round">${ringPaths(['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'])}</g><path d="${F_PATH}" fill="#FFFFFF"/>`;
  }
  const ring = ringPaths(cfg.col);
  return (
    `<g fill="none" stroke-linecap="round" stroke="${cfg.fine[0]}" stroke-opacity="${cfg.fine[1]}">` +
    `<path d="${fineMinor}" stroke-width="2.6"/><path d="${fineMajor}" stroke-width="3.8"/></g>` +
    `<g fill="none" stroke-linecap="round"><g opacity="0.5" filter="url(#blur7${sfx})">${ring}</g>${ring}</g>` +
    `<path d="${F_PATH}" fill="#FFFFFF" opacity="0.55" filter="url(#blur5${sfx})"/>` +
    `<path d="${F_PATH}" fill="#FFFFFF"/>` +
    (MOTIFS[v] || '')
  );
}

function defs(v, sfx) {
  const [a, b, c] = VARIANTS[v].bg;
  return (
    `<defs>` +
    `<filter id="blur7${sfx}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>` +
    `<filter id="blur5${sfx}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>` +
    `<radialGradient id="bg${sfx}" gradientUnits="userSpaceOnUse" cx="256" cy="235.5" r="376.8">` +
    `<stop offset="0" stop-color="${a}"/><stop offset="0.62" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>` +
    `<radialGradient id="lift${sfx}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(256 -25.6) scale(362 760)">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.12"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>` +
    `</defs>`
  );
}

// Fond seul (déborde largement : il sert aussi au calque de fond des icônes adaptatives).
const bgRects = (sfx) =>
  `<rect x="-300" y="-300" width="1112" height="1112" fill="url(#bg${sfx})"/>` +
  `<rect x="-300" y="-300" width="1112" height="1112" fill="url(#lift${sfx})"/>`;

const SVG_OPEN = (size, box) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" width="${size}" height="${size}">`;

// Icône pleine, carrée (iOS, fiche Play Store) : ce que montre la maquette.
const svgFull = (v) => `${SVG_OPEN(1024, 512)}${defs(v, '')}${bgRects('')}${art(v, '')}</svg>`;

// Icônes adaptatives Android : calque de 1024 (108 dp), zone toujours visible = disque de 683 px au centre.
// Le dessin de base est grand (1,3) ; les décors saisonniers, qui débordent, sont un peu réduits (1,2).
const fgScale = (v) => (v === 'base' ? 1.3 : 1.2);
const svgForeground = (v) =>
  `${SVG_OPEN(1024, 1024)}${defs(v, '')}<g transform="translate(512 512) scale(${fgScale(v)}) translate(-256 -256)">${art(v, '')}</g></svg>`;
const svgBackground = (v) =>
  `${SVG_OPEN(1024, 1024)}${defs(v, '')}<g transform="translate(170.67 170.67) scale(1.3333)">${bgRects('')}</g></svg>`;
const svgMono = () =>
  `${SVG_OPEN(1024, 1024)}<g transform="translate(512 512) scale(${fgScale('base')}) translate(-256 -256)">${art('base', '', { mono: true })}</g></svg>`;

// ---------- Rendu ----------
const FONT = { loadSystemFonts: true, defaultFontFamily: 'Arial' };
const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: FONT }).render().asPng();
const write = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
};

for (const v of Object.keys(VARIANTS)) {
  const dir = path.join(OUT, v);
  write(path.join(dir, 'icon.svg'), svgFull(v));
  write(path.join(dir, 'icon-1024.png'), png(svgFull(v), 1024));
  write(path.join(dir, 'play-512.png'), png(svgFull(v), 512));
  write(path.join(dir, 'foreground-1024.png'), png(svgForeground(v), 1024));
  write(path.join(dir, 'background-1024.png'), png(svgBackground(v), 1024));
  if (v === 'base') write(path.join(dir, 'monochrome-1024.png'), png(svgMono(), 1024));
  console.log('ok  ' + v);
}

// Planche d'aperçu : les 9 icônes en carré arrondi, sur fond clair.
const ORDER = ['base', 'spring', 'summer', 'autumn', 'winter', 'yearend', 'halloween', 'valentine'];
const CELL = 300;
const GAP = 44;
const LABEL = 40;
const W = 3 * CELL + 4 * GAP;
const H = 3 * (CELL + LABEL) + 4 * GAP;
let cells = '';
ORDER.forEach((v, i) => {
  const x = GAP + (i % 3) * (CELL + GAP);
  const y = GAP + Math.floor(i / 3) * (CELL + LABEL + GAP);
  const sfx = '-' + v;
  cells +=
    `<svg x="${x}" y="${y}" width="${CELL}" height="${CELL}" viewBox="0 0 512 512">` +
    `${defs(v, sfx)}<clipPath id="clip${sfx}"><rect width="512" height="512" rx="114.5"/></clipPath>` +
    `<g clip-path="url(#clip${sfx})">${bgRects(sfx)}${art(v, sfx)}</g></svg>` +
    `<text x="${x + CELL / 2}" y="${y + CELL + 28}" text-anchor="middle" font-size="22" font-weight="700" fill="#17171B">${VARIANTS[v].label}</text>`;
});
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ECEBE6"/>${cells}</svg>`;
write(path.join(OUT, '_apercu.png'), png(sheet, W));
console.log('ok  aperçu');

// ---------- --apply : l'icône de base dans assets/ (pour le prochain APK) ----------
if (process.argv.includes('--apply')) {
  const base = path.join(OUT, 'base');
  const copy = (from, to) => {
    fs.copyFileSync(path.join(base, from), path.join(ASSETS, to));
    console.log('assets/' + to);
  };
  copy('icon-1024.png', 'icon.png');
  copy('foreground-1024.png', 'adaptive-icon.png');
  copy('background-1024.png', 'adaptive-icon-background.png');
  copy('monochrome-1024.png', 'adaptive-icon-monochrome.png');
  copy('foreground-1024.png', 'splash-icon.png');
  console.log('Pense à app.json : adaptiveIcon.backgroundImage = ./assets/adaptive-icon-background.png');
}
