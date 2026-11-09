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
  countSessionsByTimer,
} from './history';
import { markAllUnlockedSeen } from './badgeCelebration';

const TABLE = 'workout_sessions';
const PAGE = 1000;
const BATCH = 200;

let running = false;
let rerun = false;

// `raw` = texte tel que stocké : sert à ne PAS réécrire l'historique quand la
// synchronisation n'a rien changé (voir runOnce).
const readLocalRaw = async () => {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return { list: Array.isArray(list) ? list : [], raw };
  } catch {
    return { list: [], raw: null };
  }
};
const readLocal = async () => (await readLocalRaw()).list;

// Rend la main au fil JavaScript (touches, animations) entre deux grosses étapes :
// la synchronisation part 2 s après la fin d'une séance, pile quand on navigue.
const yieldToUi = () => new Promise((resolve) => setTimeout(resolve, 0));

// Tri chronologique : la date est lue UNE fois par séance (avant : deux `new Date`
// à chaque comparaison). Même ordre qu'avant, comparateur identique.
const sortByDate = (list) =>
  list
    .map((s) => [new Date(s.date).getTime(), s])
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1]);

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
  await yieldToUi();
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const local = await readLocal();
  const localIds = new Set(local.map((s) => s.id));
  const tombstones = await readTombstones();
  const tombSet = new Set(tombstones);
  await yieldToUi();

  const toPush = [];
  const merged = [];
  // Séances qui n'existaient que dans le cloud (nouveau téléphone, réinstall).
  let restored = 0;

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
    restored += 1;
  }

  for (const id of tombstones) toPush.push({ id, data: {}, deleted: true });

  if (toPush.length) await push(userId, toPush);
  await clearTombstones(tombstones);
  await yieldToUi();

  // Une séance enregistrée pendant la synchronisation ne doit pas être écrasée
  // (relue juste avant l'écriture : pas de pause entre les deux).
  const freshRead = await readLocalRaw();
  const extras = freshRead.list.filter((s) => !localIds.has(s.id));
  const finalList = sortByDate([...merged, ...extras]);
  const finalJson = JSON.stringify(finalList);
  // Le plus souvent la synchronisation ne change rien : réécrire tout l'historique
  // (octet pour octet identique) ne servait qu'à occuper le fil et le stockage.
  if (finalJson !== freshRead.raw) await AsyncStorage.setItem(HISTORY_KEY, finalJson);

  // Des séances viennent d'arriver du cloud : les médailles qu'elles font
  // atteindre ont été gagnées (et fêtées) sur un autre appareil. Sans ça, se
  // reconnecter sur un nouveau téléphone les annoncerait toutes d'un coup.
  if (restored > 0) {
    try {
      await markAllUnlockedSeen(countSessionsByTimer(finalList));
    } catch {
      // Pire cas : quelques médailles annoncées en trop. Jamais bloquant.
    }
  }

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
