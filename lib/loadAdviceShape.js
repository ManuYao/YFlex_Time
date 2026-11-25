/**
 * Journal des charges + règle du conseil « tu peux monter » (PUR : ni React ni
 * stockage, testé en Node — voir lib/loadJournal.js et lib/progression.js).
 *
 * Pourquoi un journal : avant, le conseil ne lisait que les archives du Planning
 * (archivage manuel d'un jour ou d'un bloc). Quelqu'un qui n'archive pas n'avait
 * jamais de conseil. Maintenant, chaque exercice du Planning réellement fait
 * dans une séance laisse une ligne datée (une par exercice et par jour).
 *
 * Forme d'une ligne (stable, prête à être synchronisée plus tard avec Supabase :
 * `key` + `day` identifient la ligne, un envoi = un « upsert » sans doublon) :
 *   { key, label, category, weight, day }   day = 'AAAA-MM-JJ' (jour LOCAL)
 *
 * Place : ~100 octets par ligne, plafonnée à KEEP_MAX lignes et KEEP_DAYS jours
 * (soit moins de 60 Ko au pire). Rien ne grossit sans limite.
 */

export const LOAD_JOURNAL_VERSION = 1;

// Mémoire du journal : assez pour juger une stagnation, pas plus.
export const KEEP_DAYS = 120;
export const KEEP_MAX = 600;

// La règle (décision de l'utilisateur, 18/11/2026) : MÊME charge sur 3 séances de
// suite, étalées sur au moins une semaine (3 séances collées sur 3 jours de
// suite ne prouvent pas qu'on s'est adapté).
export const STREAK_MIN = 3;
export const STREAK_MIN_SPAN_DAYS = 6;
// Reprise après une longue pause : la dernière séance doit être récente, sinon
// monter n'est pas le bon conseil (voir l'idée « baisser la charge » du CLAUDE.md).
export const STALE_AFTER_DAYS = 21;
// Un conseil refusé ne revient qu'après 2 nouvelles séances à la même charge.
export const RESUGGEST_NEW_SESSIONS = 2;

// Pas du sélecteur de charge (range(0, 200, 2.5)) : une suggestion hors grille
// serait impossible à appliquer telle quelle.
export const WEIGHT_STEP = 2.5;
export const WEIGHT_MAX = 200;

const DAY_MS = 86400000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

export const exerciseKey = ({ label, category }) =>
  `${category ?? '_none'}::${normalize(label)}`;

const pad = (n) => String(n).padStart(2, '0');

// Jour LOCAL d'un instant : une séance faite à 23 h 50 reste dans sa journée.
export const dayOf = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Numéro de jour (comparable, sans heure d'été) d'un 'AAAA-MM-JJ'.
const dayIndex = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
};

/**
 * Charge conseillée : environ +5 %, ramenée sur la grille de 2,5 kg, et toujours
 * au moins un cran au-dessus (sur une charge légère +5 % retomberait sur la
 * valeur actuelle).
 */
export const suggestWeight = (weight) => {
  const stepped = Math.round((weight * 1.05) / WEIGHT_STEP) * WEIGHT_STEP;
  const next = Math.max(stepped, weight + WEIGHT_STEP);
  return Math.min(Math.round(next * 10) / 10, WEIGHT_MAX);
};

const validEntry = (e) =>
  e &&
  typeof e.key === 'string' &&
  e.key.length > 0 &&
  typeof e.label === 'string' &&
  Number.isFinite(e.weight) &&
  e.weight > 0 &&
  e.weight <= WEIGHT_MAX &&
  typeof e.day === 'string' &&
  DAY_RE.test(e.day);

// Une ligne par (exercice, jour) : la plus récente dans la liste l'emporte.
const dedupe = (list) => {
  const byId = new Map();
  list.forEach((e) => byId.set(`${e.key}@${e.day}`, e));
  return [...byId.values()];
};

// Relecture du stockage : tout ce qui n'a pas la bonne forme est jeté sans bruit.
export const sanitizeEntries = (raw) => {
  if (!Array.isArray(raw)) return [];
  const clean = raw
    .filter(validEntry)
    .map((e) => ({
      key: e.key,
      label: e.label.slice(0, 60),
      category: typeof e.category === 'string' ? e.category : null,
      weight: Math.round(e.weight * 10) / 10,
      day: e.day,
    }));
  return dedupe(clean);
};

// Quand le journal est plein : on efface les lignes les PLUS ANCIENNES, mais jamais les
// PROTECT_LATEST dernières lignes de chaque exercice (ce sont elles qui font la série de
// séances à la même charge : les perdre casserait le conseil d'un exercice fait rarement).
const PROTECT_LATEST = STREAK_MIN;

// Plafonne : jours trop anciens retirés, puis, si ça dépasse KEEP_MAX lignes, les plus anciennes
// non protégées. Dans le cas absurde où les lignes protégées dépassent à elles seules KEEP_MAX,
// on retombe sur « les KEEP_MAX plus récentes ».
export const pruneEntries = (list, now = Date.now()) => {
  const today = dayIndex(dayOf(now));
  const recent = list.filter((e) => today - dayIndex(e.day) <= KEEP_DAYS);
  recent.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  if (recent.length <= KEEP_MAX) return recent;

  const protectedAt = new Set();
  const perKey = new Map();
  for (let i = recent.length - 1; i >= 0; i--) {
    const n = perKey.get(recent[i].key) || 0;
    if (n < PROTECT_LATEST) {
      protectedAt.add(i);
      perKey.set(recent[i].key, n + 1);
    }
  }
  let toDrop = recent.length - KEEP_MAX;
  const kept = [];
  recent.forEach((e, i) => {
    if (toDrop > 0 && !protectedAt.has(i)) {
      toDrop--;
      return;
    }
    kept.push(e);
  });
  return kept.length > KEEP_MAX ? kept.slice(kept.length - KEEP_MAX) : kept;
};

