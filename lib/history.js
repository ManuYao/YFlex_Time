import AsyncStorage from '@react-native-async-storage/async-storage';

export const HISTORY_KEY = 'flexTimer_history';

// Séance quittée à une petite fraction du temps NORMALEMENT prévu pour ce
// timer précis : enregistrée quand même, mais marquée `pendingDelete` —
// l'Historique l'affiche déjà prête à être supprimée, avec « Annuler la
// suppression ». Sans geste de l'utilisateur, elle disparaît d'elle-même
// PENDING_DELETE_TTL_MS après la séance (décompte invisible).
export const PENDING_DELETE_TTL_MS = 24 * 60 * 60 * 1000;

// Deuxième révision (28/09/2026) : la première version comparait au premier
// tour/bloc terminé, jugée insuffisante par l'utilisateur (un abandon à 11 s
// sur un BASIC réglé 1'15 de repos × 3 tours n'était pas proposé — le critère
// ne suffisait pas). Remplacée par un pourcentage unique et simple à vérifier,
// quel que soit le mode : 15 % du temps NORMAL de CE timer (chiffre donné par
// l'utilisateur). `expectedSeconds` vient de computeExpectedDuration()
// (lib/timer-engine.js) — le total configuré pour ce timer précis, pas ce qui
// a été réellement fait. Ignoré si inconnu (0).
export const EARLY_QUIT_RATIO = 0.15;

export const isEarlyQuit = (elapsedSeconds, expectedSeconds) =>
  expectedSeconds > 0 && elapsedSeconds < expectedSeconds * EARLY_QUIT_RATIO;

// Une séance en sursis ne compte ni pour les trophées ni pour la série :
// elle pourrait débloquer un palier puis disparaître un jour plus tard.
const isCounted = (s) => !s?.pendingDelete;

const isExpired = (s, now) =>
  !!s?.pendingDelete && now - new Date(s.date).getTime() >= PENDING_DELETE_TTL_MS;

// Séances supprimées ici et pas encore signalées au cloud (lib/historySync.js).
// Sans cette liste, la copie distante d'une séance supprimée la ferait
// réapparaître à la synchronisation suivante.
export const TOMBSTONES_KEY = 'flexTimer_historyDeleted';

export const readTombstones = async () => {
  try {
    const raw = await AsyncStorage.getItem(TOMBSTONES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const addTombstones = async (ids) => {
  if (!ids.length) return;
  try {
    const known = await readTombstones();
    await AsyncStorage.setItem(TOMBSTONES_KEY, JSON.stringify([...new Set([...known, ...ids])]));
  } catch {}
};

export const clearTombstones = async (ids) => {
  try {
    const set = new Set(ids);
    const known = await readTombstones();
    await AsyncStorage.setItem(TOMBSTONES_KEY, JSON.stringify(known.filter((id) => !set.has(id))));
  } catch {}
};

// Petit signal « l'historique a changé » : le portier de synchronisation
// (components/common/HistorySyncGate.js) s'y abonne. history.js n'importe pas
// historySync.js, ce qui éviterait un import circulaire.
const changeListeners = new Set();
export const onHistoryChanged = (cb) => {
  changeListeners.add(cb);
  return () => changeListeners.delete(cb);
};
export const notifyHistoryChanged = () => {
  changeListeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
};

export const loadHistory = async () => {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const alive = list.filter((s) => !isExpired(s, now));
    if (alive.length !== list.length) {
      await addTombstones(list.filter((s) => isExpired(s, now)).map((s) => s.id));
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(alive));
      notifyHistoryChanged();
    }
    return alive;
  } catch {
    return [];
  }
};

export const keepSession = async (id) => {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = list.map((s) => {
      if (s.id !== id) return s;
      const { pendingDelete, ...rest } = s;
      return rest;
    });
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    notifyHistoryChanged();
    return next;
  } catch {
    return null;
  }
};

export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {}
};

export const removeSession = async (id) => {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = list.filter((s) => s.id !== id);
    await addTombstones([id]);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    notifyHistoryChanged();
    return next;
  } catch {
    return null;
  }
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const daysBetween = (a, b) =>
  Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);

const DAY_NAMES = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MONTH_NAMES = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const dayLabel = (day, today) => {
  const diff = daysBetween(today, day);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  const base = `${DAY_NAMES[day.getDay()]} ${day.getDate()} ${MONTH_NAMES[day.getMonth()]}`;
  return day.getFullYear() === today.getFullYear() ? base : `${base} ${day.getFullYear()}`;
};

/**
 * Un groupe par jour calendaire, du plus récent au plus ancien, séances
 * triées de la plus récente à la plus ancienne dans chaque groupe. `key` est
 * le timestamp de minuit ce jour-là (stable, sert de clé React).
 */
