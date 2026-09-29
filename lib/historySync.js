// Synchronisation de l'historique avec Supabase (v15.2.0). Compte facultatif :
// sans connexion (ou sans Supabase configuré), tout est ignoré en silence et
// l'historique reste 100 % local, comme avant.
//
// Fusion par identifiant de séance, dans les deux sens :
//   - séance locale absente du cloud       → envoyée
//   - séance cloud absente de l'appareil   → téléchargée
//   - séance supprimée (pierre tombale)    → supprimée des deux côtés
//   - « Annuler la suppression » d'une séance en sursis gagne toujours
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  HISTORY_KEY,
  PENDING_DELETE_TTL_MS,
  readTombstones,
  clearTombstones,
} from './history';

const TABLE = 'workout_sessions';
const PAGE = 1000;
const BATCH = 200;

let running = false;
let rerun = false;

const readLocal = async () => {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const isExpiredPending = (s, now) =>
  !!s?.pendingDelete && now - new Date(s.date).getTime() >= PENDING_DELETE_TTL_MS;

async function fetchRemote(userId) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id,data,deleted')
      .eq('user_id', userId)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function push(userId, rows) {
  const stamp = new Date().toISOString();
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH).map((r) => ({
      user_id: userId,
      id: r.id,
      data: r.data,
      deleted: r.deleted,
      updated_at: stamp,
    }));
    const { error } = await supabase.from(TABLE).upsert(chunk, { onConflict: 'user_id,id' });
    if (error) throw error;
  }
}

async function runOnce() {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) return { ok: false, reason: 'signed-out' };

  const now = Date.now();
  const remote = await fetchRemote(userId);
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const local = await readLocal();
  const localIds = new Set(local.map((s) => s.id));
  const tombstones = await readTombstones();
  const tombSet = new Set(tombstones);

  const toPush = [];
  const merged = [];

  for (const s of local) {
    const r = remoteById.get(s.id);
    if (r?.deleted) continue; // supprimée ailleurs : on la retire ici aussi
    if (!r) {
      merged.push(s);
      toPush.push({ id: s.id, data: s, deleted: false });
      continue;
    }
    const localPending = !!s.pendingDelete;
    const remotePending = !!r.data?.pendingDelete;
    if (localPending && !remotePending) {
      merged.push(r.data); // gardée ailleurs : on suit
    } else {
      merged.push(s);
      if (!localPending && remotePending) toPush.push({ id: s.id, data: s, deleted: false });
    }
  }

  for (const r of remote) {
    if (localIds.has(r.id) || r.deleted || tombSet.has(r.id)) continue;
    if (isExpiredPending(r.data, now)) {
      toPush.push({ id: r.id, data: {}, deleted: true });
      continue;
    }
    merged.push(r.data);
  }

  for (const id of tombstones) toPush.push({ id, data: {}, deleted: true });

  if (toPush.length) await push(userId, toPush);
  await clearTombstones(tombstones);

  // Une séance enregistrée pendant la synchronisation ne doit pas être écrasée.
  const fresh = await readLocal();
  const extras = fresh.filter((s) => !localIds.has(s.id));
  const finalList = [...merged, ...extras].sort((a, b) => new Date(a.date) - new Date(b.date));
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(finalList));

  return { ok: true, pushed: toPush.length, total: finalList.length };
}

/**
 * Synchronise l'historique. Sans effet (et sans erreur) si Supabase n'est pas
 * configuré ou si personne n'est connecté. Un appel pendant une synchro en
 * cours en relance une seule autre juste après.
 */
export async function syncHistory() {
  if (!isSupabaseConfigured) return { ok: false, reason: 'not-configured' };
  if (running) {
    rerun = true;
    return { ok: false, reason: 'busy' };
  }
  running = true;
  try {
    return await runOnce();
  } catch {
    return { ok: false, reason: 'error' };
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      syncHistory();
    }
  }
}
