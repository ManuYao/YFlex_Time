// RÉORGANISER UN MIX EN COURS DE SÉANCE (« machine occupée », salle bondée).
//
// Règles (décision de l'utilisateur, 10/11/2026) :
//  - la réorganisation n'est possible que PENDANT UN REPOS (la « passerelle »), jamais
//    pendant un exercice en cours ;
//  - les exercices déjà faits et l'exercice en cours ne bougent JAMAIS ;
//  - seuls les exercices À VENIR se déplacent : « Faire maintenant » le met en tête,
//    « Reporter à la fin » en queue, les autres glissent d'un cran.
//
// Principe : les blocs REPOS restent à leur place, ce sont les EXERCICES qui changent de
// place entre eux. Un MIX « A · repos · B · repos · C » où l'on passe C en tête donne
// « A · repos · C · repos · B » : la structure (un repos entre deux exercices) est gardée.
// Comme rien n'est modifié avant le bloc courant, la durée écoulée reste exacte pour le
// moteur (lib/timer-engine.js) : il suffit de lui donner la nouvelle liste de blocs, le
// compteur « B 1/10 » et la barre segmentée se recalculent tout seuls.
//
// Pur (aucune dépendance React / natif) : testé en Node.

export const isExerciseBlock = (b) => !!b && b.type !== 'rest';

// Indices (dans `blocks`) des exercices strictement après le bloc courant.
export const upcomingSlots = (blocks, curIdx) => {
  const out = [];
  for (let i = Math.max(-1, curIdx) + 1; i < blocks.length; i++) {
    if (isExerciseBlock(blocks[i])) out.push(i);
  }
  return out;
};

// La réorganisation n'est offerte que pendant un repos de la séance (bloc REPOS d'un MIX
// ou repos entre deux séries d'un exercice), tant que la séance n'est pas finie.
export const canReorderNow = (state) => !!state && !state.isComplete && !!state.isRest;

// Déplace un exercice À VENIR. `where` = 'now' (en tête des exercices à venir) ou 'end'
// (à la fin). Renvoie la MÊME liste (même référence) quand il n'y a rien à changer.
export const moveUpcoming = (blocks, curIdx, blockId, where) => {
  const slots = upcomingSlots(blocks, curIdx);
  const pos = slots.findIndex((i) => blocks[i].id === blockId);
  if (pos < 0 || slots.length < 2) return blocks;
  const exercises = slots.map((i) => blocks[i]);
  const [moved] = exercises.splice(pos, 1);
  if (where === 'now') exercises.unshift(moved);
  else exercises.push(moved);
  if (exercises.every((b, k) => b === blocks[slots[k]])) return blocks;
  const next = blocks.slice();
  slots.forEach((slotIdx, k) => {
    next[slotIdx] = exercises[k];
  });
  return next;
};

// Applique un ordre enregistré (liste d'ids) à la liste d'origine. Tout ce qui ne colle pas
// (id inconnu, doublon, taille différente) → la liste d'origine, jamais un MIX abîmé.
export const applyOrder = (blocks, order) => {
  if (!Array.isArray(order) || order.length !== blocks.length) return blocks;
  const byId = new Map();
  for (const b of blocks) byId.set(b.id, b);
  if (byId.size !== blocks.length) return blocks;
  const out = [];
  const seen = new Set();
  for (const id of order) {
    const b = byId.get(id);
    if (!b || seen.has(id)) return blocks;
    seen.add(id);
    out.push(b);
  }
  return out;
};

export const orderOf = (blocks) => blocks.map((b) => b.id);

export const sameOrder = (a, b) =>
  a.length === b.length && a.every((blk, i) => blk.id === b[i].id);

const MODE_NAMES = { amrap: 'AMRAP', emom: 'EMOM', tabata: 'TABATA', basic: 'BASIC' };

// Nom + détail d'un exercice pour la feuille « Ma séance » (mêmes mots que la carte
// « Ensuite » du chrono).
export const describeBlock = (block) => {
  const typed = (block.label || '').trim();
  const mode = MODE_NAMES[block.type];
  const parts = [];
  if (typed && mode) parts.push(mode);
  const rounds = Math.max(1, block.rounds || 1);
  if (block.type === 'amrap') {
    const seconds = (block.duration || 0) * rounds;
    if (seconds > 0) parts.push(`${Math.max(1, Math.round(seconds / 60))} MIN`);
  } else if (rounds > 1) {
    parts.push(`${rounds} TOURS`);
  }
  if (block.weight > 0) parts.push(`${String(block.weight).replace('.', ',')} KG`);
  return { name: typed || mode || 'Exercice', meta: parts.join(' · ') };
};

// Lignes de la feuille : un exercice par ligne (les repos ne s'affichent pas).
//  done    : validé (coché, grisé, verrouillé)
//  current : en cours (surligné, verrouillé)
//  todo    : à venir (modifiable) ; `isNext` = le prochain
export const buildSessionRows = (blocks, curIdx) => {
  const rows = [];
  let nextMarked = false;
  let n = 0;
  blocks.forEach((b, i) => {
    if (!isExerciseBlock(b)) return;
    n += 1;
    let status = 'todo';
    if (i < curIdx) status = 'done';
    else if (i === curIdx) status = 'current';
    const isNext = status === 'todo' && !nextMarked;
    if (isNext) nextMarked = true;
    rows.push({ id: b.id, n, status, isNext, lastTodo: false, ...describeBlock(b) });
  });
  // Le dernier exercice à venir : « Reporter à la fin » n'aurait aucun effet.
  for (let k = rows.length - 1; k >= 0; k--) {
    if (rows[k].status === 'todo') {
      rows[k].lastTodo = true;
      break;
    }
  }
  return rows;
};
