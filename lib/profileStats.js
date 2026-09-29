// Statistiques du Hub Profil, calculées depuis l'historique réel.
// Pur JS, aucune lecture de stockage : on lui passe la liste des séances et
// la liste des timers (testable au `node`). Les séances « en sursis »
// (pendingDelete) ne comptent nulle part, comme dans lib/history.js.
const DAY_MS = 86400000;

const MONTH_SHORT = ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
const MONTH_LONG = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

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

// Lundi 00:00 de la semaine de `d`.
const mondayOf = (d) => {
  const x = startOfDay(d);
  const iso = x.getDay() === 0 ? 7 : x.getDay();
  return addDays(x, -(iso - 1));
};

// Numéro de semaine ISO (1-53).
const isoWeek = (d) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t - yearStart) / DAY_MS + 1) / 7);
};

const dayIndex = (d) => Math.round(startOfDay(d).getTime() / DAY_MS);

// « 18h30 » / « 45min » : même écriture que computeTotals (lib/history.js).
export const formatTimeLabel = (totalSeconds) => {
  const secs = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(secs / 3600);
  let m = Math.round((secs % 3600) / 60);
  if (secs > 0 && h === 0 && m === 0) m = 1;
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
};

const formatClock = (totalSeconds) => {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

// Effort réel d'une séance (repos exclu). Anciennes séances sans le détail :
// on retombe sur la durée totale moins le repos connu.
const workSecondsOf = (s) => {
  if (Number.isFinite(s.workTotal)) return Math.max(0, s.workTotal);
  return Math.max(0, (s.durationSeconds || 0) - (Number.isFinite(s.restTotal) ? s.restTotal : 0));
};

/** Plus longue suite de jours consécutifs avec au moins une séance. */
export const computeBestStreak = (sessions) => {
  const days = [...new Set(sessions.map((s) => dayIndex(new Date(s.date))))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    run = prev !== null && d === prev + 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
};

/** Série en cours : jours d'affilée jusqu'à aujourd'hui (0 si rien aujourd'hui). */
export const computeCurrentStreak = (sessions, now = new Date()) => {
  const days = new Set(sessions.map((s) => dayIndex(new Date(s.date))));
  let streak = 0;
  let cursor = dayIndex(now);
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
};

const relativeDayLabel = (date, now) => {
  const diff = dayIndex(now) - dayIndex(date);
  if (diff <= 0) return 'Aujourd’hui';
  if (diff === 1) return 'Hier';
  return `${date.getDate()} ${MONTH_LONG[date.getMonth()]}`;
};

/**
 * Toutes les statistiques du Profil en un seul passage.
 * @param {Array} sessions  historique brut (flexTimer_history)
 * @param {Array} timers    liste des timers { id, name, color }
 */
export const computeProfileStats = (sessions, timers, now = new Date()) => {
  const list = (Array.isArray(sessions) ? sessions : []).filter(
    (s) => s && !s.pendingDelete && !Number.isNaN(new Date(s.date).getTime())
  );
  const timerList = Array.isArray(timers) ? timers : [];

  const totalSeconds = list.reduce((a, s) => a + (s.durationSeconds || 0), 0);

  // --- Régularité
  const streak = computeCurrentStreak(list, now);
  const bestStreak = Math.max(computeBestStreak(list), streak);

  // --- 8 dernières semaines (la plus récente en dernier)
  const thisMonday = mondayOf(now);
  const weeklyVolume = [];
  const weeklyLabels = [];
  for (let i = 7; i >= 0; i--) {
    const from = addDays(thisMonday, -7 * i).getTime();
    const to = from + 7 * DAY_MS;
    weeklyVolume.push(list.filter((s) => {
      const t = new Date(s.date).getTime();
      return t >= from && t < to;
    }).length);
    weeklyLabels.push(`S${isoWeek(new Date(from))}`);
  }

  // --- Heatmap : 6 semaines × 7 jours (lun → dim), intensité 0-3
  const perDay = new Map();
  for (const s of list) {
    const k = dayIndex(new Date(s.date));
    perDay.set(k, (perDay.get(k) || 0) + 1);
  }
  const today = dayIndex(now);
  const heatmapWeeks = [];
  for (let w = 5; w >= 0; w--) {
    const monday = addDays(thisMonday, -7 * w);
    const col = [];
    for (let d = 0; d < 7; d++) {
      const k = dayIndex(addDays(monday, d));
      col.push(k > today ? 0 : Math.min(3, perDay.get(k) || 0));
    }
    heatmapWeeks.push(col);
  }

  // --- 6 derniers mois (le plus récent en dernier)
  const monthlyCounts = [];
  const monthlyLabels = [];
  for (let i = 5; i >= 0; i--) {
    const first = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    monthlyCounts.push(list.filter((s) => {
      const t = new Date(s.date).getTime();
      return t >= first.getTime() && t < next.getTime();
    }).length);
    monthlyLabels.push(MONTH_SHORT[first.getMonth()]);
  }

  // --- Temps sous tension : mois en cours, comparé au mois précédent
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  let tutNow = 0;
  let tutPrev = 0;
  for (const s of list) {
    const t = new Date(s.date).getTime();
    if (t >= monthStart) tutNow += workSecondsOf(s);
    else if (t >= prevMonthStart) tutPrev += workSecondsOf(s);
  }
  const tensionWeekly = [];
  for (let i = 3; i >= 0; i--) {
    const from = addDays(thisMonday, -7 * i).getTime();
    const to = from + 7 * DAY_MS;
    let sum = 0;
    for (const s of list) {
      const t = new Date(s.date).getTime();
      if (t >= from && t < to) sum += workSecondsOf(s);
    }
    tensionWeekly.push(Math.round(sum / 60));
  }

  // --- Répartition par format + compteurs de badges
  const counts = {};
  const seconds = {};
  for (const s of list) {
    counts[s.timerId] = (counts[s.timerId] || 0) + 1;
    seconds[s.timerId] = (seconds[s.timerId] || 0) + (s.durationSeconds || 0);
  }
  const formatBreakdown = timerList.map((t) => ({
    id: t.id,
    label: t.name,
    color: t.color,
    count: counts[t.id] || 0,
  }));
  const modeTimeLabels = {};
  for (const t of timerList) modeTimeLabels[t.id] = formatTimeLabel(seconds[t.id] || 0);
  const modeSeconds = { ...seconds };

  // --- Dernière séance
  let last = null;
  for (const s of list) {
    if (!last || new Date(s.date) > new Date(last.date)) last = s;
  }
  const lastSession = last
    ? {
        timerId: last.timerId,
        name: last.name || (timerList.find((t) => t.id === last.timerId)?.name ?? ''),
        duration: formatClock(last.durationSeconds),
        rounds: last.completedRounds || 0,
        dateLabel: relativeDayLabel(new Date(last.date), now),
      }
    : null;

  const oldest = list.reduce((min, s) => (!min || new Date(s.date) < new Date(min) ? s.date : min), null);

  return {
    hasData: list.length > 0,
    sessionCount: list.length,
    totalSeconds,
    timeLabel: formatTimeLabel(totalSeconds),
    oldestSessionDate: oldest,
    streak,
    bestStreak,
    weeklyVolume,
    weeklyLabels,
    heatmapWeeks,
    monthlyCounts,
    monthlyLabels,
    tension: {
      label: formatTimeLabel(tutNow),
      seconds: tutNow,
      deltaPct: tutPrev > 0 ? Math.round(((tutNow - tutPrev) / tutPrev) * 100) : null,
      weekly: tensionWeekly,
    },
    formatBreakdown,
    badgeCounts: counts,
    modeTimeLabels,
    modeSeconds,
    lastSession,
  };
};
