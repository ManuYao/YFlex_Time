import AsyncStorage from '@react-native-async-storage/async-storage';

export const MIXES_KEY = 'flexTimer_mixes';
export const ACTIVE_MIX_KEY = 'flexTimer_activeMixId';

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

export const loadMixes = async () => {
  try {
    const raw = await AsyncStorage.getItem(MIXES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (list.length === 0) {
      const def = makeDefaultMix();
      await AsyncStorage.setItem(MIXES_KEY, JSON.stringify([def]));
      return [def];
    }
    return list;
  } catch {
    return [makeDefaultMix()];
  }
};

export const saveMixes = async (list) => {
  try {
    await AsyncStorage.setItem(MIXES_KEY, JSON.stringify(list));
  } catch {}
};

export const upsertMix = async (mix) => {
  const list = await loadMixes();
  const i = list.findIndex((m) => m.id === mix.id);
  const next = i >= 0 ? list.map((m) => (m.id === mix.id ? mix : m)) : [...list, mix];
  await saveMixes(next);
  return next;
};

export const removeMix = async (id) => {
  const list = await loadMixes();
  const next = list.filter((m) => m.id !== id);
  await saveMixes(next);
  return next;
};

export const loadActiveMixId = async () => {
  try {
    return (await AsyncStorage.getItem(ACTIVE_MIX_KEY)) || null;
  } catch {
    return null;
  }
};

export const setActiveMixId = async (id) => {
  try {
    if (id) await AsyncStorage.setItem(ACTIVE_MIX_KEY, id);
    else await AsyncStorage.removeItem(ACTIVE_MIX_KEY);
  } catch {}
};
