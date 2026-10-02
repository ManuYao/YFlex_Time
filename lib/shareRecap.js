// Bilan partageable du Profil (semaine ou mois), calculé depuis l'historique
// réel. Pur JS, sans React Native : testable au `node` comme lib/profileStats.js.
// Les séances « en sursis » (pendingDelete) ne comptent nulle part.
import { computeCurrentStreak, formatTimeLabel, formatTensionLabel, sessionWorkSeconds } from './profileStats';
import { BADGE_TIERS, getBadgeProgress } from './badges';

const DAY_MS = 86400000;
const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const MONTH_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const WEEK_DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const RECAP_PERIODS = [
  { id: 'week', label: 'SEMAINE' },
  { id: 'month', label: 'MOIS' },
];

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
const isoWeek = (d) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t - yearStart) / DAY_MS + 1) / 7);
};
const dayKey = (d) => Math.round(startOfDay(d).getTime() / DAY_MS);

/** Bornes de la période en cours et de la précédente : [from, to) en millisecondes. */
export const periodBounds = (period, now = new Date()) => {
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { from, to, prevFrom, prevTo: from };
  }
  const from = mondayOf(now);
  const to = addDays(from, 7);
  return { from, to, prevFrom: addDays(from, -7), prevTo: from };
};

const inRange = (s, from, to) => {
  const t = new Date(s.date).getTime();
  return t >= from.getTime() && t < to.getTime();
};

/**
 * Bilan d'une période.
 * @param {Array} sessions  historique brut (flexTimer_history)
 * @param {Array} timers    liste des timers { id, name, color }
 * @param {'week'|'month'} period
 */
export const computeRecap = (sessions, timers, period = 'week', now = new Date()) => {
  const all = (Array.isArray(sessions) ? sessions : []).filter(
    (s) => s && !s.pendingDelete && !Number.isNaN(new Date(s.date).getTime())
  );
  const timerList = Array.isArray(timers) ? timers : [];
  const { from, to, prevFrom, prevTo } = periodBounds(period, now);
  const list = all.filter((s) => inRange(s, from, to));
  const prevCount = all.filter((s) => inRange(s, prevFrom, prevTo)).length;

  const totalDays = Math.round((to.getTime() - from.getTime()) / DAY_MS);
  const today = dayKey(now);
  const perDay = new Map();
  for (const s of list) {
    const k = dayKey(new Date(s.date));
    perDay.set(k, (perDay.get(k) || 0) + 1);
  }
  const first = dayKey(from);
  const days = [];
  for (let i = 0; i < totalDays; i++) {
    const k = first + i;
    days.push({ index: i, count: perDay.get(k) || 0, active: perDay.has(k), today: k === today, future: k > today });
  }
  // Jour de la semaine du 1er du mois (0 = lundi), pour caler une grille.
  const leadingBlanks = period === 'month' ? (from.getDay() === 0 ? 6 : from.getDay() - 1) : 0;

  const counts = {};
  const seconds = {};
  for (const s of list) {
    counts[s.timerId] = (counts[s.timerId] || 0) + 1;
    seconds[s.timerId] = (seconds[s.timerId] || 0) + (s.durationSeconds || 0);
  }
  const modes = timerList
    .map((t) => ({ id: t.id, name: t.name, color: t.color, count: counts[t.id] || 0, seconds: seconds[t.id] || 0 }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count || b.seconds - a.seconds);

  const totalSeconds = list.reduce((a, s) => a + (s.durationSeconds || 0), 0);
  const tensionSeconds = list.reduce((a, s) => a + sessionWorkSeconds(s), 0);

  const lastDay = addDays(to, -1);
  const label =
    period === 'month'
      ? `${MONTH_NAMES[from.getMonth()]} ${from.getFullYear()}`
      : `${from.getDate()} ${MONTH_SHORT[from.getMonth()]} – ${lastDay.getDate()} ${MONTH_SHORT[lastDay.getMonth()]}`;

  return {
    period,
    title: period === 'month' ? 'BILAN DU MOIS' : 'BILAN DE LA SEMAINE',
    label,
    weekNumber: period === 'week' ? isoWeek(from) : null,
    sessionCount: list.length,
    totalSeconds,
    timeLabel: formatTimeLabel(totalSeconds),
    tensionSeconds,
    tensionLabel: formatTensionLabel(tensionSeconds),
    tensionShort: formatTimeLabel(tensionSeconds),
    activeDays: perDay.size,
    totalDays,
    days,
    leadingBlanks,
    streak: computeCurrentStreak(all, now),
    modes,
    topMode: modes[0] || null,
    // Évolution par rapport à la période d'avant, en séances (null si rien avant).
    deltaPct: prevCount > 0 ? Math.round(((list.length - prevCount) / prevCount) * 100) : null,
    prevCount,
    hasData: list.length > 0,
  };
};

/** Trophées obtenus, au total et par palier — { unlocked, total, bronze, argent, or }. */
export const computeTrophyTally = (badgeCounts, timers) => {
  const tally = { unlocked: 0, total: 0, bronze: 0, argent: 0, or: 0 };
  for (const t of Array.isArray(timers) ? timers : []) {
    const progress = getBadgeProgress(t.id, badgeCounts?.[t.id] ?? 0);
    for (const tier of progress.tiers) {
      tally.total += 1;
      if (tier.unlocked) {
        tally.unlocked += 1;
        tally[tier.key] += 1;
      }
    }
  }
  return tally;
};

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

/** Texte envoyé avec le partage (l'image du bilan n'est pas exportable sans module natif). */
export const recapShareText = (recap, { pseudo, trophies } = {}) => {
  const who = pseudo ? ` de ${pseudo}` : '';
  const head =
    recap.period === 'month'
      ? `Mon bilan${who} · ${recap.label}`
      : `Mon bilan de la semaine${who} · ${recap.label}`;
  if (!recap.hasData) return `${head} : une pause bien méritée. Chronométré avec Flex Timer.`;
  const parts = [
    plural(recap.sessionCount, 'séance', 'séances'),
    `${recap.timeLabel} au total`,
    `${recap.activeDays}/${recap.totalDays} jours actifs`,
  ];
  if (recap.streak > 1) parts.push(`série de ${recap.streak} jours`);
  let text = `${head} : ${parts.join(' · ')}.`;
  if (recap.topMode) text += ` Mode favori : ${recap.topMode.name}.`;
  if (trophies && trophies.total > 0) text += ` ${trophies.unlocked}/${trophies.total} trophées.`;
  return `${text} Chronométré avec Flex Timer.`;
};

export const BADGE_TIER_KEYS = BADGE_TIERS.map((t) => t.key);
