// Moteur des trophées (v2, 18.16.0) : calcule, à partir de l'historique et de quelques
// « faits » mémorisés, quels trophées sont gagnés, où en est chacun et QUAND il a été
// gagné. Module PUR (aucun import React Native, aucun stockage) : testable en Node.
// Les lectures de stockage sont dans lib/trophyLoader.js, les écritures de faits dans
// lib/trophyFacts.js.
//
// Principe (comme les 15 trophées de mode d'origine) : tout est DÉRIVÉ. On rejoue
// l'historique du plus ancien au plus récent ; chaque trophée suit une valeur qui ne fait
// que monter (un compteur, un record, une série) et on note la date où elle franchit
// chaque palier. Un trophée de série (Flamme, Semaines solides) compte la MEILLEURE série,
// jamais la série en cours : il reste gagné même si la série s'arrête ensuite.
//
// Ce qui ne se retrouve pas dans l'historique (mix créés, mix publié, lien envoyé, charge
// notée, conseil suivi, pesées, bilan ouvert) passe par `facts` : des dates posées une
// seule fois, qui ne disparaissent pas si on supprime ensuite le mix ou la pesée.
//
// Qu'est-ce qui compte (décision du 19/11/2026) :
//   - « activité » = toute entrée de l'historique non annulée, parties de jeu comprises :
//     temps, jours actifs, série, retour après pause, saisons ;
//   - « séance de chrono » = les autres : modes, MIX, exploits, Triple, Semaines solides,
//     secrets, plus longue séance. Un jeu n'est pas un mode (règle de lib/history.js).
import { BADGE_TIERS } from './badges.js';
import { sessionWorkSeconds } from './profileStats.js';
import { TROPHIES, MODE_IDS, UNIQUE_TIER, medalLabel } from './trophyCatalog.js';

const DAY_MS = 86400000;

const startOfDay = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
// Numéro de jour (comparable) et de semaine (la semaine commence le lundi).
const dayIdx = (ms) => Math.round(startOfDay(ms) / DAY_MS);
const weekIdx = (day) => Math.floor((day + 3) / 7);
// 0 printemps (mars-mai), 1 été, 2 automne, 3 hiver (déc.-fév.).
const seasonOf = (month) => (month >= 2 && month <= 4 ? 0 : month >= 5 && month <= 7 ? 1 : month >= 8 && month <= 10 ? 2 : 3);

const addMonths = (ms, n) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate(), d.getHours(), d.getMinutes()).getTime();
};
const monthsSince = (fromMs, toMs) => {
  const a = new Date(fromMs);
  const b = new Date(toMs);
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return Math.max(0, m);
};

// Une séance de chrono est « terminée » quand tous ses tours / blocs sont faits.
const isComplete = (s) =>
  Number.isFinite(s?.completedRounds) &&
  Number.isFinite(s?.totalRounds) &&
  s.totalRounds > 0 &&
  s.completedRounds >= s.totalRounds;

// Pour un MIX : nombre de blocs d'exercice (repos exclus) et de types de blocs différents.
const BLOCK_TYPES = ['amrap', 'emom', 'tabata', 'basic'];
const mixShape = (s) => {
  const b = s?.blockBreakdown;
  if (!b || typeof b !== 'object') return { blocks: 0, types: 0 };
  let blocks = 0;
  let types = 0;
  for (const [k, n] of Object.entries(b)) {
    if (!(n > 0) || k === 'rest') continue;
    blocks += n;
    if (BLOCK_TYPES.includes(k)) types += 1;
  }
  return { blocks, types };
};

/* ───────────────────────── Suivi d'une valeur qui ne fait que monter ───────────────────────── */

// Palier : on donne la valeur atteinte et l'instant, on retient la date où chaque seuil a
// été franchi pour la première fois.
const tierTracker = (thresholds) => {
  const at = thresholds.map(() => null);
  let value = 0;
  return {
    feed(v, t) {
      if (v > value) value = v;
      for (let i = 0; i < thresholds.length; i += 1) {
        if (at[i] == null && value >= thresholds[i]) at[i] = t;
      }
    },
    result: () => ({ value, at }),
  };
};

// Exploit : une seule cible (1 par défaut, ou `target` pour les trophées qui avancent).
const counterTracker = (target) => {
  let value = 0;
  let at = null;
  return {
    feed(v, t) {
      if (v > value) value = v;
      if (at == null && value >= target) at = t;
    },
    result: () => ({ value, at }),
  };
};

/* ───────────────────────── Faits mémorisés ───────────────────────── */

export const EMPTY_FACTS = { v: 1, flags: {}, marks: {}, exercises: {} };

