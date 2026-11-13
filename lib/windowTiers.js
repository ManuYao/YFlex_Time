// Paliers de taille de la fenêtre pour le CHRONO — fenêtre flottante Samsung
// (« pop-up view »), écran partagé. Fichier PUR (aucun import) : testé en Node
// (E:\ftb\ambiance\tools\test-window-tiers.mjs).
//
// Cas visé : on garde son programme de sport ouvert et on rétrécit l'app par-dessus,
// pour ne garder que le chrono. Du plus grand au plus petit :
//
//   'ring'  : l'écran de séance d'origine, réduit — barre du haut, anneau, commandes ;
//   'mini'  : l'anneau serait trop petit, il disparaît — barre du haut, chiffre, commandes ;
//   'micro' : seulement les chiffres (+ tour et phase). Les commandes ne tiennent plus :
//             elles apparaissent par-dessus quand on touche le chiffre, puis se cachent
//             seules après quelques secondes.
//
// Le MIX n'est PAS concerné (décision de l'utilisateur) : il garde son ancien minimum, voir
// NOTICE_LIMITS.mix, et ses paliers d'origine (app/running.js).

// ── Palier micro ──────────────────────────────────────────────────────────────
// Sous cette hauteur la barre du haut + les commandes (~170 dp) ne laissent plus assez de
// place au chiffre ; sous cette largeur la barre du haut (Retour, nom, tour) se chevauche.
export const MICRO_MAX_H = 300;
export const MICRO_MAX_W = 250;
// Les commandes affichées par-dessus le chiffre se cachent seules après ce délai sans appui.
// Plus long que le plus long maintien d'un bouton (2 s, lib/rainMode.js) : un maintien en
// cours ne se fait jamais couper.
export const MICRO_AUTOHIDE_MS = 3000;

export function isMicroWindow(width, height) {
  if (!(width > 0) || !(height > 0)) return false;
  return height < MICRO_MAX_H || width < MICRO_MAX_W;
}

// ── Budget vertical de l'écran de séance (dp) ─────────────────────────────────
// Barre du haut : 90 avec le libellé « Retour » sous le bouton, 64 sans (« slim »).
export const TOPBAR_H = 90;
export const TOPBAR_SLIM_H = 64;
// En dessous de cette hauteur utile la barre du haut perd le libellé « Retour ».
export const SLIM_BELOW_H = 480;
// Rangée de commandes : 64 + 28 + 92 + 28 + 64 de large, bouton central 92 de haut.
export const CONTROLS_NATURAL_W = 276;
const CONTROLS_CENTER = 92;
const CONTROLS_SIDE = 64;
const CONTROLS_LABEL = 19; // libellé sous un bouton rond : marge 8 + ligne ~11
const CONTROLS_PAD = 18; // marges haute (6) + basse (12) en mise en page réduite

export function isSlimTopBar(availH) {
  return availH < SLIM_BELOW_H;
}

// Facteur de réduction de la rangée de commandes selon la largeur (1 = taille d'origine).
// `reserve` = largeur retirée avant de comparer (marges, bulle de charge du MIX).
export function controlsScale(width, reserve = 24) {
  return Math.min(1, Math.max(0.55, (width - reserve) / CONTROLS_NATURAL_W));
}

// Hauteur prise par la barre du haut et la rangée de commandes (tout sauf l'anneau).
export function runChromeHeight(width, slim) {
  const k = controlsScale(width);
  const row = Math.max(CONTROLS_CENTER * k, CONTROLS_SIDE * k + CONTROLS_LABEL);
  return (slim ? TOPBAR_SLIM_H : TOPBAR_H) + CONTROLS_PAD + Math.round(row);
}

/**
 * Palier du chrono (hors MIX).
 *   width, height : taille UTILE de la fenêtre (hauteur moins les marges de sécurité) ;
 *   level         : niveau global de lib/responsive.js ('full' | 'compact' | 'mini') ;
 *   ui            : facteur d'échelle de lib/responsive.js (1 sur un téléphone normal).
 * L'anneau reste tant qu'il tient : l'anneau réduit + sa marge + la barre du haut + les
 * commandes doivent tenir dans la hauteur ET l'anneau dans la largeur.
 */
export function runTier({ width, height, level, ui }) {
  if (!(width > 0) || !(height > 0)) return level === 'mini' ? 'mini' : 'ring';
  if (isMicroWindow(width, height)) return 'micro';
  if (level === 'full') return 'ring';
  const ring = Math.round(260 * ui);
  const margin = Math.round(14 * ui);
  const need = runChromeHeight(width, isSlimTopBar(height)) + ring + margin + 6;
  return height >= need && ring <= width - 24 ? 'ring' : 'mini';
}