export const groupByDay = (sessions) => {
  const today = startOfDay(new Date());
  const groups = new Map();

  for (const s of sessions) {
    const d = new Date(s.date);
    if (isNaN(d)) continue;
    const key = startOfDay(d).getTime();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  return [...groups.keys()]
    .sort((a, b) => b - a)
    .map((key) => ({
      key,
      date: dayLabel(new Date(key), today),
      items: groups.get(key).sort((a, b) => new Date(b.date) - new Date(a.date)),
    }));
};

export const computeStreak = (sessions) => {
  const counted = sessions.filter(isCounted);
  if (counted.length === 0) return 0;
  const days = new Set(
    counted.map((s) => startOfDay(new Date(s.date)).getTime())
  );
  let streak = 0;
  let cursor = startOfDay(new Date());
  while (days.has(cursor.getTime())) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
};

// Heure seule : le jour est porté par l'en-tête du groupe (groupByDay).
export const formatSessionTime = (isoDate) => {
  const d = new Date(isoDate);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

// Nombre de lancements par timer sur une fenêtre glissante de `windowDays`
// jours (par défaut 7) à partir de maintenant. Sert au badge "streak" de la
// Home : un compteur par carte, indépendant des autres timers.
export const computeHeatCounts = (sessions, windowDays = 7) => {
  const cutoff = Date.now() - windowDays * 86400000;
  const counts = {};
  for (const s of sessions) {
    if (!isCounted(s) || new Date(s.date).getTime() < cutoff) continue;
    counts[s.timerId] = (counts[s.timerId] || 0) + 1;
  }
  return counts;
};

export const computeTotals = (sessions) => {
  const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  let totalMins = Math.round((totalSeconds % 3600) / 60);
  // Une séance de quelques secondes (test rapide, EMOM stoppé via "Fin" tout
  // de suite...) arrondissait à "0min" — techniquement juste, mais ça affiche
  // "rien fait" alors qu'une séance existe bien dans l'historique. On ne
  // laisse jamais un total strictement positif retomber à zéro à l'affichage.
  if (totalSeconds > 0 && totalHours === 0 && totalMins === 0) totalMins = 1;
  return {
    count: sessions.length,
    totalSeconds,
    timeLabel:
      totalHours > 0
        ? `${totalHours}h${String(totalMins).padStart(2, '0')}`
        : `${totalMins}min`,
  };
};

/* ------------------------------------------------- portées jour / semaine */

// Lundi 00:00 de la semaine en cours (ISO : la semaine commence le lundi,
// alors que Date.getDay() met dimanche à 0).
const startOfWeek = () => {
  const now = startOfDay(new Date());
  const iso = now.getDay() === 0 ? 7 : now.getDay();
  now.setDate(now.getDate() - (iso - 1));
  return now;
};

// Portées : 'all' (depuis toujours), 'day' (depuis minuit), 'week' (depuis
// lundi). Les libellés affichés vivent côté écran (SCOPE_CAPTION dans
// HistoryPage) : ils dépendent de la place disponible, pas des données.
export const filterByScope = (sessions, scope) => {
  if (scope === 'day') {
    const from = startOfDay(new Date()).getTime();
    return sessions.filter((s) => new Date(s.date).getTime() >= from);
  }
  if (scope === 'week') {
    const from = startOfWeek().getTime();
    return sessions.filter((s) => new Date(s.date).getTime() >= from);
  }
  return sessions;
};

export const computeScopedTotals = (sessions, scope) =>
  computeTotals(filterByScope(sessions, scope));

// Seuil de bascule de l'affichage par défaut de la carte "Temps" : en dessous,
// la journée est trop maigre pour être le chiffre qu'on met en avant, on
// montre le cumul de toujours.
export const DAY_SCOPE_MIN_SECONDS = 5 * 60;

export const defaultTimeScope = (sessions) =>
  computeScopedTotals(sessions, 'day').totalSeconds > DAY_SCOPE_MIN_SECONDS
    ? 'day'
    : 'all';

/**
 * Répartition des séances par type sur une portée donnée, du plus fréquent au
 * moins fréquent : [{ name, count, color }].
 */
export const computeTypeBreakdown = (sessions, scope) => {
  const counts = new Map();
  for (const s of filterByScope(sessions, scope)) {
    const prev = counts.get(s.name) ?? { name: s.name, count: 0, color: s.color };
    counts.set(s.name, { ...prev, count: prev.count + 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
};

// Mêmes totaux que computeTotals, filtrés sur un seul timerId — sert au
// panneau stats/badges (⋮ sur Home) pour afficher séances + temps par mode.
export const computeModeTotals = (sessions, timerId) =>
  computeTotals(sessions.filter((s) => s.timerId === timerId && isCounted(s)));

// { amrap: 12, tabata: 3, ... } — le comptage brut dont dependent les paliers
// de badge (lib/badgeCelebration.js). Un seul passage sur la liste, pour
// pouvoir l'appeler juste apres l'ecriture d'une seance sans relire le
// stockage.
export const countSessionsByTimer = (sessions) => {
  const counts = {};
  for (const s of sessions) {
    if (!s?.timerId || !isCounted(s)) continue;
    counts[s.timerId] = (counts[s.timerId] || 0) + 1;
  }
  return counts;
};
// Composition d'une séance MIX : « 3 Tabata · 5 Basic · 1 Émom », ou null
// (autre mode, ou séance d'avant l'enregistrement du détail).
const BREAKDOWN_NAMES = { amrap: 'Amrap', basic: 'Basic', emom: 'Émom', tabata: 'Tabata' };
// Même composition sous forme de segments [{ id, count }] pour la barre visuelle
// (components/common/MixCompositionBar.js), ou null si pas de détail.
export const mixCompositionSegments = (s) => {
  const b = s?.blockBreakdown;
  if (s?.timerId !== 'mix' || !b) return null;
  const segs = Object.keys(BREAKDOWN_NAMES)
    .filter((k) => b[k] > 0)
    .map((k) => ({ id: k, count: b[k], name: BREAKDOWN_NAMES[k] }));
  return segs.length ? segs : null;
};
export const formatMixBreakdown = (s) => {
  const b = s?.blockBreakdown;
  if (s?.timerId !== 'mix' || !b) return null;
  const parts = Object.keys(BREAKDOWN_NAMES)
    .filter((k) => b[k] > 0)
    .map((k) => `${b[k]} ${BREAKDOWN_NAMES[k]}`);
  return parts.length ? parts.join(' · ') : null;
};