const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

// Copie propre (jamais la même référence : on peut la modifier sans toucher l'original).
export const normalizeFacts = (raw) => ({
  v: 1,
  // true une fois le PREMIER passage de reconcileFacts fait : ce qui est trouvé à ce moment-là
  // s'est passé AVANT (date inconnue) ; ensuite, ce qu'on remarque est vraiment nouveau.
  seeded: !!raw?.seeded,
  flags: { ...asObject(raw?.flags) },
  marks: Object.fromEntries(Object.entries(asObject(raw?.marks)).map(([k, m]) => [k, { ...asObject(m) }])),
  exercises: Object.fromEntries(Object.entries(asObject(raw?.exercises)).map(([k, e]) => [k, { ...asObject(e) }])),
});

const isoToMs = (iso) => {
  const t = typeof iso === 'string' ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : null;
};

const UNKNOWN_DATE = new Date(0).toISOString();

const ARCHITECT = TROPHIES.find((t) => t.id === 'architect');
const WEIGH_IN = TROPHIES.find((t) => t.id === 'weighIn');

/**
 * Pose les faits qui se déduisent de l'état actuel (mix créés, pesées, charge, publication,
 * bilan), UNE seule fois chacun : la date est celle où on les remarque pour la première
 * fois. Rend { facts, changed } ; `changed` dit s'il y a quelque chose à écrire.
 */
export const reconcileFacts = (
  rawFacts,
  { createdCount = 0, weighCount = 0, hasLoad = false, hasPublished = false, hasRecap = false } = {},
  now = Date.now()
) => {
  const facts = normalizeFacts(rawFacts);
  // Date inconnue = l'instant 0 (1970) : l'affichage n'écrit alors AUCUNE date, plutôt que
  // « aujourd'hui » pour une charge notée il y a des semaines (retour de l'utilisateur, 20/11).
  const iso = facts.seeded ? new Date(now).toISOString() : UNKNOWN_DATE;
  let changed = false;
  if (!facts.seeded) {
    // Les faits écrits par la 18.16.0 avant ce réglage portent la date où on les a remarqués :
    // fausse, on la remplace par « inconnue ».
    for (const name of ['firstLoad', 'firstRecap']) {
      if (facts.flags[name]) facts.flags[name] = UNKNOWN_DATE;
    }
    for (const id of ['architect', 'weighIn']) {
      for (const k of Object.keys(facts.marks[id] || {})) facts.marks[id][k] = UNKNOWN_DATE;
    }
    facts.seeded = true;
    changed = true;
  }
  const flag = (name) => {
    if (!facts.flags[name]) {
      facts.flags[name] = iso;
      changed = true;
    }
  };
  if (hasLoad) flag('firstLoad');
  if (hasPublished) flag('stage');
  if (hasRecap) flag('firstRecap');
  for (const th of ARCHITECT.thresholds) {
    if (createdCount >= th) {
      const marks = (facts.marks.architect = facts.marks.architect || {});
      if (!marks[th]) {
        marks[th] = iso;
        changed = true;
      }
    }
  }
  const weighTarget = WEIGH_IN.target;
  if (weighCount >= weighTarget) {
    const marks = (facts.marks.weighIn = facts.marks.weighIn || {});
    if (!marks[weighTarget]) {
      marks[weighTarget] = iso;
      changed = true;
    }
  }
  return { facts, changed };
};

/* ───────────────────────── Exercices différents ───────────────────────── */

const NOT_AN_EXERCISE = new Set(['', 'repos', 'sans nom', 'pause', 'amrap', 'emom', 'tabata', 'basic', 'mix']);
const MAX_EXERCISES = 300;

// Sans accents ni majuscules ni espaces en trop : « Développé  couché » = « developpe couche ».
// Les accents sont les marques combinantes (codes 0x300 à 0x36F) laissées par la forme NFD ;
// on les écarte par leur code plutôt que par une expression régulière.
export const exerciseKeyOf = (name) => {
  let plain = '';
  for (const ch of String(name ?? '').normalize('NFD')) {
    const code = ch.charCodeAt(0);
    if (code < 0x300 || code > 0x36f) plain += ch;
  }
  return plain.toLowerCase().replace(/\s+/g, ' ').trim();
};

const validExerciseKey = (key) => key.length >= 2 && !NOT_AN_EXERCISE.has(key);

/**
 * Ajoute des noms d'exercice aux faits (ceux d'un MIX mené jusqu'au bout, d'un jeu…).
 * Chaque exercice n'est gardé qu'une fois, avec la date de sa première apparition.
 */
