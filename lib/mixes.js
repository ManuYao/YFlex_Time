import AsyncStorage from '@react-native-async-storage/async-storage';

export const LIBRARY_KEY = 'flexTimer_mixes';
export const CURRENT_KEY = 'flexTimer_currentMix';
export const LEGACY_ACTIVE_KEY = 'flexTimer_activeMixId';
export const LIBRARY_MIGRATION_KEY = 'flexTimer_libraryMigrated_v2';

export const makeDefaultMix = () => ({
  id: `mix_${Date.now()}`,
  name: 'Mon WOD',
  blocks: [
    { id: 'b1', type: 'amrap', label: 'Échauffement', role: 'warmup', duration: 180, rest: 0, rounds: 1 },
    { id: 'b2', type: 'rest', label: 'Repos', role: 'rest', duration: 60, rest: 0, rounds: 1 },
    { id: 'b3', type: 'tabata', label: 'HIIT principal', role: 'main', duration: 20, rest: 10, rounds: 8 },
    { id: 'b4', type: 'rest', label: 'Récup', role: 'recovery', duration: 120, rest: 0, rounds: 1 },
    { id: 'b5', type: 'amrap', label: 'Retour au calme', role: 'cooldown', duration: 300, rest: 0, rounds: 1 },
  ],
});

// Le MIX « Mon WOD » fourni à l'installation : le remplacer ne perd rien, donc
// inutile de le ranger dans « Mes mix » avant de le remplacer.
export const isDefaultMix = (mix) =>
  JSON.stringify(mix?.blocks) === JSON.stringify(makeDefaultMix().blocks);

/**
 * Empreinte du CONTENU d'un mix (nom + blocs), indépendante de l'ordre des
 * champs et des champs vides : sert à savoir si le brouillon du constructeur a
 * changé depuis qu'il a été chargé ou enregistré. Un champ absent et un champ
 * vide (`note: ''`) comptent pour pareil : poser un champ vide n'est pas une
 * modification.
 */
export const mixSignature = (mix) => {
  const blocks = (mix?.blocks || []).map((b) => {
    const out = {};
    for (const k of Object.keys(b || {}).sort()) {
      const v = b[k];
      // L'id d'un bloc est un détail interne (régénéré à chaque import) : le
      // contenu, lui, ne change pas.
      if (k === 'id' || v === undefined || v === null || v === '') continue;
      out[k] = v;
    }
    return out;
  });
  return JSON.stringify({ name: String(mix?.name || '').trim(), blocks });
};

/**
 * Ce mix de la bibliothèque vient-il du fil public (créé par quelqu'un
 * d'autre) ? `fromFeed` est posé à l'enregistrement depuis le fil ; les entrées
 * plus anciennes n'ont que l'id `mix_pub_<id du fil>`. `ownIds` = les id du fil
 * de MES publications : un de mes propres mix repris du fil pour le modifier
 * porte le même genre d'id, il reste « à moi ».
 */
export const isFeedMix = (mix, ownIds) => {
  if (!mix || mix.own) return false;
  if (mix.fromFeed) return true;
  const id = String(mix.id || '');
  if (!id.startsWith('mix_pub_')) return false;
  return !(ownIds && ownIds.has(id.slice('mix_pub_'.length)));
};

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

export const addToLibrary = async (mixIn) => {
  const list = await loadLibrary();
  const i = list.findIndex((m) => m.id === mixIn.id);
  // Le lien vers la publication (`publishedId`) survit à un réenregistrement :
  // un brouillon recopié sans ce champ ne doit pas « dépublier » le mix en
  // silence. Pour le retirer exprès : markPublished (TimersContext).
  const mix =
    i >= 0 && !mixIn.publishedId && list[i].publishedId
      ? { ...mixIn, publishedId: list[i].publishedId }
      : mixIn;
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