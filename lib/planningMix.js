import { makeBlock } from './mix-blocks';

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

// Une étiquette SANS type réglé est quand même incluse (demande explicite de
// l'utilisateur) : elle atterrit dans le Mix Builder comme un bloc BASIC —
// le type le plus neutre ("rythme libre") — à configurer ou à retirer là-bas,
// plutôt que d'être silencieusement ignorée ou de bloquer tout le bloc.
const blockFromTag = (tag) => {
  const cfg = tag?.timerConfig;
  const type = PLANNING_TIMER_TYPES.includes(cfg?.type) ? cfg.type : 'basic';
  const block = makeBlock(type);
  if (!block) return null;
  block.label = tag?.label || block.label;
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
const exerciseBlocksOf = (block) => {
  const out = [];
  for (const tag of block?.tags || []) {
    const b = blockFromTag(tag);
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
export const buildMixFromBlock = (block) => {
  const blocks = exerciseBlocksOf(block);
  if (!blocks.length) return null;
  return { name: block.name, blocks };
};

/**
 * Même chose pour plusieurs blocs du Planning d'un coup : entre deux blocs,
 * une « Séparation de blocs » d'une minute (jamais avant le premier ni après
 * le dernier). Les blocs sans rien à générer sont ignorés.
 */
export const buildMixFromBlocks = (planningBlocks, name) => {
  const blocks = [];
  for (const pb of planningBlocks || []) {
    const part = exerciseBlocksOf(pb);
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