export const addExercises = (rawFacts, names, now = Date.now()) => {
  const facts = normalizeFacts(rawFacts);
  const iso = new Date(now).toISOString();
  let changed = false;
  for (const name of Array.isArray(names) ? names : []) {
    const key = exerciseKeyOf(name);
    if (!validExerciseKey(key) || facts.exercises[key]) continue;
    if (Object.keys(facts.exercises).length >= MAX_EXERCISES) break;
    facts.exercises[key] = { n: String(name).trim().slice(0, 60), at: iso };
    changed = true;
  }
  return { facts, changed };
};

/**
 * Tous les exercices connus, du plus ancien au plus récent : [{ key, at }].
 * Sources : les faits (MIX terminés), les parties de jeu notées dans l'historique, le
 * journal des charges.
 */
export const collectExercises = ({ facts, sessions = [], journal = [] } = {}) => {
  const map = new Map();
  const add = (name, at) => {
    const key = exerciseKeyOf(name);
    if (!validExerciseKey(key)) return;
    const t = Number.isFinite(at) ? at : null;
    const prev = map.get(key);
    if (prev === undefined || (t != null && (prev == null || t < prev))) map.set(key, t);
  };
  for (const [key, e] of Object.entries(asObject(facts?.exercises))) add(e?.n ?? key, isoToMs(e?.at));
  for (const s of Array.isArray(sessions) ? sessions : []) {
    if (!s || s.pendingDelete || !Array.isArray(s.exercises)) continue;
    const t = Date.parse(s.date);
    s.exercises.forEach((n) => add(n, t));
  }
  for (const e of Array.isArray(journal) ? journal : []) {
    if (!e) continue;
    const t = typeof e.day === 'string' ? Date.parse(`${e.day}T12:00:00`) : NaN;
    add(e.label, t);
  }
  return [...map.entries()].map(([key, at]) => ({ key, at: at ?? 0 })).sort((a, b) => a.at - b.at);
};

/* ───────────────────────── Évaluation ───────────────────────── */

/**
 * @param {object} input
 * @param {Array}  input.sessions     historique brut (flexTimer_history)
 * @param {Array}  [input.gamePlays]  parties de jeu { game, value, at, broke } triées par date
 * @param {Array}  [input.exercises]  [{ key, at }] (voir collectExercises)
 * @param {number} [input.createdCount] mix créés par la personne dans sa bibliothèque
 * @param {number} [input.weighCount]   pesées notées
 * @param {object} [input.facts]        faits mémorisés (voir reconcileFacts)
 * @param {number} [input.now]
 */
