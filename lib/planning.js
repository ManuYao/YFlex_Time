import AsyncStorage from '@react-native-async-storage/async-storage';

export const PLANNING_KEY = 'flexTimer_planning';
export const PLANNING_ARCHIVES_KEY = 'flexTimer_planningArchives';

// `iso` suit la norme ISO-8601 (lundi = 1, dimanche = 7), pas Date.getDay()
// qui place dimanche à 0 — la conversion se fait dans isoOf().
export const DAYS = [
  { key: 'mon', short: 'LUN', long: 'Lundi', iso: 1 },
  { key: 'tue', short: 'MAR', long: 'Mardi', iso: 2 },
  { key: 'wed', short: 'MER', long: 'Mercredi', iso: 3 },
  { key: 'thu', short: 'JEU', long: 'Jeudi', iso: 4 },
  { key: 'fri', short: 'VEN', long: 'Vendredi', iso: 5 },
  { key: 'sat', short: 'SAM', long: 'Samedi', iso: 6 },
  { key: 'sun', short: 'DIM', long: 'Dimanche', iso: 7 },
];

const isoOf = (date) => (date.getDay() === 0 ? 7 : date.getDay());

export const getDay = (key) => DAYS.find((d) => d.key === key) || DAYS[0];

export const todayKey = () => {
  const iso = isoOf(new Date());
  return DAYS.find((d) => d.iso === iso).key;
};

const emptyDay = () => ({ blocks: [], archivedAt: null, note: '' });

export const emptyPlanning = () =>
  DAYS.reduce((acc, d) => {
    acc[d.key] = emptyDay();
    return acc;
  }, {});

// Complète les jours manquants : une sauvegarde faite avant l'ajout d'un jour
// (ou corrompue) ne doit pas faire planter l'écran.
const normalize = (raw) => {
  const base = emptyPlanning();
  if (!raw || typeof raw !== 'object') return base;
  DAYS.forEach((d) => {
    const day = raw[d.key];
    if (!day || !Array.isArray(day.blocks)) return;
    base[d.key] = {
      blocks: day.blocks,
      archivedAt: day.archivedAt ?? null,
      note: typeof day.note === 'string' ? day.note : '',
    };
  });
  return base;
};

