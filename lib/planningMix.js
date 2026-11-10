import { getBlockType, getRangesForType, makeBlock } from './mix-blocks';

// Génère un brouillon de MIX à partir d'un bloc du Planning (v15.1.0, carte
// "activable" — voir isBlockLaunchable dans lib/planning.js). Pur : ne touche
// ni AsyncStorage ni TimersContext, l'appelant fait saveCurrentMix() lui-même.

// Petit repos fixe entre deux exercices générés, demandé explicitement par
// l'utilisateur ("le temps de changer de mouvement") plutôt qu'un
// enchaînement direct. Valeur choisie ici, pas précisée par lui — facile à
// ajuster, c'est la seule chose que ce module invente.
export const PLANNING_MIX_REST_SECONDS = 120; // 2 min : le temps de se placer (demande du 02/10/2026)

// Types de chrono qu'une étiquette peut porter dans son timerConfig — jamais
// 'mix' (pas de MIX imbriqué) ni 'rest' (ça n'a pas de sens pour un exercice).
export const PLANNING_TIMER_TYPES = ['amrap', 'basic', 'emom', 'tabata'];

// Cases que chaque type montre dans la fiche d'une étiquette (miroir de
// ExerciseDetailSheet : BASIC n'a ni durée de travail, AMRAP ni repos ni tours).
export const TIMER_FIELDS = {
  amrap: { duration: true, rest: false, rounds: false },
  basic: { duration: false, rest: true, rounds: true },
  emom: { duration: true, rest: false, rounds: true },
  tabata: { duration: true, rest: true, rounds: true },
};

const inList = (list, v) =>
  Number.isFinite(v) && list.length > 0 && v >= list[0] && v <= list[list.length - 1];
const nearestIn = (list, v) =>
  list.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), list[0]);
// La valeur calée sur la grille de la roue, ou null si elle sort de la roue :
// reporter un AMRAP de 20 min en repos de 10 min (le maximum) n'aurait aucun
// sens, mieux vaut alors garder le réglage de départ du type.
const fitTo = (list, v) => (inList(list, v) ? nearestIn(list, v) : null);

/**
 * Réglages de départ d'un chrono quand on CHANGE de type dans la fiche d'une
 * étiquette (v16.8.0) : au lieu de repartir des défauts, on reprend ce que la
 * personne venait de régler.
 *  - même case → même case (repos → repos, tours → tours, durée → durée) ;
 *  - un temps qui n'a pas de case équivalente change de case : le REPOS de
 *    BASIC devient la DURÉE d'AMRAP ou l'INTERVALLE d'EMOM (cases qui n'ont pas
 *    de repos), et inversement la durée d'AMRAP / EMOM devient le repos de
 *    BASIC (case sans durée) ;
 *  - sinon, comme avant : repos et séries de l'exercice, puis défauts du type.
 * Une valeur qui sort de la roue de la case d'arrivée n'est pas reportée.
 *
 * `fromType` / `fromParams` : le type quitté (null si aucun). `rest` / `sets` :
 * repos et séries de l'exercice (musculation). Renvoie
 * `{ duration, rest, rounds }`, ou null si `toType` est inconnu.
 */
export const carryTimerParams = ({ toType, fromType = null, fromParams = null, rest = null, sets = null }) => {
  const type = getBlockType(toType);
  const to = TIMER_FIELDS[toType];
  if (!type || !to) return null;
  const from = fromType && fromParams ? TIMER_FIELDS[fromType] ?? null : null;

  const params = {
    duration: type.defaults.duration ?? 0,
    rest: type.defaults.rest ?? 0,
    rounds: type.defaults.rounds ?? 1,
  };
  const ranges = getRangesForType(toType, params);
  const take = (key, value) => {
    const v = fitTo(ranges[key], value);
    if (v != null) params[key] = v;
  };

  // 1. Ce que dit l'exercice : repos → repos, séries → tours.
  if (to.rest && rest != null) take('rest', rest);
  if (to.rounds && sets != null) params.rounds = sets;

  // 2. Ce que la personne venait de régler pour le type quitté (prioritaire).
  if (from) {
    if (to.duration && from.duration) take('duration', fromParams.duration);
    if (to.rest && from.rest) take('rest', fromParams.rest);
    if (to.rounds && from.rounds) take('rounds', fromParams.rounds);
    if (to.duration && !to.rest && !from.duration && from.rest) take('duration', fromParams.rest);
    if (to.rest && !to.duration && !from.rest && from.duration) take('rest', fromParams.duration);
  }
  return params;
};

