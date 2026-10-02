// Pseudos uniques entre comptes (supabase-pseudos.sql). Aucune fonction ne lève :
// { ok: true } ou { ok: false, reason } avec reason ∈ 'taken' (déjà pris),
// 'unavailable' (Supabase absent ou table pas encore créée), 'network'.
// 'unavailable' et 'network' ne bloquent jamais : le pseudo reste local, comme
// avant — l'unicité n'est exigée que là où elle peut être vérifiée.
import { supabase, isSupabaseConfigured } from './supabase';

const TABLE = 'pseudos';

/**
 * Clé de comparaison : mêmes règles que la colonne `pseudo_key` de la base
 * (minuscules, sans espaces, points, tirets ni accents). Sert à prévenir
 * AVANT d'écrire ; la base reste l'autorité.
 */
export const pseudoKey = (pseudo) =>
  String(pseudo || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s._-]+/g, '');

const UNAVAILABLE = { ok: false, reason: 'unavailable' };

const isMissingTable = (error) =>
  error?.code === 'PGRST205' ||
  error?.code === '42P01' ||
  /schema cache|does not exist/i.test(error?.message || '');

/** Un AUTRE compte porte-t-il déjà ce pseudo ? { ok: true, taken: boolean }. */
export async function isPseudoTaken(pseudo, userId = null) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  const key = pseudoKey(pseudo);
  if (!key) return { ok: true, taken: false };
  try {
    let query = supabase.from(TABLE).select('user_id').eq('pseudo_key', key).limit(1);
    if (userId) query = query.neq('user_id', userId);
    const { data, error } = await query;
    if (error) return isMissingTable(error) ? UNAVAILABLE : { ok: false, reason: 'network' };
    return { ok: true, taken: (data || []).length > 0 };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Réserve (ou change) le pseudo de ce compte. `taken` si un autre compte l'a déjà. */
export async function claimPseudo(userId, pseudo) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  const clean = String(pseudo || '').trim();
  if (!userId || !clean) return { ok: false, reason: 'invalid' };
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ user_id: userId, pseudo: clean, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) {
      if (error.code === '23505') return { ok: false, reason: 'taken' };
      return isMissingTable(error) ? UNAVAILABLE : { ok: false, reason: 'network' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

export const PSEUDO_TAKEN_TEXT = 'Ce nom est déjà pris par un autre sportif. Choisis-en un autre.';
