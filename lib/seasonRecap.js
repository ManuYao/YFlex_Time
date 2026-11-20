// Bilan de saison — calculé depuis l'historique réel (et les archives du
// Planning pour les exercices). Pur JS, sans React Native ni stockage : testable
// au `node`, comme lib/profileStats.js et lib/shareRecap.js.
//
// Une saison = 3 mois calendaires, les mêmes que l'ambiance de saison
// (lib/ambiance.js) : printemps mars→mai, été juin→août, automne sept→nov,
// hiver déc→fév. Le bilan s'ouvre le 1er jour de la saison suivante.
//
// Les séances « en sursis » (pendingDelete) ne comptent nulle part. Un MIX se
// compte par exercice (volumeUnits), comme dans le Profil : jamais « une séance
// MIX » seule.
import {
  computeBestStreak,
  formatTimeLabel,
  formatTensionLabel,
  sessionFormatUnits,
  sessionWorkSeconds,
  volumeUnits,
} from './profileStats';
import { computeGameStats, buildGamePlays } from './gameStats';
import { evaluateTrophies } from './trophies';
import { getTrophy } from './trophyCatalog';
import { BADGE_TIERS } from './badges';

const DAY_MS = 86400000;

/** Sous ce nombre de séances dans la saison, aucun bilan (un bilan vide ne dit rien). */
export const MIN_SEASON_SESSIONS = 3;

export const SEASON_LABELS = {
  spring: 'Printemps',
  summer: 'Été',
  autumn: 'Automne',
  winter: 'Hiver',
};

const WEEKDAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTH_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const mondayOf = (d) => {
  const x = startOfDay(d);
  const iso = x.getDay() === 0 ? 7 : x.getDay();
  return addDays(x, -(iso - 1));
};
const dayKey = (d) => Math.round(startOfDay(d).getTime() / DAY_MS);

/**
 * Saison contenant `date` : { id, key, from, to, label, year, yearLabel, title }.
 * `from` inclus, `to` exclu (1er jour de la saison suivante, heure locale).
 */
export const seasonRangeOf = (date = new Date()) => {
  const m = date.getMonth();
  const y = date.getFullYear();
  let id;
  let startMonth;
  let startYear = y;
  if (m >= 2 && m <= 4) { id = 'spring'; startMonth = 2; }
  else if (m >= 5 && m <= 7) { id = 'summer'; startMonth = 5; }
  else if (m >= 8 && m <= 10) { id = 'autumn'; startMonth = 8; }
  else {
    id = 'winter';
    startMonth = 11;
    startYear = m === 11 ? y : y - 1; // janvier et février appartiennent à l'hiver d'avant
  }
  const from = new Date(startYear, startMonth, 1);
  const to = new Date(startYear, startMonth + 3, 1);
  const yearLabel = id === 'winter' ? `${startYear}-${startYear + 1}` : String(startYear);
  return {
    id,
    key: `${id}-${startYear}`,
    from,
    to,
    label: SEASON_LABELS[id],
    year: startYear,
    yearLabel,
    title: `Ton ${SEASON_LABELS[id].toLowerCase()}`,
  };
};

/** Saison juste avant celle de `date`. */
export const previousSeasonRange = (date = new Date()) =>
  seasonRangeOf(new Date(seasonRangeOf(date).from.getTime() - 1));

/** Retrouve une saison depuis sa clé (« autumn-2026 »), ou null. */
export const seasonRangeByKey = (key) => {
  const m = /^(spring|summer|autumn|winter)-(\d{4})$/.exec(String(key || ''));
  if (!m) return null;
  const month = { spring: 2, summer: 5, autumn: 8, winter: 11 }[m[1]];
  return seasonRangeOf(new Date(Number(m[2]), month, 15));
};

const validSessions = (sessions) =>
  (Array.isArray(sessions) ? sessions : []).filter(
    (s) => s && !s.pendingDelete && !Number.isNaN(new Date(s.date).getTime())
  );

const inRange = (s, from, to) => {
  const t = new Date(s.date).getTime();
  return t >= from.getTime() && t < to.getTime();
};

