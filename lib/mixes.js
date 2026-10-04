import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  blocksSignature,
  ensureUid,
  findLibraryMatch,
  generateMixUid,
  mergeMixUpdate,
  readUid,
  uniqueMixName,
} from './mixIdentity';

// L'empreinte d'un mix vit dans lib/mixIdentity.js (fichier pur, testable sans
// React Native) ; ré-exportée ici pour les écrans qui l'importaient d'ici.
export { mixSignature } from './mixIdentity';

export const LIBRARY_KEY = 'flexTimer_mixes';
export const CURRENT_KEY = 'flexTimer_currentMix';
export const LEGACY_ACTIVE_KEY = 'flexTimer_activeMixId';
export const LIBRARY_MIGRATION_KEY = 'flexTimer_libraryMigrated_v2';

export const makeDefaultMix = () => ({
  id: `mix_${Date.now()}`,
  // Clé unique et durable du mix (lib/mixIdentity.js) : c'est elle, et non l'id
  // local, qui permet de reconnaître ce mix quand il voyage (lien, fil public).
  uid: generateMixUid(),
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

// Les écritures de « Mes mix » lisent la liste, la modifient puis la réécrivent :
// deux en même temps (double appui sur « Enregistrer ») liraient la même liste et
// la seconde écraserait la première. On les passe l'une après l'autre.
let writeChain = Promise.resolve();
const serialized = (task) => {
  const run = writeChain.then(task, task);
  writeChain = run.catch(() => {});
  return run;
};

export const addToLibrary = (mixIn) => serialized(() => addToLibraryNow(mixIn));

const addToLibraryNow = async (mixIn) => {
  const list = await loadLibrary();
  let i = list.findIndex((m) => m.id === mixIn.id);
  // Garde anti-doublon : un mix qui porte l'uid d'une entrée existante EST cette
  // entrée (lib/mixIdentity.js). On la met à jour sur place au lieu d'en ajouter
  // une deuxième — c'est le dernier rempart contre une double sauvegarde (double
  // appui, import répété), les écrans proposent déjà la mise à jour en amont.
  const uid = readUid(mixIn);
  if (i < 0 && uid) i = list.findIndex((m) => readUid(m) === uid);
  const target = i >= 0 ? list[i] : null;
  let mix = target && target.id !== mixIn.id ? { ...mixIn, id: target.id } : mixIn;
  // Le lien vers la publication (`publishedId`) survit à un réenregistrement :
  // un brouillon recopié sans ce champ ne doit pas « dépublier » le mix en
  // silence. Pour le retirer exprès : markPublished (TimersContext).
  if (target && !mix.publishedId && target.publishedId) mix = { ...mix, publishedId: target.publishedId };
  // L'identité ne se perd jamais en route : celle du mix reçu, sinon celle de
  // l'entrée remplacée, sinon une neuve.
  mix = ensureUid(target && !readUid(mix) && readUid(target) ? { ...mix, uid: readUid(target) } : mix);
  const next = target ? list.map((m, idx) => (idx === i ? mix : m)) : [...list, mix];
  await saveLibrary(next);
  return next;
};

/**
 * Reçoit un mix venu d'ailleurs (lien d'un ami, fil public) dans « Mes mix » —
 * l'unique porte d'entrée, qui applique la règle anti-doublon :
 *  - jamais vu            → ajouté (`'added'`), sous un nom libre ;
 *  - déjà là, même version → refusé (`'same'`), rien n'est écrit ;
 *  - déjà là, autre version → refusé (`'update'`) tant qu'on ne demande pas la
 *    mise à jour ; avec `update: true`, l'entrée existante est mise à jour sur
 *    place (`'updated'`) — jamais un deuxième exemplaire.
 * Rend `{ status, entry, library }` (`entry` = le mix tel qu'enregistré, ou celui
 * qui existait déjà).
 */
export const receiveMix = (incoming, options) => serialized(() => receiveMixNow(incoming, options));

const receiveMixNow = async (incoming, { update = false } = {}) => {
  const list = await loadLibrary();
  const match = findLibraryMatch(list, incoming);
  if (match && !(update && match.status === 'update')) {
    return { status: match.status, entry: match.entry, library: list };
  }
  if (match) {
    const entry = mergeMixUpdate(match.entry, incoming, list);
    const library = list.map((m) => (m.id === entry.id ? entry : m));
    await saveLibrary(library);
    return { status: 'updated', entry, library };
  }
  const entry = ensureUid({
    ...incoming,
    name: uniqueMixName(list, incoming.name),
    syncSig: blocksSignature(incoming.blocks),
  });
  const library = [...list, entry];
  await saveLibrary(library);
  return { status: 'added', entry, library };
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

    // Migration v16.8 : tout mix reçoit sa clé unique (uid) — les mix créés
    // avant n'en avaient pas. Le MIX courant et son entrée de « Mes mix » sont le
    // même mix : ils prennent le même uid.
    const libWithUids = library.map(ensureUid);
    const libraryChanged = libWithUids.some((m, i) => m !== library[i]);
    library = libWithUids;
    const sameEntry = library.find((m) => m.id === currentMix?.id);
    const curWithUid = sameEntry && !readUid(currentMix) ? { ...currentMix, uid: sameEntry.uid } : ensureUid(currentMix);
    if (libraryChanged) await saveLibrary(library);
    if (curWithUid !== currentMix) {
      currentMix = curWithUid;
      await saveCurrentMix(currentMix);
    }

    return { currentMix, library };
  } catch {
    return { currentMix: makeDefaultMix(), library: [] };
  }
};