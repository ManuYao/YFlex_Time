/**
 * Ambiance de saison — logique PURE (aucun import React Native : testable au `node`).
 *
 * Principe (maquette « Accueil et ambiance », 12/10/2026) : la forme, la couleur du
 * mode et les textes des écrans ne changent JAMAIS. Une ambiance ne fait qu'ajouter
 * des touches fines, dans le langage des graduations de l'app : une couronne de
 * graduations autour des boutons ronds du haut, un liseré teinté, une lueur qui
 * respire, quelques motifs qui flottent seuls et un passage rare.
 *
 * Tout se décide à la date du téléphone :
 *   - UNE SAISON toute l'année (très discrète) ;
 *   - quelques MOMENTS (fin d'année, Halloween, Saint-Valentin) qui passent par-dessus
 *     pendant quelques jours, puis la saison reprend.
 * Aucun symbole religieux : « Noël » et « Nouvel An » ne font qu'une ambiance
 * neutre, « fin d'année » (étoiles, lumière).
 *
 * Réglage utilisateur (`settings.ambianceMode`) :
 *   'auto'    saisons + moments (défaut)
 *   'seasons' les quatre saisons seulement
 *   'none'    aucune ambiance : l'app comme avant
 */

export const AMBIANCE_MODES = ['auto', 'seasons', 'none'];
export const DEFAULT_AMBIANCE_MODE = 'auto';

/**
 * accent / accent2 : couleurs de l'ambiance (hex). rim / glow : triplets RVB.
 * glowK : intensité de la lueur (l'hiver est le plus lumineux : un blanc froid).
 * motifs : les 5 petits motifs qui flottent au fond (formes de AmbianceShapes).
 * rare : le grand motif qui traverse de temps en temps.
 * dir : sens de dérive des motifs — 1 ils descendent, -1 ils montent, 0 ils se promènent.
 * period : texte court affiché dans les Paramètres.
 */
export const AMBIANCES = {
  spring: {
    id: 'spring', label: 'Printemps', kind: 'season', period: 'mars → mai',
    accent: '#FF8FB8', accent2: '#8EE06B', rim: [255, 160, 196], glow: [255, 160, 196], glowK: 1,
    motifs: ['petal', 'petal', 'petal', 'petal', 'dot'], rare: 'petal', dir: 1,
  },
  summer: {
    id: 'summer', label: 'Été', kind: 'season', period: 'juin → août',
    accent: '#FFC93A', accent2: '#4CC9FF', rim: [255, 214, 102], glow: [255, 214, 102], glowK: 1,
    motifs: ['mote', 'mote', 'mote', 'mote', 'dot'], rare: 'mote', dir: 0,
  },
  autumn: {
    id: 'autumn', label: 'Automne', kind: 'season', period: 'sept → nov',
    accent: '#FF9A2E', accent2: '#E8512B', rim: [255, 172, 64], glow: [255, 172, 64], glowK: 1,
    motifs: ['leaf', 'leaf', 'leaf', 'leaf', 'dot'], rare: 'leaf', dir: 1,
  },
  winter: {
    id: 'winter', label: 'Hiver', kind: 'season', period: 'déc → fév',
    accent: '#A9D4FF', accent2: '#FFFFFF', rim: [190, 225, 255], glow: [215, 238, 255], glowK: 1.5,
    motifs: ['flake', 'dot', 'flake', 'dot', 'flake'], rare: 'flake', dir: 1,
  },
  yearend: {
    id: 'yearend', label: "Fin d'année", kind: 'moment', period: '20 déc → 2 janv',
    accent: '#FFE08A', accent2: '#C9B8FF', rim: [255, 224, 138], glow: [255, 224, 138], glowK: 1,
    motifs: ['star', 'dot', 'star', 'dot', 'star'], rare: 'star', dir: 0,
  },
  halloween: {
    id: 'halloween', label: 'Halloween', kind: 'moment', period: '20 → 31 oct',
    accent: '#FF8A2B', accent2: '#9D6BFF', rim: [255, 138, 43], glow: [255, 138, 43], glowK: 1,
    motifs: ['ember', 'ember', 'ember', 'ember', 'ember'], rare: 'bat', dir: -1,
  },
  valentine: {
    id: 'valentine', label: 'Saint-Valentin', kind: 'moment', period: '7 → 14 fév',
    accent: '#FF6F9C', accent2: '#FFC1D6', rim: [255, 130, 170], glow: [255, 130, 170], glowK: 1,
    motifs: ['heart', 'heart', 'heart', 'dot', 'dot'], rare: 'heart', dir: -1,
  },
};

export function getAmbiance(id) {
  return (id && AMBIANCES[id]) || null;
}

/** Saison de la date (heure locale du téléphone). */
export function seasonOf(date) {
  const m = date.getMonth() + 1; // 1 à 12
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

/** Moment particulier de la date, ou null. */
export function momentOf(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 12 && d >= 20) || (m === 1 && d <= 2)) return 'yearend';
  if (m === 10 && d >= 20) return 'halloween';
  if (m === 2 && d >= 7 && d <= 14) return 'valentine';
  return null;
}

/** Identifiant de l'ambiance à afficher selon le réglage et la date, ou null (aucune). */
export function ambianceIdFor(mode, date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  if (mode === 'none') return null;
  if (mode === 'seasons') return seasonOf(d);
  return momentOf(d) || seasonOf(d);
}

/** Réglage lisible ? (une valeur inconnue retombe sur le défaut). */
export function normalizeAmbianceMode(mode) {
  return AMBIANCE_MODES.includes(mode) ? mode : DEFAULT_AMBIANCE_MODE;
}

/** 'rgba(r,g,b,a)' depuis un triplet RVB. */
export function rgba(rgb, a) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

/**
 * Couronne de graduations autour d'un bouton rond : opacité de chacune des `count`
 * graduations. Une partie est « allumée » autour de `centerDeg` (0° = haut, sens horaire,
 * −45° = haut-gauche, 45° = haut-droite), le reste à peine visible.
 */
export function haloOpacities(count, centerDeg, strength = 1) {
  const out = [];
  for (let k = 0; k < count; k++) {
    const a = (k * 360) / count;
    const d = Math.abs(((a - centerDeg + 540) % 360) - 180); // 0 à 180
    const lit = Math.pow(Math.max(0, 1 - d / 80), 1.4);
    out.push((lit * 0.9 + 0.1) * strength);
  }
  return out;
}

/** Délai avant le prochain passage rare : de 40 à 90 s. `rand` ∈ [0,1[ (injectable pour les tests). */
export function nextRareDelayMs(rand = Math.random()) {
  return Math.round(40000 + rand * 50000);
}