// ── Chiffre du palier micro ───────────────────────────────────────────────────
// Police à chasse fixe (JetBrains Mono : 0,6 em par caractère), interlettrage serré de
// -0,04 em. Le chiffre prend toute la place que laissent la ligne « tour / phase » et la
// barre d'avancement ; plafonné pour qu'une grande fenêtre ne donne pas un chiffre absurde.
// 0,6 em est la chasse nominale ; sur Android le rendu réel (graisse 800, arrondis) est plus
// large : « 01:30 » débordait et finissait en « 01:… ». Marge prise large, et l'écran garde en
// plus adjustsFontSizeToFit en filet (texte en flux dans une boîte dimensionnée : acceptable).
const MONO_ADVANCE = 0.68;
export const MICRO_TRACKING = -0.04;
const MICRO_SIDE_PAD = 8;
const MICRO_BAR_H = 6;
const MICRO_MAX_FONT = 220;
const MICRO_MIN_FONT = 24;

// Hauteur de la ligne « tour / phase » : plus fine dans une fenêtre très basse.
export function microInfoHeight(height) {
  return height >= 150 ? 22 : 16;
}

export function microDigitsSize(width, height, chars) {
  const n = Math.max(1, Math.floor(chars) || 1);
  const availW = width - 2 * MICRO_SIDE_PAD;
  const availH = height - microInfoHeight(height) - MICRO_BAR_H - 12;
  const byW = availW / (n * (MONO_ADVANCE + MICRO_TRACKING));
  const byH = availH / 1.05;
  return Math.max(MICRO_MIN_FONT, Math.floor(Math.min(byW, byH, MICRO_MAX_FONT)));
}

// En dessous de 60 s on n'écrit que les secondes (« 54 ») : deux caractères au lieu de cinq,
// donc un chiffre bien plus grand — c'est tout l'intérêt du palier micro.
export function microTimeText(displaySeconds, clock) {
  const s = Math.max(0, Math.floor(displaySeconds) || 0);
  return s < 60 ? String(s).padStart(2, '0') : clock;
}

// ── Commandes affichées par-dessus le chiffre ─────────────────────────────────
// La rangée d'origine est réduite pour tenir dans la fenêtre, sans passer sous la moitié.
export function embeddedControlsScale(width, height) {
  const byW = (width - 16) / CONTROLS_NATURAL_W;
  const byH = (height - 16) / CONTROLS_CENTER;
  return Math.min(1, Math.max(0.5, Math.min(byW, byH)));
}

// Le bouton « Retour » (qui jette la séance) s'ajoute dans un coin : il ne tient que dans
// une fenêtre assez haute pour ne pas passer sur la rangée.
export function microShowsReturn(height) {
  return height >= 170;
}

// Les libellés sous les boutons ronds disparaissent dans une fenêtre très basse.
export function microShowsLabels(height) {
  return height >= 170;
}

// ── Fenêtre trop petite pour un écran ─────────────────────────────────────────
// Sous ces tailles l'écran est remplacé par « Agrandis la fenêtre » (SmallWindowNotice).
// Les plus petites fenêtres que l'app accepte sont fixées côté natif
// (plugins/withMinWindowSize.js) ; ces seuils sont dessous : filet de sécurité.
//   default : listes et feuilles, pensées pour un téléphone (jamais en plein écran : le plus
//             petit téléphone réel fait ~320 × 470 dp) ;
//   home    : l'accueil a sa mise en page « mini » qui défile ;
//   run     : le chrono hors MIX, qui descend jusqu'au palier micro ;
//   mix     : le MIX garde son ancien minimum natif (300 × 520), un peu abaissé pour la
//             marge de mesure.
export const NOTICE_LIMITS = {
  default: { h: 430, w: 270 },
  home: { h: 190, w: 190 },
  run: { h: 100, w: 140 },
  mix: { h: 460, w: 280 },
};

export function noticeKind(pathname, isMix) {
  if (pathname === '/running' || pathname === '/countdown') return isMix ? 'mix' : 'run';
  if (pathname === '/' || pathname === '/home') return 'home';
  return 'default';
}

// `kind` : une clé de NOTICE_LIMITS. Un booléen est accepté (ancienne signature : true = accueil).
export function isWindowTooSmall(width, height, kind = 'default') {
  if (!width || !height) return false;
  const key = kind === true ? 'home' : kind === false ? 'default' : kind;
  const lim = NOTICE_LIMITS[key] || NOTICE_LIMITS.default;
  return height < lim.h || width < lim.w;
}
