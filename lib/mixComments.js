// Commentaires des mix publiés — appels Supabase (table et règles :
// supabase-commentaires.sql). Même contrat que lib/publicMixes.js : aucune
// fonction ne lève, chacune rend `{ ok: true, ... }` ou `{ ok: false, reason }`
// avec reason ∈ 'unavailable' (Supabase non configuré ou table pas encore
// créée), 'network', 'limit' (3 fils atteints), 'invalid', 'gone' (commentaire
// introuvable ou plus à toi). Les écrans n'ont qu'à traduire ces mots.
//
// LIRE ne demande jamais de compte ; ÉCRIRE en demande un (la base le refuse
// sinon, ce fichier ne fait que prévenir proprement avant).
import { supabase, isSupabaseConfigured } from './supabase';
import { MAX_ROOT_COMMENTS, rowToComment, validateBody } from './mixCommentsShape';
import { isValidReportReason } from './publicMixShape';
import { charCount, clipChars } from './text';

const COMMENTS = 'mix_comments';
const REPORTS = 'comment_reports';
const COLUMNS =
  'id,mix_id,author_id,author_name,parent_id,reply_to_name,body,deleted,created_at,edited_at';
// `removed` n'existe qu'une fois supabase-moderation.sql lancé : le demander
// avant ferait échouer TOUTE la lecture des commentaires. On l'essaie, et on
// retombe sur les colonnes de base si la base ne la connaît pas encore.
const COLUMNS_WITH_REMOVED = `${COLUMNS},removed`;
let removedColumnMissing = false;
const isMissingColumn = (error) =>
  error?.code === '42703' || /column .*does not exist|could not find the .* column/i.test(error?.message || '');
// Un mix très commenté ne doit pas tout charger : les plus anciens d'abord,
// les 300 premiers (les fils se lisent dans l'ordre).
const LIST_LIMIT = 300;

// Table pas encore créée (le SQL n'a pas été lancé) : PostgREST répond
// PGRST205, Postgres 42P01 — « pas encore ouvert » plutôt que « réseau ».
const isMissingTable = (error) =>
  error?.code === 'PGRST205' ||
  error?.code === '42P01' ||
  /schema cache|does not exist/i.test(error?.message || '');

const fail = (error) => ({ ok: false, reason: isMissingTable(error) ? 'unavailable' : 'network' });
const UNAVAILABLE = { ok: false, reason: 'unavailable' };
const NETWORK = { ok: false, reason: 'network' };

/** Les commentaires d'un mix, du plus ancien au plus récent : { ok, comments }. */
export async function fetchComments(mixId) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  if (!mixId) return { ok: true, comments: [] };
  try {
    const read = (columns) =>
      supabase
        .from(COMMENTS)
        .select(columns)
        .eq('mix_id', mixId)
        .order('created_at', { ascending: true })
        .limit(LIST_LIMIT);
    let { data, error } = await read(removedColumnMissing ? COLUMNS : COLUMNS_WITH_REMOVED);
    if (error && !removedColumnMissing && isMissingColumn(error)) {
      removedColumnMissing = true;
      ({ data, error } = await read(COLUMNS));
    }
    if (error) return fail(error);
    return { ok: true, comments: (data || []).map(rowToComment) };
  } catch {
    return NETWORK;
  }
}

/**
 * Nombre de commentaires vivants par mix, pour la pastille du fil :
 * { ok, counts: { [mixId]: n } }. Un échec n'est jamais bloquant, l'écran
 * n'affiche alors simplement pas de compteur.
 */
export async function fetchCommentCounts(mixIds) {
  if (!isSupabaseConfigured || !mixIds?.length) return { ok: true, counts: {} };
  try {
    const { data, error } = await supabase
      .from(COMMENTS)
      .select('mix_id')
      .in('mix_id', mixIds)
      .eq('deleted', false);
    if (error) return fail(error);
    const counts = {};
    for (const r of data || []) counts[r.mix_id] = (counts[r.mix_id] || 0) + 1;
    return { ok: true, counts };
  } catch {
    return NETWORK;
  }
}

/**
 * Ajoute un commentaire. `parentId` vide = nouveau FIL (limité à 3 pour qui
 * n'est pas l'auteur du mix, vérifié par la base) ; sinon réponse dans le fil
 * dont `parentId` est la racine (illimité).
 */
export async function addComment({ mixId, parentId = null, replyToName = null, body, userId, authorName }) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  const check = validateBody(body);
  if (!check.ok) return { ok: false, reason: 'invalid', message: check.reason };
  if (!userId) return { ok: false, reason: 'invalid', message: 'Connecte-toi pour commenter.' };
  if (!mixId) return { ok: false, reason: 'invalid', message: 'Mix introuvable.' };
  const name = clipChars(String(authorName || '').trim(), 20);
  if (charCount(name) < 2) return { ok: false, reason: 'invalid', message: 'Choisis un nom de profil pour commenter.' };
  try {
    const row = {
      mix_id: mixId,
      author_id: userId,
      author_name: name,
      parent_id: parentId || null,
      reply_to_name: parentId && replyToName ? clipChars(String(replyToName).trim(), 20) || null : null,
      body: check.body,
    };
    const { data, error } = await supabase.from(COMMENTS).insert(row).select(COLUMNS).single();
    if (error) {
      if (/Limite de \d+ fils/i.test(error.message || '')) {
        return { ok: false, reason: 'limit', max: MAX_ROOT_COMMENTS };
      }
      if (/Fil introuvable|Mix introuvable/i.test(error.message || '')) return { ok: false, reason: 'gone' };
      return fail(error);
    }
    return { ok: true, comment: rowToComment(data) };
  } catch {
    return NETWORK;
  }
}

