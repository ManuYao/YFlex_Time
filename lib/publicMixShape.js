// Forme des mixes du FIL PUBLIC (supabase-fil-public.sql), sans aucun réseau :
// fichier PUR, sans import React Native, testable directement avec `node`
// comme lib/mixShare.js. Les appels Supabase vivent dans lib/publicMixes.js.
//
// Règle d'or : on ne fait jamais confiance à ce qui vient de la base. Une
// ligne du fil peut avoir été écrite par n'importe quel client — tout ce qui
// devient un vrai mix local repasse par sanitizeImportedPayload (bornes,
// types connus, ids régénérés), comme pour un lien de partage.
import { buildSharePayload, sanitizeImportedPayload } from './mixShare';
import { getMixTotalDuration, hasEstimatedDuration } from './mix-blocks';
import { DISCIPLINES } from './disciplines';

// Mêmes bornes que les contraintes SQL : un mix refusé par la base l'est
// d'abord ici, avec une phrase lisible plutôt qu'une erreur technique.
export const MAX_PUBLISHED_BLOCKS = 60;
export const MAX_PUBLISHED_MIXES = 30;

export const FEED_SORTS = [
  { id: 'recent', label: 'RÉCENTS' },
  { id: 'top', label: 'MIEUX NOTÉS' },
];

// Motifs de signalement, mêmes ids que la contrainte de mix_reports (SQL).
export const REPORT_REASONS = [
  { id: 'inappropriate', label: 'Contenu inapproprié' },
  { id: 'spam', label: 'Spam ou pub' },
  { id: 'dangerous', label: 'Dangereux' },
  { id: 'other', label: 'Autre' },
];

export const isValidReportReason = (id) => REPORT_REASONS.some((r) => r.id === id);

export const isValidCategory = (id) => DISCIPLINES.some((d) => d.id === id);

/** { ok: true } ou { ok: false, reason } — reason = phrase affichable. */
export const checkPublishable = (mix) => {
  const name = String(mix?.name || '').trim();
  if (!name) return { ok: false, reason: 'Donne un nom à ton mix pour le publier.' };
  const count = mix?.blocks?.length || 0;
  if (count === 0) return { ok: false, reason: 'Ajoute au moins un bloc avant de publier.' };
  if (count > MAX_PUBLISHED_BLOCKS) {
    return { ok: false, reason: `Ce mix est trop long pour être publié (${MAX_PUBLISHED_BLOCKS} blocs maximum).` };
  }
  return { ok: true };
};

/** Ligne à insérer dans shared_mixes. `category` doit déjà être validée. */
export const buildInsertRow = (mix, { ownerId, authorName, category }) => {
  const payload = buildSharePayload(mix);
  return {
    owner_id: ownerId,
    author_name: String(authorName || '').trim().slice(0, 20),
    name: payload.name.trim(),
    category,
    payload,
    block_count: payload.blocks.length,
    duration_seconds: Math.max(0, Math.round(getMixTotalDuration(mix.blocks))),
  };
};

/** Ligne SQL → objet prêt pour l'écran. Ne lève jamais. */
export const rowToFeedItem = (row) => {
  const blocks = Array.isArray(row?.payload?.blocks) ? row.payload.blocks : [];
  return {
    id: String(row?.id ?? ''),
    ownerId: row?.owner_id ?? null,
    name: String(row?.name ?? ''),
    author: String(row?.author_name ?? ''),
    category: isValidCategory(row?.category) ? row.category : 'other',
    // Pour la bande de couleurs : un type par bloc, dans l'ordre.
    blockTypes: blocks.map((b) => b?.type).filter((t) => typeof t === 'string'),
    blockCount: Number(row?.block_count) || blocks.length,
    durationSeconds: Number(row?.duration_seconds) || 0,
    estimate: hasEstimatedDuration(blocks),
    ratingAvg: Number(row?.rating_avg) || 0,
    ratingCount: Number(row?.rating_count) || 0,
    createdAt: row?.created_at ?? null,
    payload: row?.payload ?? null,
  };
};

/**
 * Mix local exploitable (pour « Tester » / « Enregistrer »), ou `null` si rien
 * de valide ne survit. L'id dérive de celui du fil : enregistrer deux fois le
 * même mix remplace l'entrée de la bibliothèque au lieu de la dupliquer.
 */
export const feedItemToMix = (item) => {
  const mix = sanitizeImportedPayload(item?.payload);
  if (!mix) return null;
  return { ...mix, id: `mix_pub_${item.id}` };
};

/** « 32 min », « 45 s », « 1h05 » — préfixé de « ~ » si la durée est estimée. */
export const formatFeedDuration = (seconds, estimate = false) => {
  const s = Math.max(0, Math.round(seconds || 0));
  let out;
  if (s < 60) out = `${s} s`;
  else if (s < 3600) out = `${Math.round(s / 60)} min`;
  else out = `${Math.floor(s / 3600)}h${String(Math.round((s % 3600) / 60)).padStart(2, '0')}`;
  return estimate ? `~${out}` : out;
};

/** « 4,5 · 12 avis » ou « Pas encore noté ». */
export const formatRating = (avg, count) => {
  if (!count) return 'Pas encore noté';
  const value = (Math.round(avg * 10) / 10).toFixed(1).replace('.', ',');
  return `${value} · ${count} avis`;
};
