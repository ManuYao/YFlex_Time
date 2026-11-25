// Faits mémorisés pour les trophées (v2, 18.16.0) : ce qui ne se retrouve PAS dans
// l'historique des séances. Données LOCALES (rien n'est envoyé nulle part), purgées par la
// réinitialisation complète (app/settings.js).
//
//   flags     : un événement unique et sa date (mix publié, lien envoyé, conseil suivi…)
//   marks     : des paliers atteints par une quantité qui peut redescendre (mix créés,
//               pesées) : on garde la date du franchissement, la suppression d'un mix
//               ou d'une pesée n'enlève donc rien
//   exercises : les exercices nommés dans les MIX menés jusqu'au bout (clé → nom + date)
//
// Toutes les opérations passent les unes derrière les autres (une lecture-écriture à la
// fois) et ne lèvent JAMAIS : un souci ici ne doit jamais gêner un écran.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { computeSessionStats } from './timer-engine';
import { addExercises, normalizeFacts } from './trophies';
import { TROPHY_BY_ID } from './trophyCatalog';

export const TROPHY_FACTS_KEY = 'flexTimer_trophyFacts';

let chain = Promise.resolve();
const enqueue = (op) => {
  const run = chain.then(op);
  chain = run.catch(() => {});
  return run;
};

const read = async () => {
  try {
    const raw = await AsyncStorage.getItem(TROPHY_FACTS_KEY);
    return normalizeFacts(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeFacts(null);
  }
};

const write = async (facts) => {
  try {
    await AsyncStorage.setItem(TROPHY_FACTS_KEY, JSON.stringify(facts));
  } catch {}
};

/** Les faits tels qu'ils sont (après les écritures déjà en cours). */
export const loadTrophyFacts = () => enqueue(read).catch(() => normalizeFacts(null));

/**
 * Lit les faits, applique `fn(facts) → { facts, changed }`, écrit si besoin, rend les
 * faits obtenus. Une seule fois à la fois : deux mises à jour proches ne s'écrasent pas.
 */
export const mutateTrophyFacts = (fn) =>
  enqueue(async () => {
    const current = await read();
    try {
      const res = fn(current);
      if (res?.changed) await write(res.facts);
      return res?.facts || current;
    } catch {
      return current;
    }
  }).catch(() => normalizeFacts(null));

/** Note qu'un événement a eu lieu (une seule fois, la première date est gardée). */
export const recordTrophyFlag = (name) => {
  if (!TROPHY_BY_ID[name]) return Promise.resolve();
  return mutateTrophyFacts((facts) => {
    if (facts.flags[name]) return { facts, changed: false };
    const next = normalizeFacts(facts);
    next.flags[name] = new Date().toISOString();
    return { facts: next, changed: true };
  }).then(() => undefined);
};

/** Note les exercices nommés (un exercice n'est gardé qu'une fois). */
export const recordTrophyExercises = (names) =>
  mutateTrophyFacts((facts) => addExercises(facts, names)).then(() => undefined);

/**
 * Après une séance : les exercices d'un MIX menés jusqu'au bout rejoignent la collection
 * (trophée « Collectionneur »). Même repère que le journal des charges
 * (lib/loadJournal.js recordPlannedLoads) : `timer` = le MIX dans l'ordre réellement joué.
 */
export const recordSessionFacts = async ({ timer, elapsed, ctx }) => {
  try {
    if (timer?.id !== 'mix') return;
    const blocks = timer._mix?.blocks || [];
    const done = new Set(computeSessionStats(timer, elapsed, ctx).doneBlockIds || []);
    const names = blocks
      .filter((b) => b && b.type !== 'rest' && done.has(b.id))
      .map((b) => b.label)
      .filter(Boolean);
    if (names.length) await recordTrophyExercises(names);
  } catch {}
};

/**
 * Appelée avec MES mix publiés (lib/publicMixes.js fetchMyPublishedMixes) : un mix en ligne
 * = « Sur scène », et un mix à 4,5 étoiles avec au moins 3 avis = « Apprécié ».
 */
export const noteMyPublishedMixes = (items) => {
  try {
    if (!Array.isArray(items) || !items.length) return;
    recordTrophyFlag('stage');
    if (items.some((m) => Number(m?.ratingAvg) >= 4.5 && Number(m?.ratingCount) >= 3)) {
      recordTrophyFlag('liked');
    }
  } catch {}
};
