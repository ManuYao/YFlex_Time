// Blocage d'auteurs (supabase-moderation.sql, table user_blocks) : plus aucun de
// leurs mix ni de leurs commentaires chez la personne qui bloque. C'est un
// masquage « pour moi » — l'autre ne le sait pas, rien n'est supprimé pour les
// autres. Il faut un compte (la liste suit la personne d'un téléphone à l'autre).
//
// Même contrat que lib/publicMixes.js : aucune fonction ne lève, chacune rend
// `{ ok: true }` ou `{ ok: false, reason }` avec reason ∈ 'unavailable' (Supabase
// non configuré ou table pas encore créée), 'network', 'invalid'.
//
// L'état vit dans ce module (pas dans un composant) : le fil public, les
// commentaires et les Paramètres lisent la MÊME liste, et un blocage fait depuis
// l'un est vu tout de suite par les autres (même principe que hooks/useAPKCheck).
import { supabase, isSupabaseConfigured } from './supabase';
import { clipChars } from './text';

const BLOCKS = 'user_blocks';

const isMissingTable = (error) =>
  error?.code === 'PGRST205' ||
  error?.code === '42P01' ||
  /schema cache|does not exist/i.test(error?.message || '');
const fail = (error) => ({ ok: false, reason: isMissingTable(error) ? 'unavailable' : 'network' });

// `map` : { [idBloqué]: pseudo au moment du blocage }. Toujours REMPLACÉ, jamais
// modifié sur place : React compare les références.
let state = { userId: null, loaded: false, map: {} };
let inflight = null; // { userId, promise }
const listeners = new Set();

const setState = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const subscribeBlocks = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getBlocksState = () => state;

/**
 * Charge MES blocages (une fois par compte). Sans compte : liste vide. Un échec
 * n'est jamais bloquant : la liste reste vide, rien n'est masqué.
 */
export function ensureBlocks(userId) {
  if (!userId || !isSupabaseConfigured) {
    if (state.userId !== null || !state.loaded) setState({ userId: null, loaded: true, map: {} });
    return Promise.resolve({ ok: true });
  }
  if (state.userId === userId && state.loaded) return Promise.resolve({ ok: true });
  if (inflight && inflight.userId === userId) return inflight.promise;

  // Autre compte que celui déjà chargé : on repart de zéro.
  if (state.userId !== userId) setState({ userId, loaded: false, map: {} });

  const promise = (async () => {
    try {
      const { data, error } = await supabase.from(BLOCKS).select('blocked_id,blocked_name');
      if (state.userId !== userId) return { ok: false, reason: 'network' }; // changé entre-temps
      if (error) {
        setState({ loaded: true, map: {} });
        return fail(error);
      }
      const map = {};
      for (const r of data || []) map[r.blocked_id] = String(r.blocked_name || '');
      setState({ loaded: true, map });
      return { ok: true };
    } catch {
      if (state.userId === userId) setState({ loaded: true });
      return { ok: false, reason: 'network' };
    } finally {
      if (inflight && inflight.userId === userId) inflight = null;
    }
  })();
  inflight = { userId, promise };
  return promise;
}

/** Bloque quelqu'un. Mis à jour tout de suite à l'écran, annulé si la base refuse. */
export async function blockUser(userId, blockedId, name) {
  if (!isSupabaseConfigured) return { ok: false, reason: 'unavailable' };
  if (!userId || !blockedId || userId === blockedId) return { ok: false, reason: 'invalid' };
  const cleanName = clipChars(String(name || '').trim(), 20);
  const before = state.map;
  if (state.userId !== userId) setState({ userId, loaded: true, map: {} });
  setState({ map: { ...state.map, [blockedId]: cleanName } });
  try {
    const { error } = await supabase
      .from(BLOCKS)
      .insert({ blocker_id: userId, blocked_id: blockedId, blocked_name: cleanName });
    // 23505 = déjà bloqué : c'est un succès.
    if (error && error.code !== '23505') {
      setState({ map: before });
      return fail(error);
    }
    return { ok: true };
  } catch {
    setState({ map: before });
    return { ok: false, reason: 'network' };
  }
}

/** Débloque quelqu'un. Même principe : tout de suite à l'écran, annulé si la base refuse. */
export async function unblockUser(userId, blockedId) {
  if (!isSupabaseConfigured) return { ok: false, reason: 'unavailable' };
  if (!userId || !blockedId) return { ok: false, reason: 'invalid' };
  const before = state.map;
  const next = { ...state.map };
  delete next[blockedId];
  setState({ map: next });
  try {
    const { error } = await supabase
      .from(BLOCKS)
      .delete()
      .eq('blocker_id', userId)
      .eq('blocked_id', blockedId);
    if (error) {
      setState({ map: before });
      return fail(error);
    }
    return { ok: true };
  } catch {
    setState({ map: before });
    return { ok: false, reason: 'network' };
  }
}

/** À la déconnexion / suppression du compte : plus rien n'est masqué. */
export function resetBlocks() {
  inflight = null;
  setState({ userId: null, loaded: false, map: {} });
}
