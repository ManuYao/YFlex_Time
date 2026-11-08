// Corps cliquable du planning (« Nouveau bloc ») : quelle zone du dessin
// appartient à quel groupe musculaire, et le nom de bloc qu'on en déduit.
// PUR (aucun import React Native) : testable en Node.
//
// Les zones du dessin (lib/bodyMapPaths.js) ont leurs propres noms anglais
// (« slug »). On les range dans NOS groupes (CATEGORIES de lib/exercises.js),
// jamais l'inverse : le planning, ses couleurs et ses statistiques continuent
// de ne connaître que ces groupes. Toucher une zone allume tout son groupe
// (toucher les pecs allume aussi les triceps, toucher une cuisse allume aussi
// les fessiers : demande de l'utilisateur, 08/11/2026).

export const SLUG_GROUP = {
  chest: 'pecs',
  triceps: 'pecs',
  biceps: 'dos',
  trapezius: 'dos',
  'upper-back': 'dos',
  'lower-back': 'dos',
  deltoids: 'epaules',
  abs: 'abdos',
  obliques: 'abdos',
  quadriceps: 'jambes',
  adductors: 'jambes',
  hamstring: 'jambes',
  gluteal: 'jambes',
  calves: 'jambes',
  tibialis: 'jambes',
};

// Groupes dessinés sur le corps. Les autres (Cardio, groupes perso) se
// choisissent en pastilles sous le dessin : ce ne sont pas des muscles.
export const BODY_GROUP_IDS = ['pecs', 'dos', 'epaules', 'abdos', 'jambes'];

export const groupOfSlug = (slug) => SLUG_GROUP[slug] ?? null;

// Nom complet (un seul groupe) et nom court (plusieurs groupes). Un groupe
// perso n'a que son libellé, stocké en MAJUSCULES : on le remet en casse de
// phrase (« HAUT DU CORPS » → « Haut du corps »).
const NAMES = {
  pecs: { full: 'Pecs / triceps', short: 'Pecs' },
  dos: { full: 'Dos / biceps', short: 'Dos' },
  jambes: { full: 'Jambes', short: 'Jambes' },
  epaules: { full: 'Épaules', short: 'Épaules' },
  abdos: { full: 'Abdos', short: 'Abdos' },
  cardio: { full: 'Cardio', short: 'Cardio' },
};

const sentenceCase = (label) => {
  const s = String(label ?? '').trim().toLocaleLowerCase('fr-FR');
  return s ? s.charAt(0).toLocaleUpperCase('fr-FR') + s.slice(1) : '';
};

// Même limite que le champ du nom (BlockSheet, maxLength).
export const BLOCK_NAME_MAX = 28;
export const WHOLE_BODY_NAME = 'Corps entier';

/**
 * Nom de bloc proposé pour une sélection de groupes, dans l'ordre où ils ont
 * été touchés. `labelOf(id)` donne le libellé d'un groupe perso. Un groupe :
 * nom complet ; plusieurs : noms courts reliés par « + » ; trop long pour le
 * champ : « Corps entier ». Rien de choisi : chaîne vide.
 */
export const blockNameFromGroups = (ids, labelOf = () => '') => {
  const list = (ids || []).filter(Boolean);
  if (!list.length) return '';
  const nameOf = (id, key) => NAMES[id]?.[key] ?? sentenceCase(labelOf(id));
  if (list.length === 1) return nameOf(list[0], 'full').slice(0, BLOCK_NAME_MAX);
  const joined = list.map((id) => nameOf(id, 'short')).filter(Boolean).join(' + ');
  return joined.length > BLOCK_NAME_MAX ? WHOLE_BODY_NAME : joined;
};

/** Ajoute le groupe s'il n'y est pas, le retire sinon (l'ordre est gardé). */
export const toggleGroup = (ids, id) =>
  (ids || []).includes(id) ? ids.filter((x) => x !== id) : [...(ids || []), id];
