import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadArchives, loadPlanning } from './planning';
import { loadJournal } from './loadJournal';
import {
  adviceForPlanning,
  entriesFromArchives,
  exerciseKey,
  mergeEntries,
  suggestWeight,
} from './loadAdviceShape';

/**
 * Conseil de surcharge progressive : repère un exercice qu'on fait depuis
 * plusieurs séances toujours à la même charge, pour suggérer de monter.
 *
 * Source (depuis 18.13) : le JOURNAL DES CHARGES (lib/loadJournal.js, alimenté
 * automatiquement à chaque séance lancée depuis le Planning) + les archives du
 * Planning (ancien système, toujours comptées). La règle vit dans
 * lib/loadAdviceShape.js (pur, testé) : même charge sur 3 séances de suite,
 * étalées sur au moins une semaine.
 */

export const PROGRESSION_SEEN_KEY = 'flexTimer_progressionSeen';

export { exerciseKey, suggestWeight };

export const loadProgressionSeen = async () => {
  try {
    const raw = await AsyncStorage.getItem(PROGRESSION_SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const markProgressionSuggested = async (key, weight) => {
  if (!key) return;
  try {
    const seen = await loadProgressionSeen();
    seen[key] = { at: Date.now(), weight };
    await AsyncStorage.setItem(PROGRESSION_SEEN_KEY, JSON.stringify(seen));
  } catch {}
};

/**
 * Tous les conseils du moment, lus dans le stockage :
 * `best` (le plus utile, pour la feuille de l'accueil) et `byTagId` (repères sur
 * les étiquettes du Planning et dans la bulle de charge de la séance).
 * Ne lève jamais.
 *
 * Le conseil est réservé à Premium : l'APPELANT décide (`isPremium`), ce module
 * ne lit pas le statut lui-même.
 */
export const findProgressionAdvice = async ({ archives, seen, planning: livePlanning, now = Date.now() } = {}) => {
  try {
    const [journal, arch, planning, seenMap] = await Promise.all([
      loadJournal(),
      archives ? Promise.resolve(archives) : loadArchives(),
      livePlanning ? Promise.resolve(livePlanning) : loadPlanning(),
      seen ? Promise.resolve(seen) : loadProgressionSeen(),
    ]);
    const entries = mergeEntries(journal, entriesFromArchives(arch));
    return adviceForPlanning({ entries, planning, seen: seenMap, now });
  } catch {
    return { best: null, byTagId: {} };
  }
};

/**
 * Retrouve l'étiquette vivante correspondant à une suggestion. On ne se sert
 * pas des identifiants figés dans une ancienne archive : le planning est un
 * modèle qu'on réédite, l'étiquette a pu être supprimée puis recréée (nouvel
 * id). La correspondance se fait donc sur le couple (libellé, groupe).
 *
 * @returns {{ dayKey: string, blockId: string, tagId: string } | null}
 */
export const locateExerciseInPlanning = (planning, { label, category }) => {
  const target = exerciseKey({ label, category });

  for (const dayKey of Object.keys(planning || {})) {
    const day = planning[dayKey];
    for (const block of day?.blocks || []) {
      // Un bloc archivé est verrouillé en lecture seule : y envoyer
      // l'utilisateur pour « ajuster le poids » le mènerait dans un cul-de-sac.
      if (block.archivedAt) continue;
      for (const tag of block.tags || []) {
        if (exerciseKey(tag) === target) {
          return { dayKey, blockId: block.id, tagId: tag.id };
        }
      }
    }
  }
  return null;
};
