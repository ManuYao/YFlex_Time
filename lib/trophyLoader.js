// Lit tout ce qu'il faut pour calculer les trophées (v2, 18.16.0), puis appelle le moteur
// pur (lib/trophies.js). C'est la SEULE porte d'entrée de l'appli : le Profil, la page
// Trophées, l'écran de fin de séance et les annonces passent toutes par ici, donc tous
// montrent exactement les mêmes trophées.
//
// Ne lève jamais : une source illisible vaut « rien », le reste se calcule quand même.
import { loadHistory } from './history';
import { loadLibrary } from './mixes';
import { isDownloaded } from './libraryLimits';
import { loadBodyWeights } from './bodyWeight';
import { loadPlanning } from './planning';
import { loadJournal } from './loadJournal';
import { loadSeenSeasons } from './seasonRecapState';
import { loadScores } from './gameScores';
import { loadPyramidScores } from './gamePyramidScores';
import { loadComboScores } from './gameComboStore';
import { buildGamePlays } from './gameStats';
import { mutateTrophyFacts } from './trophyFacts';
import { evaluateTrophies, reconcileFacts, collectExercises } from './trophies';

const safe = async (fn, fallback) => {
  try {
    const value = await fn();
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

// Une charge notée quelque part dans le Planning ?
const planningHasLoad = (planning) => {
  try {
    for (const day of Object.values(planning || {})) {
      for (const block of day?.blocks || []) {
        for (const tag of block?.tags || []) {
          if (Number(tag?.weight) > 0) return true;
        }
      }
    }
  } catch {}
  return false;
};

/**
 * Les trophées d'aujourd'hui : { list, byId, unlockedCount, total, counts, next, recent… }
 * (voir evaluateTrophies). `sessions` = l'historique déjà lu par l'écran, pour ne pas le
 * relire ; sans lui il est lu ici.
 */
export const loadTrophyEvaluation = async ({ sessions: given } = {}) => {
  const now = Date.now();
  const [sessions, library, weights, planning, journal, seasons, scores, pyramid, combo] = await Promise.all([
    Array.isArray(given) ? given : safe(loadHistory, []),
    safe(loadLibrary, []),
    safe(loadBodyWeights, []),
    safe(loadPlanning, {}),
    safe(loadJournal, []),
    safe(loadSeenSeasons, []),
    safe(loadScores, []),
    safe(loadPyramidScores, []),
    safe(loadComboScores, []),
  ]);

  const createdCount = (Array.isArray(library) ? library : []).filter((m) => m && !isDownloaded(m)).length;
  const state = {
    createdCount,
    weighCount: Array.isArray(weights) ? weights.length : 0,
    hasLoad: (Array.isArray(journal) && journal.length > 0) || planningHasLoad(planning),
    hasPublished: (Array.isArray(library) ? library : []).some((m) => m?.publishedId),
    hasRecap: Array.isArray(seasons) && seasons.length > 0,
  };

  // Les faits qui se déduisent d'aujourd'hui (mix créés, pesées, charge, bilan…) sont
  // notés une fois pour toutes, avec la date où on les remarque.
  const facts = await mutateTrophyFacts((current) => reconcileFacts(current, state, now));

  return evaluateTrophies({
    sessions,
    gamePlays: buildGamePlays({ count: scores, pyramid, combo }),
    exercises: collectExercises({ facts, sessions, journal }),
    createdCount: state.createdCount,
    weighCount: state.weighCount,
    facts,
    now,
  });
};
