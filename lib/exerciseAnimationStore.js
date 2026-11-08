// Animations d'exercices : chargement du catalogue en ligne et des fichiers.
// (La logique pure — lien nom → animation, nettoyage du catalogue — est dans
// lib/exerciseAnimations.js.)
//
//   - Catalogue (table Supabase `exercise_animations`) : relu au plus toutes
//     les 12 h, gardé dans AsyncStorage ; sans réseau on rejoue la dernière
//     version connue, même ancienne. Jamais d'exception vers l'appelant.
//   - Fichiers (dossier public « animations ») : téléchargés UNE fois, au
//     premier besoin, puis gardés sur le téléphone (documentDirectory, pas le
//     cache que le système peut vider) : à la salle, sans réseau, l'animation
//     déjà vue s'affiche. Le nom du fichier contient sa version : une
//     animation refaite arrive sous un nouveau nom, l'ancien fichier est
//     supprimé au chargement suivant du catalogue.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

import { isSupabaseConfigured, supabase } from './supabase';
import { animationUrl, sanitizeCatalog } from './exerciseAnimations';

export const ANIM_CATALOG_KEY = 'flexTimer_animCatalog';
const CATALOG_TTL_MS = 12 * 60 * 60 * 1000;
const COLUMNS = 'id,version,group_id,names,keywords,file_path,width,height';
const DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}animations/` : null;
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || '';

let memo = null; // { at, catalog }
let inflight = null;
const downloads = new Map(); // fichier → promesse de l'adresse locale

const readCached = async () => {
  try {
    const raw = await AsyncStorage.getItem(ANIM_CATALOG_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return { at: Number(parsed.at) || 0, catalog: sanitizeCatalog(parsed.rows) };
  } catch {
    return null;
  }
};

const fetchRemote = async () => {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('exercise_animations').select(COLUMNS);
    if (error || !Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
};

// Supprime les fichiers qui ne sont plus au catalogue (anciennes versions).
// Les « .part » (téléchargement en cours) ne sont jamais touchés : un
// téléchargement lancé pendant le nettoyage échouerait. Silencieux.
const pruneFiles = async (catalog) => {
  if (!DIR) return;
  try {
    const keep = new Set(catalog.map((e) => e.file));
    const names = await FileSystem.readDirectoryAsync(DIR);
    await Promise.all(
      names
        .filter((n) => !keep.has(n) && !n.endsWith('.part'))
        .map((n) => FileSystem.deleteAsync(DIR + n, { idempotent: true }).catch(() => {}))
    );
  } catch {}
};

/** Catalogue nettoyé (liste, éventuellement vide). `force` ignore les 12 h. */
export const getAnimationCatalog = async ({ force = false } = {}) => {
  if (!force && memo && Date.now() - memo.at < CATALOG_TTL_MS) return memo.catalog;
  if (inflight) return inflight;
  inflight = (async () => {
    const cached = memo ?? (await readCached());
    if (!force && cached && Date.now() - cached.at < CATALOG_TTL_MS) {
      memo = cached;
      return cached.catalog;
    }
    const rows = await fetchRemote();
    if (!rows) {
      // Hors ligne ou erreur : la dernière version connue, sinon rien.
      if (cached) memo = cached;
      return cached?.catalog ?? [];
    }
    const catalog = sanitizeCatalog(rows);
    memo = { at: Date.now(), catalog };
    try {
      await AsyncStorage.setItem(ANIM_CATALOG_KEY, JSON.stringify({ at: memo.at, rows }));
    } catch {}
    pruneFiles(catalog);
    return catalog;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
};

/**
 * Adresse LOCALE (file://) du fichier d'une animation : déjà sur le téléphone,
 * sinon téléchargé maintenant. null si impossible (pas de réseau la première
 * fois, fichier absent en ligne…).
 */
export const getAnimationFile = async (entry) => {
  if (!DIR || !entry?.file) return null;
  const path = DIR + entry.file;
  if (downloads.has(entry.file)) return downloads.get(entry.file);
  const job = (async () => {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists && info.size > 0) return path;
      const url = animationUrl(SUPABASE_URL, entry);
      if (!url) return null;
      await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
      const part = `${path}.part`;
      const res = await FileSystem.downloadAsync(url, part);
      if (res?.status !== 200) {
        await FileSystem.deleteAsync(part, { idempotent: true }).catch(() => {});
        return null;
      }
      await FileSystem.moveAsync({ from: part, to: path });
      return path;
    } catch {
      return null;
    }
  })().finally(() => {
    downloads.delete(entry.file);
  });
  downloads.set(entry.file, job);
  return job;
};
