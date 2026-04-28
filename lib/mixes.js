import AsyncStorage from '@react-native-async-storage/async-storage';

export const LIBRARY_KEY = 'flexTimer_mixes';
export const CURRENT_KEY = 'flexTimer_currentMix';
export const LEGACY_ACTIVE_KEY = 'flexTimer_activeMixId';
export const LIBRARY_MIGRATION_KEY = 'flexTimer_libraryMigrated_v2';

export const makeDefaultMix = () => ({
  id: `mix_${Date.now()}`,
  name: 'Mon WOD',
  blocks: [
    { id: 'b1', type: 'amrap', label: 'Échauffement', duration: 180, rest: 0, rounds: 1 },
    { id: 'b2', type: 'rest', label: 'Repos', duration: 60, rest: 0, rounds: 1 },
    { id: 'b3', type: 'tabata', label: 'HIIT principal', duration: 20, rest: 10, rounds: 8 },
    { id: 'b4', type: 'rest', label: 'Récup', duration: 120, rest: 0, rounds: 1 },
    { id: 'b5', type: 'amrap', label: 'Retour au calme', duration: 300, rest: 0, rounds: 1 },
  ],
});

export const loadLibrary = async () => {
  try {
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLibrary = async (list) => {
  try {
    await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(list));
  } catch {}
};

export const addToLibrary = async (mix) => {
  const list = await loadLibrary();
  const i = list.findIndex((m) => m.id === mix.id);
  const next = i >= 0 ? list.map((m) => (m.id === mix.id ? mix : m)) : [...list, mix];
  await saveLibrary(next);
  return next;
};

export const removeFromLibrary = async (id) => {
  const list = await loadLibrary();
  const next = list.filter((m) => m.id !== id);
  await saveLibrary(next);
  return next;
};

export const saveCurrentMix = async (mix) => {
  try {
    await AsyncStorage.setItem(CURRENT_KEY, JSON.stringify(mix));
  } catch {}
};

// Returns { currentMix, library }. Performs two one-shot migrations:
// 1. If no currentMix yet, picks the legacy active mix (or first list entry,
//    or default) and promotes it.
// 2. If LIBRARY_MIGRATION_KEY isn't set, wipes the library so it only holds
//    explicit 3s-saves going forward. This catches users who already had a
//    currentMix from earlier dev builds where saves wrote to the library.
export const hydrateMixState = async () => {
  try {
    let currentMix = null;
    const curRaw = await AsyncStorage.getItem(CURRENT_KEY);
    const libBefore = await loadLibrary();
    const migratedBefore = await AsyncStorage.getItem(LIBRARY_MIGRATION_KEY);
    if (curRaw) {
      currentMix = JSON.parse(curRaw);
    } else {
      const legacyActiveId = await AsyncStorage.getItem(LEGACY_ACTIVE_KEY);
      currentMix =
        (legacyActiveId && libBefore.find((m) => m.id === legacyActiveId)) ||
        libBefore[0] ||
        makeDefaultMix();
      await saveCurrentMix(currentMix);
      await AsyncStorage.removeItem(LEGACY_ACTIVE_KEY);
    }

    let library;
    if (migratedBefore) {
      library = libBefore;
    } else {
      await saveLibrary([]);
      await AsyncStorage.setItem(LIBRARY_MIGRATION_KEY, '1');
      library = [];
    }

    return { currentMix, library };
  } catch {
    return { currentMix: makeDefaultMix(), library: [] };
  }
};