import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Détection de surcharge progressive : repère un exercice que l'utilisateur
 * répète depuis des semaines sans jamais toucher à la charge, pour lui
 * suggérer de monter.
 *
 * La seule trace d'un exercice réellement fait est `flexTimer_planningArchives`
 * (lib/planning.js) : archiver un jour ou un bloc y fige une copie datée des
 * étiquettes, charge comprise. Le planning vivant, lui, est un modèle de
 * semaine qu'on rouvre — il ne dit rien de ce qui a été fait, ni quand. Aucun
 * compteur supplémentaire n'est persisté : tout se recalcule depuis les
 * archives existantes.
 */

export const PROGRESSION_SEEN_KEY = 'flexTimer_progressionSeen';

const DAY_MS = 86400000;

// Fenêtre d'observation et seuils. Le brief demandait « 8 à 10 séances sur un
// mois / 3 semaines régulières » : les deux conditions sont exigées ensemble,
// sinon 8 séances tassées sur une seule grosse semaine déclencheraient un
// conseil de progression que rien ne justifie.
const WINDOW_DAYS = 30;
const MIN_OCCURRENCES = 8;
const MIN_DISTINCT_WEEKS = 3;

// Une suggestion ignorée ne revient pas avant deux semaines : le temps de
// faire quelques séances de plus, donc d'avoir une vraie raison de reposer la
// question. Sans ce délai, la feuille reviendrait à chaque lancement.
const RESUGGEST_AFTER_DAYS = 14;

// Pas du sélecteur de charge (components/common/ExerciseDetailSheet.js :
// range(0, 200, 2.5)). Une suggestion hors de cette grille serait impossible
// à appliquer telle quelle dans la molette.
const WEIGHT_STEP = 2.5;
const WEIGHT_MAX = 200;

const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

export const exerciseKey = ({ label, category }) =>
  `${category ?? '_none'}::${normalize(label)}`;

// Lundi 00:00 de la semaine contenant `date`, en millisecondes — sert de
// numéro de semaine. `getDay()` place dimanche à 0, d'où le ramène-à-7 (même
// conversion que isoOf() dans lib/planning.js).
const weekStamp = (date) => {
  const iso = date.getDay() === 0 ? 7 : date.getDay();
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - (iso - 1));
  return monday.getTime();
};

/**
 * Charge conseillée : environ +5 %, ramené sur la grille de 2,5 kg du
 * sélecteur, et toujours au moins un cran au-dessus — sur une charge légère,
 * +5 % arrondi retomberait sur la valeur actuelle et la suggestion ne
 * voudrait plus rien dire.
 */
export const suggestWeight = (weight) => {
  const stepped = Math.round((weight * 1.05) / WEIGHT_STEP) * WEIGHT_STEP;
  const next = Math.max(stepped, weight + WEIGHT_STEP);
  return Math.min(Math.round(next * 10) / 10, WEIGHT_MAX);
};

/**
 * Aplatit les archives en occurrences d'exercices sur la fenêtre observée.
 * Seules les étiquettes portant une charge chiffrée comptent : conseiller
 * d'alourdir un gainage ou une course n'a pas de sens.
 */
const collectOccurrences = (archives, now) => {
  const from = now - WINDOW_DAYS * DAY_MS;
  const groups = new Map();

  (archives || []).forEach((entry) => {
    const date = new Date(entry?.date);
    const at = date.getTime();
    if (isNaN(at) || at < from || at > now) return;

    (entry.blocks || []).forEach((block) => {
      (block.tags || []).forEach((tag) => {
        const weight = Number(tag?.weight);
        if (!Number.isFinite(weight) || weight <= 0) return;

        const key = exerciseKey(tag);
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            label: tag.label,
            category: tag.category,
            occurrences: [],
          });
        }
        groups.get(key).occurrences.push({ at, weight, week: weekStamp(date) });
      });
    });
  });

  return groups;
};

/**
 * @returns {{
 *   key: string, label: string, category: string, weight: number,
 *   suggested: number, count: number, weeks: number, since: number
 * } | null}
 */
export const findProgressionSuggestion = ({ archives, seen = {}, now = Date.now() }) => {
  const groups = collectOccurrences(archives, now);
  const candidates = [];

  groups.forEach((group) => {
    const { occurrences } = group;
    if (occurrences.length < MIN_OCCURRENCES) return;
    if (new Set(occurrences.map((o) => o.week)).size < MIN_DISTINCT_WEEKS) return;

    const sorted = [...occurrences].sort((a, b) => a.at - b.at);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // Déjà en train de progresser : la charge la plus récente dépasse la plus
    // ancienne de la fenêtre. Rien à conseiller, il le fait déjà.
    if (last.weight > first.weight) return;

    const mark = seen[group.key];
    if (mark) {
      // La charge a bougé depuis le dernier conseil : la marque ne vaut plus
      // rien, on repart d'une page blanche pour cet exercice.
      const moved = Number.isFinite(mark.weight) && last.weight !== mark.weight;
      const recent = now - (mark.at ?? 0) < RESUGGEST_AFTER_DAYS * DAY_MS;
      if (!moved && recent) return;
    }

    candidates.push({
      key: group.key,
      label: group.label,
      category: group.category,
      weight: last.weight,
      suggested: suggestWeight(last.weight),
      count: occurrences.length,
      weeks: new Set(occurrences.map((o) => o.week)).size,
      since: first.at,
    });
  });

  if (!candidates.length) return null;

  // Le plus répété d'abord ; à égalité, celui qui stagne depuis le plus
  // longtemps — c'est là que le conseil a le plus de valeur.
  candidates.sort((a, b) => b.count - a.count || a.since - b.since);
  return candidates[0];
};

/**
 * Retrouve l'étiquette vivante correspondant à une suggestion. On ne se sert
 * pas des identifiants figés dans l'archive : le planning est un modèle qu'on
 * réédite, l'étiquette a pu être supprimée puis recréée (nouvel id) entre
 * l'archivage et aujourd'hui. La correspondance se fait donc sur le couple
 * (libellé, groupe), comme le regroupement des occurrences.
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
