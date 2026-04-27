import AsyncStorage from '@react-native-async-storage/async-storage';

export const LIBRARY_KEY = 'flexTimer_mixes';
export const CURRENT_KEY = 'flexTimer_currentMix';
export const LEGACY_ACTIVE_KEY = 'flexTimer_activeMixId';

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

// Returns { currentMix, library }. Performs a one-shot migration on first
// run of the new storage model: picks the legacy active mix (or the first
// entry from the legacy list, or a fresh default) as the new currentMix,
// then wipes the library so it only holds explicit 3s-saves going forward.
export const hydrateMixState = async () => {
  try {
    const curRaw = await AsyncStorage.getItem(CURRENT_KEY);
    if (curRaw) {
      const lib = await loadLibrary();
      return { currentMix: JSON.parse(curRaw), library: lib };
    }
    // First run of the split-storage model.
    const legacyList = await loadLibrary();
    const legacyActiveId = await AsyncStorage.getItem(LEGACY_ACTIVE_KEY);
    let chosen = null;
    if (legacyActiveId) chosen = legacyList.find((m) => m.id === legacyActiveId) || null;
    if (!chosen && legacyList.length > 0) chosen = legacyList[0];
    if (!chosen) chosen = makeDefaultMix();
    await saveCurrentMix(chosen);
    await saveLibrary([]);
    await AsyncStorage.removeItem(LEGACY_ACTIVE_KEY);
    return { currentMix: chosen, library: [] };
  } catch {
    return { currentMix: makeDefaultMix(), library: [] };
  }
};