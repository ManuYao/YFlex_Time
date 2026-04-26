import AsyncStorage from '@react-native-async-storage/async-storage';

export const HISTORY_KEY = 'flexTimer_history';

export const loadHistory = async () => {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
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

export const groupByPeriod = (sessions) => {
  const now = new Date();
  const today = startOfDay(now);

  const groups = new Map();

  for (const s of sessions) {
    const d = new Date(s.date);
    const diff = daysBetween(today, d);

    let key;
    if (diff === 0) key = "Aujourd'hui";
    else if (diff === 1) key = 'Hier';
    else if (diff < 7) key = 'Cette semaine';
    else if (diff < 14) key = 'La semaine dernière';
    else if (diff < 31) key = 'Ce mois-ci';
    else key = 'Plus ancien';

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  const order = [
    "Aujourd'hui",
    'Hier',
    'Cette semaine',
    'La semaine dernière',
    'Ce mois-ci',
    'Plus ancien',
  ];

  return order
    .filter((k) => groups.has(k))
    .map((k) => ({
      date: k,
      items: groups.get(k).sort((a, b) => new Date(b.date) - new Date(a.date)),
    }));
};

export const computeStreak = (sessions) => {
  if (sessions.length === 0) return 0;
  const days = new Set(
    sessions.map((s) => startOfDay(new Date(s.date)).getTime())
  );
  let streak = 0;
  let cursor = startOfDay(new Date());
  while (days.has(cursor.getTime())) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
};

export const formatSessionTime = (isoDate) => {
  const d = new Date(isoDate);
  const now = new Date();
  const diff = daysBetween(startOfDay(now), startOfDay(d));
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (diff === 0 || diff === 1) return `${hh}:${mm}`;
  const dayNames = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  return `${dayNames[d.getDay()]} ${hh}:${mm}`;
};

export const computeTotals = (sessions) => {
  const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.round((totalSeconds % 3600) / 60);
  return {
    count: sessions.length,
    totalSeconds,
    timeLabel:
      totalHours > 0
        ? `${totalHours}h${String(totalMins).padStart(2, '0')}`
        : `${totalMins}min`,
  };
};