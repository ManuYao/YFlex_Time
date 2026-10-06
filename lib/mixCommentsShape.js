// Commentaires des mix publiés (supabase-commentaires.sql), sans aucun réseau :
// fichier PUR, sans import React Native, testable directement avec `node`
// comme lib/publicMixShape.js. Les appels Supabase vivent dans lib/mixComments.js.
//
// Règles (demande utilisateur, v16.4.0) :
//  - FILS (commentaires racine) : quelqu'un qui n'est pas l'auteur du mix en
//    ouvre 3 au maximum sur un même mix — il ne multiplie pas, à lui seul, les
//    blocs de discussion indépendants ;
//  - RÉPONSES : illimitées, dans n'importe quel fil, aux autres comme à
//    soi-même ; la limite ne vise QUE la création de fils ;
//  - chacun modifie et supprime SES commentaires ;
//  - l'auteur du mix commente sans aucune limite.
// La base les applique (triggers) ; ce fichier les redit côté app pour prévenir
// proprement AVANT d'envoyer, avec une phrase lisible plutôt qu'une erreur.

export const MAX_ROOT_COMMENTS = 3;
export const MAX_COMMENT_LENGTH = 500;
// 3 likes ou plus : le commentaire est « approuvé par la communauté » et l'auteur
// du mix ne peut plus le retirer. Même seuil dans la base (owner_remove_comment,
// supabase-moderation.sql) : elle a le dernier mot, l'app ne fait que prévenir.
export const LIKES_TO_PROTECT = 3;

/** Ce commentaire est-il approuvé par la communauté (donc protégé du retrait par l'auteur du mix) ? */
export const isApproved = (comment) => (Number(comment?.likeCount) || 0) >= LIKES_TO_PROTECT;

/** Ligne SQL → commentaire prêt pour l'écran. Ne lève jamais. */
export const rowToComment = (row) => ({
  id: String(row?.id ?? ''),
  mixId: String(row?.mix_id ?? ''),
  authorId: row?.author_id ?? null,
  author: String(row?.author_name ?? 'Athlète'),
  // null = commentaire racine (ouvre un fil).
  parentId: row?.parent_id ?? null,
  // « Nom » à qui l'on répond dans le fil (affichage seulement).
  replyTo: row?.reply_to_name ? String(row.reply_to_name) : null,
  deleted: !!row?.deleted,
  // Retiré par l'AUTEUR DU MIX (supabase-moderation.sql) : même traitement qu'un
  // commentaire supprimé, mais l'écran dit qui l'a retiré.
  removed: !!row?.removed,
  // Nombre de likes (supabase-commentaires-likes.sql) ; 0 tant que la base ne le sait pas.
  likeCount: Number(row?.like_count) || 0,
  // Un commentaire supprimé garde sa place (ses réponses restent lisibles) mais
  // plus son texte.
  body: row?.deleted ? '' : String(row?.body ?? ''),
  createdAt: row?.created_at ?? null,
  editedAt: row?.edited_at ?? null,
});

const time = (iso) => {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
};

/**
 * Fils de discussion : chaque racine (la plus ancienne d'abord) avec ses
 * réponses (la plus ancienne d'abord). Une réponse dont la racine n'est plus là
 * est ignorée : elle n'aurait nulle part où s'afficher.
 */
export const buildThreads = (comments) => {
  const list = Array.isArray(comments) ? comments : [];
  const roots = list.filter((c) => !c.parentId).sort((a, b) => time(a.createdAt) - time(b.createdAt));
  const byParent = new Map();
  for (const c of list) {
    if (!c.parentId) continue;
    if (!byParent.has(c.parentId)) byParent.set(c.parentId, []);
    byParent.get(c.parentId).push(c);
  }
  return roots.map((root) => ({
    root,
    replies: (byParent.get(root.id) || []).sort((a, b) => time(a.createdAt) - time(b.createdAt)),
  }));
};

/** Nombre de fils (commentaires racine) ouverts par cette personne. */
export const countRootsBy = (comments, userId) =>
  userId ? (comments || []).filter((c) => !c.parentId && c.authorId === userId).length : 0;

/**
 * Où en est cette personne avec ses 3 fils sur ce mix ?
 * `unlimited` : l'auteur du mix, jamais limité.
 */
export const rootQuota = ({ comments, userId, ownerId }) => {
  const unlimited = !!userId && !!ownerId && userId === ownerId;
  const used = countRootsBy(comments, userId);
  const remaining = unlimited ? Infinity : Math.max(0, MAX_ROOT_COMMENTS - used);
  return {
    unlimited,
    used,
    max: unlimited ? Infinity : MAX_ROOT_COMMENTS,
    remaining,
    canStartThread: unlimited || remaining > 0,
  };
};

/** { ok: true, body } (nettoyé) ou { ok: false, reason } — reason = phrase affichable. */
export const validateBody = (text) => {
  const body = String(text ?? '').replace(/\s+$/g, '').replace(/^\s+/g, '');
  if (!body) return { ok: false, reason: 'Écris quelque chose avant d\'envoyer.' };
  if (body.length > MAX_COMMENT_LENGTH) {
    return { ok: false, reason: `Ton commentaire est trop long (${MAX_COMMENT_LENGTH} caractères maximum).` };
  }
  return { ok: true, body };
};

/** Racine d'un fil à laquelle rattacher une réponse : répondre à une réponse
 *  reste dans le même fil. */
export const threadRootIdOf = (comment) => comment.parentId ?? comment.id;

/** Le fil porte-t-il des réponses ? (supprimer une racine qui en a = masquer son texte). */
export const hasReplies = (comments, rootId) => (comments || []).some((c) => c.parentId === rootId);

/** « à l'instant », « il y a 5 min », « il y a 3 h », « il y a 2 j », puis la date. */
export const formatAgo = (iso, now = Date.now()) => {
  const t = time(iso);
  if (!t) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `il y a ${d} j`;
  const date = new Date(t);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
};

/** Phrase affichée quand la limite de fils est atteinte. */
export const ROOT_LIMIT_TEXT = `Tu as déjà ouvert ${MAX_ROOT_COMMENTS} fils sur ce mix. Réponds dans un fil existant : les réponses ne sont pas limitées.`;