export const loadPlanning = async () => {
  try {
    const raw = await AsyncStorage.getItem(PLANNING_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyPlanning();
  }
};

const persist = async (planning) => {
  try {
    await AsyncStorage.setItem(PLANNING_KEY, JSON.stringify(planning));
  } catch {}
  return planning;
};

const uid = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

const mapDay = (planning, dayKey, fn) => ({
  ...planning,
  [dayKey]: fn(planning[dayKey] ?? emptyDay()),
});

const mapBlock = (planning, dayKey, blockId, fn) =>
  mapDay(planning, dayKey, (day) => ({
    ...day,
    blocks: day.blocks.map((b) => (b.id === blockId ? fn(b) : b)),
  }));

export const addBlock = (planning, dayKey, name) =>
  persist(
    mapDay(planning, dayKey, (day) => ({
      ...day,
      blocks: [...day.blocks, { id: uid('blk'), name, tags: [] }],
    }))
  );

export const renameBlock = (planning, dayKey, blockId, name) =>
  persist(mapBlock(planning, dayKey, blockId, (b) => ({ ...b, name })));

// Note libre pour tout le jour (ex. "forme moyenne, bien dormi") — un champ
// de plus sur l'objet jour, comme archivedAt : aucune nouvelle clé de
// stockage, purgée avec le reste par le reset complet des Paramètres.
export const setDayNote = (planning, dayKey, note) =>
  persist(mapDay(planning, dayKey, (day) => ({ ...day, note: String(note ?? '').slice(0, 280) })));

export const removeBlock = (planning, dayKey, blockId) =>
  persist(
    mapDay(planning, dayKey, (day) => ({
      ...day,
      blocks: day.blocks.filter((b) => b.id !== blockId),
    }))
  );

export const addTag = (planning, dayKey, blockId, { label, category }) =>
  persist(
    mapBlock(planning, dayKey, blockId, (b) => ({
      ...b,
      tags: [
        ...b.tags,
        { id: uid('tag'), label, category, weight: null, sets: null, rest: null },
      ],
    }))
  );

export const updateTag = (planning, dayKey, blockId, tagId, values) =>
  persist(
    mapBlock(planning, dayKey, blockId, (b) => ({
      ...b,
      tags: b.tags.map((t) => (t.id === tagId ? { ...t, ...values } : t)),
    }))
  );

export const removeTag = (planning, dayKey, blockId, tagId) =>
  persist(
    mapBlock(planning, dayKey, blockId, (b) => ({
      ...b,
      tags: b.tags.filter((t) => t.id !== tagId),
    }))
  );

export const countDay = (planning, dayKey) => {
  const day = planning[dayKey] ?? emptyDay();
  return {
    blocks: day.blocks.length,
    tags: day.blocks.reduce((n, b) => n + b.tags.length, 0),
  };
};

/* ---------------------------------------------------------------- archives */

export const loadArchives = async () => {
  try {
    const raw = await AsyncStorage.getItem(PLANNING_ARCHIVES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const persistArchives = async (list) => {
  try {
    await AsyncStorage.setItem(PLANNING_ARCHIVES_KEY, JSON.stringify(list));
  } catch {}
  return list;
};

/**
 * Fige le jour : copie ses blocs dans les archives ET verrouille le jour sur
 * place (il reste visible en lecture seule, cf. maquette recap_3). Le planning
 * n'est pas vidé — c'est un modèle de semaine qu'on rouvre pour la suivante,
 * via reopenDay().
 */
export const archiveDay = async (planning, dayKey) => {
  const day = planning[dayKey] ?? emptyDay();
  const entry = {
    id: uid('arch'),
    dayKey,
    date: new Date().toISOString(),
    blocks: JSON.parse(JSON.stringify(day.blocks)),
    note: day.note || '',
  };
  const archives = await loadArchives();
  await persistArchives([entry, ...archives]);
  const next = await persist(
    mapDay(planning, dayKey, (d) => ({ ...d, archivedAt: entry.date }))
  );
  return { planning: next, entry };
};

export const reopenDay = (planning, dayKey) =>
  persist(mapDay(planning, dayKey, (d) => ({ ...d, archivedAt: null })));

/**
 * Même principe qu'archiveDay mais pour un seul bloc : l'entrée d'archive ne
 * contient que ce bloc, et se range dans les archives du même jour. Chaque
 * archivage crée sa propre ligne datée — le regroupement des archives
 * partielles dans l'entrée précédente n'a jamais été spécifié.
 */
export const archiveBlock = async (planning, dayKey, blockId) => {
  const day = planning[dayKey] ?? emptyDay();
  const block = day.blocks.find((b) => b.id === blockId);
  if (!block) return { planning, entry: null };

  const entry = {
    id: uid('arch'),
    dayKey,
    date: new Date().toISOString(),
    blocks: [JSON.parse(JSON.stringify(block))],
  };
  const archives = await loadArchives();
  await persistArchives([entry, ...archives]);
  const next = await persist(
    mapBlock(planning, dayKey, blockId, (b) => ({ ...b, archivedAt: entry.date }))
  );
  return { planning: next, entry };
};

export const reopenBlock = (planning, dayKey, blockId) =>
  persist(mapBlock(planning, dayKey, blockId, (b) => ({ ...b, archivedAt: null })));

export const archivesForDay = (archives, dayKey) =>
  archives
    .filter((a) => a.dayKey === dayKey)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

export const countArchive = (entry) => ({
  blocks: entry.blocks.length,
  tags: entry.blocks.reduce((n, b) => n + b.tags.length, 0),
});

export const removeArchive = async (id) => {
  const list = await loadArchives();
  return persistArchives(list.filter((a) => a.id !== id));
};

/* ------------------------------------------------------------- indicateurs */

// Lundi 00:00 de la semaine en cours.
const startOfWeek = () => {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - (isoOf(now) - 1));
  return monday;
};

/**
 * Jours de la semaine en cours où un chrono a déjà été lancé — alimente le
 * point jaune du carrousel. Prend la liste brute de flexTimer_history.
 */
export const daysUsedThisWeek = (sessions) => {
  const from = startOfWeek().getTime();
  const used = new Set();
  (sessions || []).forEach((s) => {
    const d = new Date(s.date);
    if (isNaN(d) || d.getTime() < from) return;
    const day = DAYS.find((x) => x.iso === isoOf(d));
    if (day) used.add(day.key);
  });
  return used;
};

const MONTHS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

export const formatArchiveDate = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