/** Modifie le texte d'un de MES commentaires. */
export async function editComment(id, body, userId) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  const check = validateBody(body);
  if (!check.ok) return { ok: false, reason: 'invalid', message: check.reason };
  if (!id || !userId) return { ok: false, reason: 'invalid', message: 'Connecte-toi pour modifier.' };
  try {
    const { data, error } = await supabase
      .from(COMMENTS)
      .update({ body: check.body })
      .eq('id', id)
      .eq('author_id', userId)
      .select(COLUMNS)
      .maybeSingle();
    if (error) {
      if (/Commentaire supprimé/i.test(error.message || '')) return { ok: false, reason: 'gone' };
      return fail(error);
    }
    if (!data) return { ok: false, reason: 'gone' };
    return { ok: true, comment: rowToComment(data) };
  } catch {
    return NETWORK;
  }
}

/**
 * L'AUTEUR DU MIX retire un commentaire sur son mix (supabase-moderation.sql) :
 * le texte disparaît, l'écran affiche « Retiré par l'auteur du mix », les
 * réponses restent. La base vérifie que c'est bien le propriétaire du mix.
 * Rend { ok: true } ou { ok: false, reason: 'unavailable' | 'network' | 'forbidden' }.
 */
export async function removeCommentAsOwner(commentId) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  if (!commentId) return { ok: false, reason: 'invalid' };
  try {
    const { error } = await supabase.rpc('owner_remove_comment', { target: commentId });
    if (error) {
      // Fonction pas encore créée : PGRST202 (introuvable dans le cache), 42883.
      if (error.code === 'PGRST202' || error.code === '42883') return UNAVAILABLE;
      if (/Non autorisé|Connecte-toi/i.test(error.message || '')) return { ok: false, reason: 'forbidden' };
      return fail(error);
    }
    return { ok: true };
  } catch {
    return NETWORK;
  }
}

/** Mes signalements parmi ces commentaires : { ok, reported: [commentId, ...] } (RLS : seulement les miens). */
export async function fetchMyCommentReports(commentIds) {
  if (!isSupabaseConfigured || !commentIds?.length) return { ok: true, reported: [] };
  try {
    const { data, error } = await supabase.from(REPORTS).select('comment_id').in('comment_id', commentIds);
    if (error) return fail(error);
    return { ok: true, reported: (data || []).map((r) => r.comment_id) };
  } catch {
    return NETWORK;
  }
}

/**
 * Signale un commentaire (motifs : ceux des mix, `REPORT_REASONS`). Un second
 * signalement du même commentaire par la même personne est refusé par la base
 * (clé primaire) : on le traite comme un succès, la personne l'a bien déjà
 * signalé. Trois personnes différentes suffisent à le masquer (trigger SQL).
 */
export async function reportComment(commentId, userId, reason) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  if (!commentId || !userId || !isValidReportReason(reason)) return { ok: false, reason: 'invalid' };
  try {
    const { error } = await supabase
      .from(REPORTS)
      .insert({ comment_id: commentId, reporter_id: userId, reason });
    if (error && error.code !== '23505') return fail(error);
    return { ok: true };
  } catch {
    return NETWORK;
  }
}

/**
 * Supprime un de MES commentaires. Une racine qui a des réponses n'est pas
 * effacée : son texte est retiré (« Commentaire supprimé ») et les réponses des
 * autres restent lisibles. Elle compte alors toujours parmi les 3 fils de son
 * auteur. Sans réponse, la ligne disparaît pour de bon.
 * Rend { ok, soft } — `soft` = texte retiré seulement.
 */
export async function deleteComment({ id, userId, softDelete = false }) {
  if (!isSupabaseConfigured) return UNAVAILABLE;
  if (!id || !userId) return { ok: false, reason: 'invalid' };
  try {
    if (softDelete) {
      const { data, error } = await supabase
        .from(COMMENTS)
        .update({ deleted: true })
        .eq('id', id)
        .eq('author_id', userId)
        .select('id')
        .maybeSingle();
      if (error) return fail(error);
      if (!data) return { ok: false, reason: 'gone' };
      return { ok: true, soft: true };
    }
    const { error } = await supabase.from(COMMENTS).delete().eq('id', id).eq('author_id', userId);
    if (error) return fail(error);
    return { ok: true, soft: false };
  } catch {
    return NETWORK;
  }
}