// Trophées gagnés pendant la saison : ceux dont la date d'obtention tombe dans la saison. Un
// trophée à date inconnue (gagné avant que l'app la note) n'est jamais attribué à une saison.
// Les plus marquants d'abord (secret et Or, puis exploit et Argent, puis Bronze).
const TROPHY_WEIGHT = { or: 3, argent: 2, bronze: 1 };
const seasonTrophies = (events, from, to) => {
  const lo = from.getTime();
  const hi = to.getTime();
  const out = [];
  for (const e of Array.isArray(events) ? events : []) {
    if (!(e.at >= lo && e.at < hi)) continue;
    const def = getTrophy(e.id);
    if (!def) continue;
    const tierIndex = e.tier ? BADGE_TIERS.findIndex((t) => t.key === e.tier) : -1;
    out.push({
      id: def.id,
      kind: def.kind,
      tier: e.tier || null,
      name: def.name,
      icon: def.icon,
      colors: def.colors || null,
      // Texte sous le nom : le palier, ou de quel mode/jeu vient l'exploit.
      tagLabel: e.tier ? BADGE_TIERS[tierIndex]?.label || '' : def.sub || (def.kind === 'secret' ? 'SECRET' : 'EXPLOIT'),
      // Texte au centre de la médaille d'un palier (« 10 », « 2h »).
      short: tierIndex >= 0 ? (def.labels ? def.labels[tierIndex] : String(def.thresholds[tierIndex])) : '',
      weight: e.tier ? TROPHY_WEIGHT[e.tier] || 1 : def.kind === 'secret' ? 3 : 2,
      at: e.at,
    });
  }
  return out.sort((a, b) => b.weight - a.weight || a.at - b.at);
};

/** Nombre de séances (brutes) dans la saison. */
export const seasonSessionCount = (sessions, range) =>
  validSessions(sessions).filter((s) => inRange(s, range.from, range.to)).length;

export const isRecapEligible = (sessions, range) =>
  seasonSessionCount(sessions, range) >= MIN_SEASON_SESSIONS;

/**
 * Clé du bilan à proposer maintenant : la saison qui vient de finir, si elle a
 * assez de séances et n'a pas déjà été vue. null sinon.
 */
export const pendingSeasonKey = (sessions, seenKeys, now = new Date()) => {
  const range = previousSeasonRange(now);
  if ((seenKeys || []).includes(range.key)) return null;
  return isRecapEligible(sessions, range) ? range.key : null;
};

/**
 * Bilan à ouvrir depuis le Profil : la dernière saison finie si elle a un bilan,
 * sinon la saison en cours (marquée « en cours »), sinon null.
 */
export const latestRecapRange = (sessions, now = new Date()) => {
  const prev = previousSeasonRange(now);
  if (isRecapEligible(sessions, prev)) return prev;
  const cur = seasonRangeOf(now);
  return isRecapEligible(sessions, cur) ? cur : null;
};

const HOUR_SLOTS = [
  { id: 'morning', label: 'le matin', from: 5, to: 12 },
  { id: 'afternoon', label: 'l’après-midi', from: 12, to: 18 },
  { id: 'evening', label: 'le soir', from: 18, to: 23 },
];
const slotOf = (hour) => HOUR_SLOTS.find((s) => hour >= s.from && hour < s.to) || { id: 'night', label: 'de nuit' };

const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