export const evaluateTrophies = ({
  sessions = [],
  gamePlays = [],
  exercises = [],
  createdCount = 0,
  weighCount = 0,
  facts = null,
  now = Date.now(),
} = {}) => {
  const f = normalizeFacts(facts);

  const T = {};
  for (const def of TROPHIES) {
    T[def.id] = def.kind === 'tier' ? tierTracker(def.thresholds) : counterTracker(def.target || 1);
  }

  const prepared = (Array.isArray(sessions) ? sessions : [])
    .filter((s) => s && !s.pendingDelete && Number.isFinite(new Date(s.date).getTime()))
    .map((s) => ({
      s,
      t: new Date(s.date).getTime(),
      game: s.timerId === 'game',
      dur: Number.isFinite(s.durationSeconds) ? Math.max(0, s.durationSeconds) : 0,
    }))
    .sort((a, b) => a.t - b.t);

  const modeCount = {};
  const modeSet = new Set();
  const weekModes = new Map();
  const dayCounts = new Map();
  const daysSeen = new Set();
  const weekChrono = new Map();
  const weekQualified = new Map();
  const weekend = new Map();
  const seasons = new Set();
  let sweatMin = 0;
  let marathonMin = 0;
  let prevDay = null;
  let run = 0;
  let firstAt = null;

  for (const { s, t, game, dur } of prepared) {
    const date = new Date(t);
    const day = dayIdx(t);
    const week = weekIdx(day);
    if (firstAt == null) firstAt = t;

    // Activité : temps, jours, série, retour après pause, saisons.
    sweatMin += dur / 60;
    T.sweat.feed(sweatMin, t);
    marathonMin += sessionWorkSeconds(s) / 60;
    T.marathon.feed(marathonMin, t);
    seasons.add(seasonOf(date.getMonth()));
    T.fourSeasons.feed(seasons.size, t);
    if (!daysSeen.has(day)) {
      daysSeen.add(day);
      T.loyal.feed(daysSeen.size, t);
      if (prevDay != null && day - prevDay - 1 >= 14) T.comeback.feed(1, t);
      run = prevDay != null && day === prevDay + 1 ? run + 1 : 1;
      prevDay = day;
      T.flame.feed(run, t);
    }

    if (game) continue;

    // Séances de chrono.
    const id = s.timerId;
    const minutes = dur / 60;
    T.longhaul.feed(minutes, t);

    if (MODE_IDS.includes(id)) {
      modeCount[id] = (modeCount[id] || 0) + 1;
      T[id].feed(modeCount[id], t);
      modeSet.add(id);
      T.five.feed(modeSet.size, t);
      let set = weekModes.get(week);
      if (!set) {
        set = new Set();
        weekModes.set(week, set);
      }
      set.add(id);
      T.fullweek.feed(set.size, t);
    }

    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    T.triple.feed(dayCounts.get(day), t);

    // Semaines solides : une semaine « compte » à sa 3e séance, et prolonge la série si la
    // semaine d'avant comptait aussi.
    const inWeek = (weekChrono.get(week) || 0) + 1;
    weekChrono.set(week, inWeek);
    if (inWeek === 3) {
      const length = (weekQualified.get(week - 1) || 0) + 1;
      weekQualified.set(week, length);
      T.weeks.feed(length, t);
    }

    if (id === 'mix' && isComplete(s)) {
      const shape = mixShape(s);
      T.foreman.feed(shape.types, t);
      T.bigmix.feed(shape.blocks, t);
    }
    if (id === 'tabata' && isComplete(s) && s.totalRounds >= 8) T.finishTabata.feed(1, t);
    if (id === 'emom' && isComplete(s) && s.totalRounds >= 10) T.finishEmom.feed(1, t);
    if (id === 'amrap' && dur >= 20 * 60) T.finishAmrap.feed(1, t);

    // Secrets : l'heure de DÉBUT de la séance (la date enregistrée est celle de la fin).
    const startHour = new Date(t - dur * 1000).getHours();
    if (startHour >= 4 && startHour < 7) T.earlyBird.feed(1, t);
    if (startHour >= 22 || startHour < 4) T.nightOwl.feed(1, t);
    const dow = date.getDay();
    if (dow === 6 || dow === 0) {
      let w = weekend.get(week);
      if (!w) {
        w = { sat: false, sun: false };
        weekend.set(week, w);
      }
      if (dow === 6) w.sat = true;
      else w.sun = true;
      if (w.sat && w.sun) T.weekendActive.feed(1, t);
    }
    if (id === 'basic' && dur >= 300 && dur % 60 === 0) T.onTheDot.feed(1, t);
  }

  // Exercices différents.
  let known = 0;
  for (const ex of Array.isArray(exercises) ? exercises : []) {
    known += 1;
    T.collector.feed(known, ex.at);
  }

  // Jeux (listes de scores : plus complètes que l'historique, qui ne garde les parties
  // que depuis le 06/11/2026).
  let reps = 0;
  const gamesPlayed = new Set();
  for (const p of Array.isArray(gamePlays) ? gamePlays : []) {
    reps += Number(p.value) || 0;
    T.player.feed(reps, p.at);
    gamesPlayed.add(p.game);
    T.threeGames.feed(gamesPlayed.size, p.at);
    if (p.broke) T.record.feed(1, p.at);
  }

  // Faits mémorisés : dates posées une fois.
  const markAt = (trophyId, threshold) => isoToMs(f.marks?.[trophyId]?.[threshold]);
  for (const th of ARCHITECT.thresholds) {
    const m = markAt('architect', th);
    if (m != null) T.architect.feed(th, m);
  }
  T.architect.feed(createdCount, now);
  const weighMark = markAt('weighIn', WEIGH_IN.target);
  if (weighMark != null) T.weighIn.feed(WEIGH_IN.target, weighMark);
  T.weighIn.feed(weighCount, now);
  for (const name of ['stage', 'sharer', 'liked', 'firstLoad', 'overload', 'firstRecap']) {
    const at = isoToMs(f.flags[name]);
    if (at != null) T[name].feed(1, at);
  }

  /* ── Assemblage ── */
  const counts = { bronze: 0, argent: 0, or: 0, unique: { got: 0, total: 0 }, secret: { got: 0, total: 0 } };
  const events = [];

  const list = TROPHIES.map((def) => {
    const r = T[def.id].result();

    if (def.kind === 'tier') {
      let value = r.value;
      let at = r.at;
      if (def.id === 'veteran') {
        // Le temps passe même sans séance : on compte les mois depuis la toute première.
        value = firstAt == null ? 0 : monthsSince(firstAt, now);
        at = def.thresholds.map((th) => (firstAt != null && value >= th ? addMonths(firstAt, th) : null));
      }
      const tiers = def.thresholds.map((threshold, i) => {
        const unlocked = value >= threshold;
        if (unlocked) {
          counts[BADGE_TIERS[i].key] += 1;
          if (at[i]) events.push({ id: def.id, tier: BADGE_TIERS[i].key, at: at[i] });
        }
        return {
          key: BADGE_TIERS[i].key,
          label: BADGE_TIERS[i].label,
          threshold,
          short: medalLabel(def, i),
          unlocked,
          progress: threshold > 0 ? Math.max(0, Math.min(1, value / threshold)) : 1,
          at: unlocked ? at[i] : null,
        };
      });
      const nextIndex = tiers.findIndex((tier) => !tier.unlocked);
      const nextTier = nextIndex === -1 ? null : tiers[nextIndex];
      return {
        id: def.id,
        kind: 'tier',
        def,
        value,
        tiers,
        nextTier,
        unlockedCount: tiers.filter((tier) => tier.unlocked).length,
        complete: nextIndex === -1,
        // Part du chemin vers le prochain palier : sert à choisir « le prochain ».
        ratio: nextTier ? Math.min(1, value / nextTier.threshold) : 1,
      };
    }

    const target = def.target || 1;
    const unlocked = r.value >= target;
    const bucket = def.kind === 'secret' ? counts.secret : counts.unique;
    bucket.total += 1;
    if (unlocked) {
      bucket.got += 1;
      if (r.at) events.push({ id: def.id, tier: null, at: r.at });
    }
    return {
      id: def.id,
      kind: def.kind,
      def,
      value: Math.min(r.value, target),
      target,
      hasProgress: !!def.target,
      unlocked,
      progress: unlocked ? 1 : Math.max(0, Math.min(1, r.value / target)),
      at: unlocked ? r.at : null,
    };
  });

  const byId = Object.fromEntries(list.map((t) => [t.id, t]));
  const unlockedCount = counts.bronze + counts.argent + counts.or + counts.unique.got + counts.secret.got;

  // « Le prochain » : le trophée à paliers le plus proche de son prochain palier.
  let next = null;
  for (const t of list) {
    if (t.kind !== 'tier' || !t.nextTier) continue;
    if (!next || t.ratio > next.ratio) next = t;
  }

  events.sort((a, b) => b.at - a.at);

  return {
    list,
    byId,
    unlockedCount,
    total: list.reduce((n, t) => n + (t.kind === 'tier' ? t.tiers.length : 1), 0),
    counts,
    next,
    recent: events,
    firstActivityAt: firstAt,
  };
};

