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
  isValidReportReason,
  rowToFeedItem,
  MAX_PUBLISHED_MIXES,
} from './publicMixShape';

const MIXES = 'shared_mixes';
const RATINGS = 'mix_ratings';
const REPORTS = 'mix_reports';
const FEED_COLUMNS =
  'id,owner_id,name,author_name,category,payload,block_count,duration_seconds,rating_avg,rating_count,created_at';

// Doublon sur la CLÉ UNIQUE du mix (index shared_mixes_owner_mix_uid de
// supabase-mix-uid.sql) : ce mix est déjà publié par la même personne, même sous
// un autre nom. À distinguer du doublon de NOM, qui se corrige en renommant.
const isUidDuplicate = (error) => /shared_mixes_owner_mix_uid/.test(error?.message || '');

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

/** Mes signalements parmi ces mixes : { ok, reported: [mixId, ...] } (RLS : seulement les miens). */
export async function fetchMyReports(mixIds) {
  if (!isSupabaseConfigured || !mixIds?.length) return { ok: true, reported: [] };
  try {
    const { data, error } = await supabase.from(REPORTS).select('mix_id').in('mix_id', mixIds);
    if (error) return fail(error);
    return { ok: true, reported: (data || []).map((r) => r.mix_id) };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/**
 * Signale un mix. Un second signalement du même mix par la même personne est
 * refusé par la base (clé primaire) : on le traite comme un succès, la personne
 * a bien déjà signalé. Trois personnes différentes suffisent à masquer le mix
 * (trigger SQL), en attendant que l'éditeur regarde la table mix_reports.
 */
export async function reportMix(mixId, userId, reason) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  if (!mixId || !userId || !isValidReportReason(reason)) return { ok: false, reason: 'invalid' };
  try {
    const { error } = await supabase
      .from(REPORTS)
      .insert({ mix_id: mixId, reporter_id: userId, reason });
    if (error && error.code !== '23505') return fail(error);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Tous MES mix publiés, le plus récent d'abord : { ok, items }. */
export async function fetchMyPublishedMixes(userId) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  if (!userId) return { ok: true, items: [] };
  try {
    const { data, error } = await supabase
      .from(MIXES)
      .select(FEED_COLUMNS)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) return fail(error);
    return { ok: true, items: (data || []).map(rowToFeedItem) };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Un de MES mix publiés, retrouvé par son id : { ok, item | null }. */
export async function fetchPublishedById(id, userId) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  if (!id || !userId) return { ok: true, item: null };
  try {
    const { data, error } = await supabase
      .from(MIXES)
      .select(FEED_COLUMNS)
      .eq('id', id)
      .eq('owner_id', userId)
      .maybeSingle();
    if (error) return fail(error);
    return { ok: true, item: data ? rowToFeedItem(data) : null };
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
 * Un AUTRE sportif a-t-il déjà publié un mix sous ce nom ? Le nom est unique dans
 * tout le fil public (sans tenir compte des majuscules) : sinon deux mix
 * « Full Body » se confondent, et personne ne se donnerait la peine de changer
 * le sien. Rend { ok: true, item | null } (null = nom libre pour moi).
 */
export async function fetchNameTakenByOther(name, userId) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  const clean = String(name || '').trim().slice(0, 28);
  if (!clean) return { ok: true, item: null };
  // ilike : « % » et « _ » sont des jokers, on les neutralise.
  const pattern = clean.replace(/[\\%_]/g, (c) => `\\${c}`);
  try {
    const { data, error } = await supabase
      .from(MIXES)
      .select('id,owner_id,name')
      .ilike('name', pattern)
      .limit(5);
    if (error) return fail(error);
    const other = (data || []).find((r) => r.owner_id !== userId) || null;
    return { ok: true, item: other };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/**
 * Publie un NOUVEAU mix (jusqu'à MAX_PUBLISHED_MIXES, un par nom). Un nom déjà
 * pris par un autre de mes mix publiés est refusé (`duplicate`) au lieu de
 * remplacer l'ancien en silence — c'était ce qui rendait la publication de
 * plusieurs mix difficile : deux mix qui portaient le même nom (tout nouveau
 * mix s'appelle « Mon WOD ») s'écrasaient. Pour mettre à jour un mix déjà
 * publié, voir updatePublishedMix.
 */
export async function publishMix(mix, { userId, authorName, category }) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  const check = checkPublishable(mix);
  if (!check.ok) return { ok: false, reason: 'invalid', message: check.reason };
  if (!userId) return { ok: false, reason: 'invalid', message: 'Connecte-toi pour publier.' };
  if (!isValidCategory(category)) return { ok: false, reason: 'invalid', message: 'Choisis une catégorie.' };
  try {
    const row = buildInsertRow(mix, { ownerId: userId, authorName, category });
    const { data, error } = await supabase.from(MIXES).insert(row).select(FEED_COLUMNS).single();
    if (error) {
      if (error.code === '23505') return { ok: false, reason: isUidDuplicate(error) ? 'already' : 'duplicate' };
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

/**
 * Modifie un de MES mix publiés (nom, blocs, catégorie) — v16.3.0. Avant, une
 * fois publié, un mix ne pouvait ni se corriger ni se retirer s'il avait changé
 * de nom : l'auteur était bloqué.
 *
 * UPDATE sur place, TOUJOURS : les étoiles, les commentaires et la date sont
 * gardés, une faute de frappe corrigée ne remet rien à zéro.
 *
 * ⚠️ Jamais de « retrait puis republication » d'un mix qui existe encore :
 * c'était le repli d'avant le 06/10/2026, et il effaçait les étoiles ET les
 * commentaires (le nouvel exemplaire a un autre id, les commentaires partent en
 * cascade avec l'ancien). Si la base refuse la modification (droit manquant :
 * supabase-mix-update.sql), on le dit (`forbidden`) et on ne touche à rien.
 *
 * Un seul cas republie : la publication n'existe PLUS (retirée ailleurs) — il n'y
 * a alors rien à perdre, le mix est remis en ligne (`republished: true`).
 *
 * Rend { ok: true, item, republished } ou { ok: false, reason, ... } avec reason ∈
 * 'unavailable', 'network', 'limit', 'invalid', 'duplicate' (nom pris),
 * 'already' (ce mix est déjà publié : clé unique en double),
 * 'forbidden' (la base refuse de modifier sur place).
 */
export async function updatePublishedMix(id, mix, { userId, authorName, category }) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  const check = checkPublishable(mix);
  if (!check.ok) return { ok: false, reason: 'invalid', message: check.reason };
  if (!id || !userId) return { ok: false, reason: 'invalid', message: 'Connecte-toi pour modifier ton mix.' };
  if (!isValidCategory(category)) return { ok: false, reason: 'invalid', message: 'Choisis une catégorie.' };
  try {
    const row = buildInsertRow(mix, { ownerId: userId, authorName, category });
    const { owner_id: _owner, ...fields } = row;

    const { data, error } = await supabase
      .from(MIXES)
      .update(fields)
      .eq('id', id)
      .eq('owner_id', userId)
      .select(FEED_COLUMNS)
      .maybeSingle();
    if (!error && data) return { ok: true, item: rowToFeedItem(data), republished: false };
    if (error?.code === '23505') return { ok: false, reason: isUidDuplicate(error) ? 'already' : 'duplicate' };
    const denied = !!error && (error.code === '42501' || /permission denied/i.test(error.message || ''));
    if (error && !denied) return fail(error);

    // Aucune ligne modifiée (ou droit refusé) : la publication existe-t-elle encore ?
    const existing = await fetchPublishedById(id, userId);
    if (!existing.ok) return existing;
    // Elle existe : c'est la base qui refuse. On NE remplace PAS (étoiles et
    // commentaires seraient perdus).
    if (existing.item) return { ok: false, reason: 'forbidden' };

    // Elle n'existe plus : rien à perdre, on la remet en ligne. D'abord s'assurer
    // que le nom est libre.
    const clash = await fetchMyPublished(row.name, userId);
    if (clash.ok && clash.item && clash.item.id !== id) return { ok: false, reason: 'duplicate' };
    const { data: inserted, error: insertError } = await supabase
      .from(MIXES)
      .insert(row)
      .select(FEED_COLUMNS)
      .single();
    if (insertError) {
      if (insertError.code === '23505') {
        return { ok: false, reason: isUidDuplicate(insertError) ? 'already' : 'duplicate' };
      }
      if (/Limite de \d+ mixes/i.test(insertError.message || '')) {
        return { ok: false, reason: 'limit', max: MAX_PUBLISHED_MIXES };
      }
      return fail(insertError);
    }
    return { ok: true, item: rowToFeedItem(inserted), republished: true };
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
