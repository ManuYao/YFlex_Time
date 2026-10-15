#!/usr/bin/env node
// Décors des icônes de saison : mêmes formes fines que l'ambiance de l'app
// (components/common/AmbianceShapes.js, lib/ambiance.js : couleurs accent / accent2, motifs de chaque saison).
//
//   node design/build-motifs.js   -> écrit design/icon-motifs.json (lu ensuite par design/build-icons.js)
//
// Chaque forme se dessine dans un viewBox de 12 centré sur 0 ; on la pose avec translate + rotate + scale.

const fs = require('fs');
const path = require('path');

// Couleurs reprises de lib/ambiance.js (accent, accent2).
const PAL = {
  spring: { a: '#FF8FB8', b: '#8EE06B' },
  summer: { a: '#FFC93A', b: '#4CC9FF' },
  autumn: { a: '#FF9A2E', b: '#E8512B' },
  winter: { a: '#A9D4FF', b: '#FFFFFF' },
  yearend: { a: '#FFE08A', b: '#C9B8FF' },
  halloween: { a: '#FF8A2B', b: '#9D6BFF' },
  valentine: { a: '#FF6F9C', b: '#FFC1D6' },
};

const INK = '#FFFFFF';

// Une forme : tracé de AmbianceShapes (accent = remplissage translucide, ink = trait blanc fin).
function shape(kind, accent, sw) {
  const st = `stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
  switch (kind) {
    case 'leaf':
      return `<path d="M0 -5C3.4 -3 4.2 1.8 0 5C-4.2 1.8 -3.4 -3 0 -5Z" fill="${accent}" fill-opacity="0.55" ${st}/><path d="M0 -3.4L0 5.6" fill="none" ${st} stroke-opacity="0.6"/>`;
    case 'flake':
      return `<path d="M-4.6 0L4.6 0M-2.3 -4L2.3 4M-2.3 4L2.3 -4" fill="none" ${st}/>`;
    case 'dot':
      return `<circle r="1.7" fill="${INK}" fill-opacity="0.8"/>`;
    case 'ember':
      return `<circle r="2.2" fill="${accent}" fill-opacity="0.95"/><circle r="4.4" fill="${accent}" fill-opacity="0.22"/>`;
    case 'petal':
      return `<ellipse rx="2.6" ry="4.4" fill="${accent}" fill-opacity="0.6" ${st}/>`;
    case 'mote':
      return `<circle r="2.6" fill="${accent}" fill-opacity="0.8"/><circle r="4.8" fill="none" stroke="${accent}" stroke-opacity="0.65" stroke-width="${sw}"/>`;
    case 'star':
      return `<path d="M0 -5.2Q0.7 -0.7 5.2 0Q0.7 0.7 0 5.2Q-0.7 0.7 -5.2 0Q-0.7 -0.7 0 -5.2Z" fill="${accent}" fill-opacity="0.85" ${st}/>`;
    case 'bat':
      return `<g transform="scale(0.19)" fill="#FFFFFF" fill-opacity="0.9"><path d="M0 -6C3 -10 6 -10 8 -6C14 -12 22 -12 30 -6C26 -4 25 0 26 6C22 2 18 3 16 8C13 4 9 5 8 10C6 6 2 6 0 12C-2 6 -6 6 -8 10C-9 5 -13 4 -16 8C-18 3 -22 2 -26 6C-25 0 -26 -4 -30 -6C-22 -12 -14 -12 -8 -6C-6 -10 -3 -10 0 -6Z"/><path d="M-6 -7L-4 -15L0 -9L4 -15L6 -7Z"/></g>`;
    case 'heart':
      return `<path d="M0 -1.2C-0.6 -3.2 -4.2 -3 -4.2 -0.2C-4.2 1.8 -1.2 3.5 0 4.7C1.2 3.5 4.2 1.8 4.2 -0.2C4.2 -3 0.6 -3.2 0 -1.2Z" fill="${accent}" fill-opacity="0.7" ${st}/>`;
    default:
      return '';
  }
}

// Emplacements hors de l'anneau (coins du canevas de 512) : [x, y, rotation, échelle].
// Un grand motif en haut à droite (le « passage rare »), trois moyens, puis de petits points.
const SPOTS = [
  [424, 92, 14, 8],
  [92, 422, -18, 6.6],
  [90, 104, 24, 5.4],
  [424, 424, 30, 5.6],
];
const DOTS = [
  [150, 40],
  [480, 190],
  [30, 300],
  [350, 480],
  [476, 336],
  [30, 190],
  [262, 16],
  [190, 494],
];

function build(id, kinds, rare, accents) {
  let out = '';
  SPOTS.forEach(([x, y, rot, s], i) => {
    const kind = i === 0 ? rare : kinds[i % kinds.length];
    const accent = accents[i % 2];
    const sw = 1.5; // trait en unités du viewBox : ~1,1 px visuel d'un dp d'ambiance, un peu plus à cette taille
    out += `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${shape(kind, accent, sw / 1.0 * (i === 0 ? 0.55 : 0.6))}</g>`;
  });
  DOTS.forEach(([x, y], i) => {
    const small = kinds.includes('flake') || kinds.includes('star') ? (i % 2 ? 'dot' : kinds[0]) : 'dot';
    const s = small === 'dot' ? 1.6 : 2.2;
    out += `<g transform="translate(${x} ${y}) scale(${s})" opacity="0.85">${shape(small, accents[i % 2], 0.9)}</g>`;
  });
  return out;
}

const MOTIFS = {
  spring: build('spring', ['petal', 'petal', 'petal', 'petal'], 'petal', [PAL.spring.a, PAL.spring.b]),
  summer: build('summer', ['mote', 'mote', 'mote', 'mote'], 'mote', [PAL.summer.a, PAL.summer.b]),
  autumn: build('autumn', ['leaf', 'leaf', 'leaf', 'leaf'], 'leaf', [PAL.autumn.a, PAL.autumn.b]),
  winter: build('winter', ['flake', 'dot', 'flake', 'dot'], 'flake', [PAL.winter.a, PAL.winter.b]),
  yearend: build('yearend', ['star', 'dot', 'star', 'dot'], 'star', [PAL.yearend.a, PAL.yearend.b]),
  halloween: build('halloween', ['ember', 'ember', 'ember', 'ember'], 'bat', [PAL.halloween.a, PAL.halloween.b]),
  valentine: build('valentine', ['heart', 'heart', 'heart', 'dot'], 'heart', [PAL.valentine.a, PAL.valentine.b]),
};

fs.writeFileSync(path.join(__dirname, 'icon-motifs.json'), JSON.stringify(MOTIFS, null, 2) + '\n');
console.log('ok  icon-motifs.json (' + Object.keys(MOTIFS).join(', ') + ')');