// Une étiquette SANS type réglé est quand même incluse (demande explicite de
// l'utilisateur) : elle atterrit dans le Mix Builder comme un bloc BASIC —
// le type le plus neutre ("rythme libre") — à configurer ou à retirer là-bas,
// plutôt que d'être silencieusement ignorée ou de bloquer tout le bloc.
const blockFromTag = (tag, ref) => {
  const cfg = tag?.timerConfig;
  const type = PLANNING_TIMER_TYPES.includes(cfg?.type) ? cfg.type : 'basic';
  const block = makeBlock(type);
  if (!block) return null;
  block.label = tag?.label || block.label;
  // Charge du Planning, seulement pour que la voix l'annonce (jamais éditée ici).
  const w = Number(tag?.weight);
  if (Number.isFinite(w) && w > 0) block.weight = w;
  // D'où vient ce bloc (jour / bloc / étiquette du Planning) : permet de renvoyer
  // vers le Planning la charge saisie pendant la séance. Jamais partagé.
  if (ref && tag?.id) block.planRef = { dayKey: ref.dayKey, blockId: ref.blockId, tagId: tag.id };
  if (cfg?.type) {
    if (typeof cfg.duration === 'number') block.duration = cfg.duration;
    if (typeof cfg.rest === 'number') block.rest = cfg.rest;
    if (typeof cfg.rounds === 'number') block.rounds = cfg.rounds;
  }
  return block;
};

// Grande pause entre deux blocs du Planning quand on lance tous les blocs du
// jour d'un coup : le moment de changer de groupe musculaire / d'exercice.
// Valeur choisie ici (« environ une minute » dans la demande).
export const PLANNING_BLOCK_SEPARATION_SECONDS = 60;
export const PLANNING_BLOCK_SEPARATION_LABEL = 'Séparation de blocs';

// Blocs MIX d'un bloc du Planning (exercices séparés par un petit repos),
// ou [] s'il n'y a rien à générer.
const exerciseBlocksOf = (block, dayKey) => {
  const out = [];
  for (const tag of block?.tags || []) {
    const b = blockFromTag(tag, dayKey ? { dayKey, blockId: block.id } : null);
    if (!b) continue;
    if (out.length > 0) {
      const rest = makeBlock('rest');
      rest.duration = PLANNING_MIX_REST_SECONDS;
      out.push(rest);
    }
    out.push(b);
  }
  return out;
};

/**
 * `{ name, blocks }` prêt pour saveCurrentMix(), ou null si le bloc n'a
 * aucune étiquette (rien à générer). Un repos fixe (PLANNING_MIX_REST_SECONDS)
 * sépare chaque exercice, jamais avant le premier ni après le dernier.
 */
export const buildMixFromBlock = (block, dayKey) => {
  const blocks = exerciseBlocksOf(block, dayKey);
  if (!blocks.length) return null;
  return { name: block.name, blocks };
};

/**
 * Même chose pour plusieurs blocs du Planning d'un coup : entre deux blocs,
 * une « Séparation de blocs » d'une minute (jamais avant le premier ni après
 * le dernier). Les blocs sans rien à générer sont ignorés.
 */
export const buildMixFromBlocks = (planningBlocks, name, dayKey) => {
  const blocks = [];
  for (const pb of planningBlocks || []) {
    const part = exerciseBlocksOf(pb, dayKey);
    if (!part.length) continue;
    if (blocks.length > 0) {
      const sep = makeBlock('rest');
      sep.duration = PLANNING_BLOCK_SEPARATION_SECONDS;
      sep.label = PLANNING_BLOCK_SEPARATION_LABEL;
      blocks.push(sep);
    }
    blocks.push(...part);
  }
  if (!blocks.length) return null;
  return { name: name || 'Séance du jour', blocks };
};