// Ajoute les exercices faits aujourd'hui (même exercice + même jour : remplacé).
export const addEntries = (list, items, now = Date.now()) => {
  const day = dayOf(now);
  const added = (items || [])
    .map((it) => ({
      key: exerciseKey(it),
      label: String(it?.label ?? '').trim(),
      category: it?.category ?? null,
      weight: Number(it?.weight),
      day,
    }))
    .filter(validEntry);
  return pruneEntries(dedupe([...(list || []), ...added]), now);
};

/**
 * Les archives du Planning comptent aussi comme des séances (ancien système) :
 * celui qui archivait déjà n'a rien à refaire.
 */
export const entriesFromArchives = (archives) => {
  const out = [];
  (archives || []).forEach((entry) => {
    const at = new Date(entry?.date).getTime();
    if (Number.isNaN(at)) return;
    const day = dayOf(at);
    (entry.blocks || []).forEach((block) => {
      (block.tags || []).forEach((tag) => {
        const weight = Number(tag?.weight);
        const e = {
          key: exerciseKey(tag),
          label: String(tag?.label ?? '').trim(),
          category: tag?.category ?? null,
          weight,
          day,
        };
        if (validEntry(e)) out.push(e);
      });
    });
  });
  return out;
};

// Journal d'abord : à jour égale (même exercice, même jour) c'est lui qui gagne.
export const mergeEntries = (journal, archived) => dedupe([...(archived || []), ...(journal || [])]);

/**
 * Le conseil pour UN exercice, ou null.
 * @param entries      lignes (journal fusionné avec les archives)
 * @param key          exerciseKey de l'exercice
 * @param seen         { [key]: { at, weight } } : conseils déjà refusés/vus
 * @param currentWeight  charge actuelle dans le Planning, si on la connaît : une
 *                       charge déjà montée = déjà en train de progresser.
 */
export const adviceForKey = (entries, key, { seen = {}, now = Date.now(), currentWeight = null } = {}) => {
  const mine = entries.filter((e) => e.key === key).sort((a, b) => (a.day < b.day ? -1 : 1));
  if (mine.length < STREAK_MIN) return null;

  const last = mine[mine.length - 1];
  const today = dayIndex(dayOf(now));
  // Pas de conseil après une longue pause (ni pour une ligne « du futur »).
  const sinceLast = today - dayIndex(last.day);
  if (sinceLast > STALE_AFTER_DAYS || sinceLast < 0) return null;

  // Série en cours : les séances les plus récentes à la MÊME charge.
  let start = mine.length - 1;
  while (start > 0 && mine[start - 1].weight === last.weight) start--;
  const streak = mine.slice(start);
  if (streak.length < STREAK_MIN) return null;
  const spanDays = dayIndex(last.day) - dayIndex(streak[0].day);
  if (spanDays < STREAK_MIN_SPAN_DAYS) return null;

  // Déjà monté dans le Planning depuis la dernière séance : rien à conseiller.
  if (currentWeight != null && Number(currentWeight) !== last.weight) return null;

  // Au plafond de la roue de charge (WEIGHT_MAX) : il n'y a rien au-dessus à proposer.
  const suggested = suggestWeight(last.weight);
  if (suggested <= last.weight) return null;

  const mark = seen[key];
  if (mark && Number.isFinite(mark.weight) && mark.weight === last.weight) {
    const markDay = dayIndex(dayOf(mark.at ?? 0));
    const fresh = streak.filter((e) => dayIndex(e.day) > markDay).length;
    if (fresh < RESUGGEST_NEW_SESSIONS) return null;
  }

  return {
    key,
    label: last.label,
    category: last.category,
    weight: last.weight,
    suggested,
    count: streak.length,
    weeks: Math.max(1, Math.round(spanDays / 7)),
    since: new Date(`${streak[0].day}T12:00:00`).getTime(),
    lastDay: last.day,
  };
};

/**
 * Tous les conseils pour le Planning vivant. On ne conseille que les exercices
 * encore présents dans un bloc non archivé (sinon « Ajuster » n'a nulle part où
 * aller), et la charge actuelle de l'étiquette sert de garde-fou.
 *
 * @returns {{ best: object|null, byTagId: Object<string, object> }}
 *   `best` = le plus utile pour la feuille de l'accueil (le plus récemment fait,
 *   puis le plus long à stagner) ; `byTagId` = repères sur les étiquettes et dans
 *   la bulle de charge de la séance.
 */
export const adviceForPlanning = ({ entries, planning, seen = {}, now = Date.now() }) => {
  const byTagId = {};
  const perKey = new Map();
  Object.values(planning || {}).forEach((day) => {
    if (!day || day.archivedAt) return;
    (day.blocks || []).forEach((block) => {
      if (block.archivedAt) return;
      (block.tags || []).forEach((tag) => {
        const key = exerciseKey(tag);
        if (!perKey.has(key)) {
          const w = Number(tag?.weight);
          perKey.set(
            key,
            adviceForKey(entries, key, {
              seen,
              now,
              currentWeight: Number.isFinite(w) && w > 0 ? w : null,
            })
          );
        }
        const advice = perKey.get(key);
        if (advice) byTagId[tag.id] = advice;
      });
    });
  });

  const all = [...perKey.values()].filter(Boolean);
  all.sort((a, b) => (a.lastDay < b.lastDay ? 1 : a.lastDay > b.lastDay ? -1 : b.count - a.count || a.since - b.since));
  return { best: all[0] || null, byTagId };
};