/* ───────────────────────── Annonces ───────────────────────── */

/**
 * Tout ce qui est gagné : [{ id, tier, at }], du plus ancien au plus récent. `tier` vaut
 * 'bronze' | 'argent' | 'or' pour un palier, 'done' pour un exploit ou un secret.
 */
export const allUnlocks = (evaluation) => {
  const out = [];
  (evaluation?.list || []).forEach((t, order) => {
    if (t.kind === 'tier') {
      t.tiers.forEach((tier) => {
        if (tier.unlocked) out.push({ id: t.id, tier: tier.key, at: tier.at || 0, order });
      });
    } else if (t.unlocked) {
      out.push({ id: t.id, tier: UNIQUE_TIER, at: t.at || 0, order });
    }
  });
  return out
    .sort((a, b) => a.at - b.at || a.order - b.order)
    .map(({ id, tier, at }) => ({ id, tier, at }));
};

// Gagnés mais jamais annoncés. `seen` = { [id]: ['bronze', …] } (flexTimer_badgesSeen).
export const unseenUnlocks = (evaluation, seen) =>
  allUnlocks(evaluation).filter((u) => !(Array.isArray(seen?.[u.id]) && seen[u.id].includes(u.tier)));

// Ce qui est déjà annoncé, au format de `flexTimer_badgesSeen`.
export const seenFromUnlocks = (unlocks, base = {}) => {
  const out = {};
  for (const [id, tiers] of Object.entries(base || {})) out[id] = Array.isArray(tiers) ? [...tiers] : [];
  for (const u of unlocks) {
    out[u.id] = out[u.id] || [];
    if (!out[u.id].includes(u.tier)) out[u.id].push(u.tier);
  }
  return out;
};

// Date courte : « 03/09 », avec l'année (« 03/09/25 ») quand ce n'est pas l'année en cours.
// Une date inconnue (0) ne s'écrit pas.
export const formatShortDate = (ms, now = Date.now()) => {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return year === new Date(now).getFullYear() ? `${dd}/${mm}` : `${dd}/${mm}/${String(year).slice(2)}`;
};
