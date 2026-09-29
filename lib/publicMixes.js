// Fil public de MIX — appels Supabase (tables et règles : supabase-fil-public.sql).
// Compte facultatif comme partout : LIRE le fil ne demande jamais de compte,
// PUBLIER et NOTER demandent d'être connecté (la base le refuse sinon, ce
// fichier ne fait que prévenir proprement avant).
//
// Aucune fonction ne lève : chacune rend `{ ok: true, ... }` ou
// `{ ok: false, reason }` avec reason ∈ 'unavailable' (Supabase non configuré
// ou tables pas encore créées), 'network', 'limit', 'invalid'. Les écrans
// n'ont qu'à traduire ces mots en phrases.
import { supabase, isSupabaseConfigured } from './supabase';
import {
  buildInsertRow,
  checkPublishable,
  isValidCategory,
  rowToFeedItem,
  MAX_PUBLISHED_MIXES,
} from './publicMixShape';

const MIXES = 'shared_mixes';
const RATINGS = 'mix_ratings';
const FEED_COLUMNS =
  'id,owner_id,name,author_name,category,payload,block_count,duration_seconds,rating_avg,rating_count,created_at';

// Tables pas encore créées (le SQL n'a pas été lancé) : PostgREST répond
// PGRST205, Postgres 42P01. On le distingue d'une panne réseau pour afficher
// « pas encore ouvert » plutôt que « vérifie ta connexion ».
const isMissingTable = (error) =>
  error?.code === 'PGRST205' ||
  error?.code === '42P01' ||
  /schema cache|does not exist/i.test(error?.message || '');

const fail = (error) => ({ ok: false, reason: isMissingTable(error) ? 'unavailable' : 'network' });

const UNAVAILABLE = { ok: false, reason: 'unavailable' };

/** Le fil public existe-t-il côté app ? (Supabase configuré.) */
export const isFeedConfigured = isSupabaseConfigured;

/** Fil public : `category` = id de discipline (ou vide pour tout), `sort` = 'recent' | 'top'. */
export async function fetchFeed({ category = null, sort = 'recent', limit = 30 } = {}) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  try {
    let query = supabase.from(MIXES).select(FEED_COLUMNS).limit(limit);
    if (category && isValidCategory(category)) query = query.eq('category', category);
    query =
      sort === 'top'
        ? query
            .order('rating_avg', { ascending: false })
            .order('rating_count', { ascending: false })
            .order('created_at', { ascending: false })
        : query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) return fail(error);
    return { ok: true, items: (data || []).map(rowToFeedItem) };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Mes notes sur ces mixes : { ok, ratings: { [mixId]: stars } } (RLS : seulement les miennes). */
export async function fetchMyRatings(mixIds) {
  if (!isSupabaseConfigured || !mixIds?.length) return { ok: true, ratings: {} };
  try {
    const { data, error } = await supabase.from(RATINGS).select('mix_id,stars').in('mix_id', mixIds);
    if (error) return fail(error);
    const ratings = {};
    for (const r of data || []) ratings[r.mix_id] = r.stars;
    return { ok: true, ratings };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Note un mix (1 à 5) ; rend la moyenne et le nombre d'avis mis à jour. */
export async function rateMix(mixId, userId, stars) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  const value = Math.round(Number(stars));
  if (!(value >= 1 && value <= 5) || !mixId || !userId) return { ok: false, reason: 'invalid' };
  try {
    const { error } = await supabase
      .from(RATINGS)
      .upsert({ mix_id: mixId, user_id: userId, stars: value }, { onConflict: 'mix_id,user_id' });
    if (error) return fail(error);
    const { data, error: readError } = await supabase
      .from(MIXES)
      .select('rating_avg,rating_count')
      .eq('id', mixId)
      .maybeSingle();
    if (readError || !data) return { ok: true, ratingAvg: null, ratingCount: null };
    return { ok: true, ratingAvg: Number(data.rating_avg) || 0, ratingCount: Number(data.rating_count) || 0 };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Mon mix publié sous ce nom, s'il existe : { ok, item | null }. */
export async function fetchMyPublished(name, userId) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  const clean = String(name || '').trim().slice(0, 28);
  if (!clean || !userId) return { ok: true, item: null };
  try {
    const { data, error } = await supabase
      .from(MIXES)
      .select(FEED_COLUMNS)
      .eq('owner_id', userId)
      .eq('name', clean)
      .maybeSingle();
    if (error) return fail(error);
    return { ok: true, item: data ? rowToFeedItem(data) : null };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/**
 * Publie un mix. Un mix déjà publié sous le même nom est retiré puis remplacé
 * (la base n'accepte pas la modification, pour que personne ne puisse
 * s'écrire une meilleure note) — les étoiles repartent donc de zéro.
 */
export async function publishMix(mix, { userId, authorName, category }) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  const check = checkPublishable(mix);
  if (!check.ok) return { ok: false, reason: 'invalid', message: check.reason };
  if (!userId) return { ok: false, reason: 'invalid', message: 'Connecte-toi pour publier.' };
  if (!isValidCategory(category)) return { ok: false, reason: 'invalid', message: 'Choisis une catégorie.' };
  try {
    const row = buildInsertRow(mix, { ownerId: userId, authorName, category });
    const { error: deleteError } = await supabase
      .from(MIXES)
      .delete()
      .eq('owner_id', userId)
      .eq('name', row.name);
    if (deleteError) return fail(deleteError);
    const { data, error } = await supabase.from(MIXES).insert(row).select(FEED_COLUMNS).single();
    if (error) {
      if (/Limite de \d+ mixes/i.test(error.message || '')) {
        return { ok: false, reason: 'limit', max: MAX_PUBLISHED_MIXES };
      }
      return fail(error);
    }
    return { ok: true, item: rowToFeedItem(data) };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Retire un de MES mixes du fil (la base refuse celui d'un autre). */
export async function unpublishMix(id) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  try {
    const { error } = await supabase.from(MIXES).delete().eq('id', id);
    if (error) return fail(error);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