// Exercices et charges, depuis les archives du Planning (la seule trace de ce
// qui a été réellement planifié et fait, voir lib/progression.js).
const computeExercises = (archives, from, to) => {
  const groups = new Map();
  for (const entry of Array.isArray(archives) ? archives : []) {
    const at = new Date(entry?.date).getTime();
    if (Number.isNaN(at) || at < from.getTime() || at >= to.getTime()) continue;
    for (const block of entry.blocks || []) {
      for (const tag of block.tags || []) {
        if (!tag?.label) continue;
        const key = `${tag.category ?? '_'}::${normalize(tag.label)}`;
        if (!groups.has(key)) groups.set(key, { label: tag.label, category: tag.category, count: 0, weights: [] });
        const g = groups.get(key);
        g.count += 1;
        const w = Number(tag.weight);
        if (Number.isFinite(w) && w > 0) g.weights.push({ at, w });
      }
    }
  }
  const list = [...groups.values()];
  const top = list
    .map((g) => ({ label: g.label, category: g.category, count: g.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);
  const loads = list
    .filter((g) => g.weights.length >= 2)
    .map((g) => {
      const sorted = [...g.weights].sort((a, b) => a.at - b.at);
      const first = sorted[0].w;
      const last = sorted[sorted.length - 1].w;
      return { label: g.label, category: g.category, from: first, to: last, delta: last - first };
    })
    .filter((l) => l.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);
  return { top, loads };
};

/**
 * Bilan complet d'une saison.
 * @param {Array} sessions  historique brut (flexTimer_history)
 * @param {Array} timers    liste des timers { id, name, color }
 * @param {object} range    saison (seasonRangeOf / seasonRangeByKey)
 * @param {{archives?: Array, games?: {count?: Array, pyramid?: Array, combo?: Array}, now?: Date}} opts
 *   `games` = les scores des jeux (lib/gameStats.js) : la carte « Tes jeux » est la
 *   même pour tout le monde, Premium ou non.
 */
export const computeSeasonRecap = (
  sessions,
  timers,
  range,
  { archives = [], games = {}, trophyEvents = null, now = new Date() } = {}
) => {
  const all = validSessions(sessions);
  const timerList = Array.isArray(timers) ? timers : [];
  const { from, to } = range;
  const list = all.filter((s) => inRange(s, from, to));
  const inProgress = now.getTime() < to.getTime();

  const unitCount = list.reduce((n, s) => n + volumeUnits(s), 0);
  const totalSeconds = list.reduce((a, s) => a + (s.durationSeconds || 0), 0);
  const tensionSeconds = list.reduce((a, s) => a + sessionWorkSeconds(s), 0);

  // Saison d'avant, pour la comparaison (Premium).
  const prev = seasonRangeOf(new Date(from.getTime() - 1));
  const prevList = all.filter((s) => inRange(s, prev.from, prev.to));
  const prevUnits = prevList.reduce((n, s) => n + volumeUnits(s), 0);
  const prevTension = prevList.reduce((a, s) => a + sessionWorkSeconds(s), 0);

  // --- Jours actifs et calendrier
  const perDay = new Map();
  for (const s of list) {
    const k = dayKey(new Date(s.date));
    perDay.set(k, (perDay.get(k) || 0) + volumeUnits(s));
  }
  const firstKey = dayKey(from);
  const totalDays = Math.round((to.getTime() - from.getTime()) / DAY_MS);
  const today = dayKey(now);
  const elapsedDays = inProgress ? Math.max(1, Math.min(totalDays, today - firstKey + 1)) : totalDays;

  // Colonnes = semaines (lundi → dimanche), la 1re et la dernière complétées par des jours vides.
  const weeks = [];
  const lastDay = addDays(to, -1);
  for (let monday = mondayOf(from); monday.getTime() <= lastDay.getTime(); monday = addDays(monday, 7)) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(monday, d);
      const k = dayKey(day);
      const inside = day.getTime() >= from.getTime() && day.getTime() < to.getTime();
      col.push(inside && k <= today ? Math.min(3, perDay.get(k) || 0) : 0);
    }
    weeks.push(col);
  }

  // --- Meilleures séries / semaine / jour / créneau
  const bestStreak = computeBestStreak(list);
  const perWeek = new Map();
  const perWeekday = new Array(7).fill(0);
  const perSlot = {};
  for (const s of list) {
    const d = new Date(s.date);
    const monday = mondayOf(d).getTime();
    perWeek.set(monday, (perWeek.get(monday) || 0) + volumeUnits(s));
    perWeekday[d.getDay()] += 1;
    const slot = slotOf(d.getHours());
    perSlot[slot.id] = { label: slot.label, count: (perSlot[slot.id]?.count || 0) + 1 };
  }
  let bestWeek = null;
  for (const [monday, units] of perWeek) {
    if (!bestWeek || units > bestWeek.units) bestWeek = { monday, units };
  }
  const bestWeekRange = bestWeek
    ? (() => {
        const a = new Date(bestWeek.monday);
        const b = addDays(a, 6);
        return `${a.getDate()} ${MONTH_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTH_SHORT[b.getMonth()]}`;
      })()
    : null;
  const maxWeekday = Math.max(...perWeekday);
  const bestWeekdayIdx = maxWeekday > 0 ? perWeekday.indexOf(maxWeekday) : -1;
  const slotEntries = Object.values(perSlot).sort((a, b) => b.count - a.count);

  // --- Modes (un MIX se répartit entre ses formats)
  const counts = {};
  const seconds = {};
  for (const s of list) {
    for (const [fmt, n] of Object.entries(sessionFormatUnits(s))) counts[fmt] = (counts[fmt] || 0) + n;
    seconds[s.timerId] = (seconds[s.timerId] || 0) + (s.durationSeconds || 0);
  }
  const modes = timerList
    .map((t) => ({ id: t.id, name: t.name, color: t.color, count: counts[t.id] || 0, seconds: seconds[t.id] || 0 }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count || b.seconds - a.seconds);

  // --- Trophées gagnés pendant la saison (les 68 : paliers, exploits, secrets). L'écran passe les
  // événements calculés avec tous les faits (mix créés, charges…) ; sans eux, on les recalcule
  // à partir de l'historique et des jeux seulement.
  const events =
    trophyEvents ||
    evaluateTrophies({ sessions: all, gamePlays: buildGamePlays(games), now: now.getTime() }).recent;
  const trophies = seasonTrophies(events, from, to);

  // --- Début partiel : la personne a commencé en cours de saison.
  const firstEver = all.reduce((min, s) => (min === null || new Date(s.date) < min ? new Date(s.date) : min), null);
  const partial = !!firstEver && firstEver.getTime() > from.getTime();

  const { top: topExercises, loads } = computeExercises(archives, from, to);

  // --- Jeux : seulement ce qui s'est joué pendant la saison. Pas de détail par jeu au-delà
  // du nombre de parties et du record, pour ne pas alourdir la carte.
  const gameStats = computeGameStats(games, { from, to, now });
  const gamesRecap = gameStats.hasData
    ? {
        plays: gameStats.plays,
        totalReps: gameStats.totalReps,
        activeDays: gameStats.activeDays,
        recordsBroken: gameStats.recordsBroken,
        favorite: gameStats.favorite,
        list: gameStats.games.map((g) => ({
          id: g.id,
          label: g.label,
          color: g.color,
          plays: g.plays,
          best: g.best.value,
        })),
      }
    : null;

  return {
    range,
    seasonId: range.id,
    key: range.key,
    title: range.title,
    label: range.label,
    yearLabel: range.yearLabel,
    inProgress,
    partial,
    startedLabel: partial && firstEver ? `${firstEver.getDate()} ${MONTH_SHORT[firstEver.getMonth()]}` : null,
    hasData: list.length > 0,
    sessionCount: unitCount,
    rawSessionCount: list.length,
    totalSeconds,
    timeLabel: formatTimeLabel(totalSeconds),
    activeDays: perDay.size,
    totalDays: elapsedDays,
    weeks,
    bestStreak,
    modes,
    topMode: modes[0] || null,
    trophies,
    games: gamesRecap,
    // --- Premium
    tension: {
      seconds: tensionSeconds,
      label: formatTensionLabel(tensionSeconds),
      deltaPct: prevTension > 0 ? Math.round(((tensionSeconds - prevTension) / prevTension) * 100) : null,
      prevLabel: prevTension > 0 ? formatTensionLabel(prevTension) : null,
    },
    sessionsDeltaPct: prevUnits > 0 ? Math.round(((unitCount - prevUnits) / prevUnits) * 100) : null,
    prevSeasonLabel: prev.label.toLowerCase(),
    topExercises,
    loads,
    rhythm: {
      bestWeek: bestWeek ? { units: bestWeek.units, range: bestWeekRange } : null,
      bestWeekday: bestWeekdayIdx >= 0 ? { name: WEEKDAY_NAMES[bestWeekdayIdx], count: maxWeekday } : null,
      slot: slotEntries[0] ? { label: slotEntries[0].label, count: slotEntries[0].count } : null,
    },
  };
};
