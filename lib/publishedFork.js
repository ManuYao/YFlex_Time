// Enregistrer un mix PUBLIÉ après l'avoir modifié (constructeur MIX) : l'utilisateur
// choisit entre mettre à jour le fil public ou GARDER sa version pour lui. Dans le
// second cas, la version modifiée devient un mix privé à part (« Mes créations
// privées ») et le mix publié reste tel qu'il est en ligne (« Mes mix publiés »).
//
// Fichier PUR (aucun import React Native), testable directement avec `node`.

// Le mix partagé a des noms uniques dans « Mes mix » : la copie privée prend le
// nom tapé s'il est libre, sinon « Nom (privé) », « Nom (privé 2) »… dans la
// limite de 28 caractères (celle des noms de mix).
export const privateCopyName = (name, takenNames = [], max = 28) => {
  const base = String(name || '').trim() || 'Sans nom';
  const taken = new Set((takenNames || []).map((n) => String(n || '').trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base.slice(0, max);
  for (let n = 1; n < 100; n += 1) {
    const suffix = n === 1 ? ' (privé)' : ` (privé ${n})`;
    const room = Math.max(1, max - suffix.length);
    const candidate = `${base.slice(0, room).trimEnd()}${suffix}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base.slice(0, Math.max(1, max - 6))} ${String(Date.now()).slice(-5)}`;
};

// Le mix publié local reprend EXACTEMENT ce qui est en ligne (nom, blocs, couleur,
// note). `online` = résultat de sanitizeImportedPayload sur la publication.
// Tout le reste (id, uid, publishedId, pause…) est celui de l'entrée d'origine.
export const restoreFromPublication = (original, online) => {
  if (!original || !online) return original;
  const { color: _color, note: _note, ...rest } = original;
  return {
    ...rest,
    name: online.name,
    blocks: online.blocks,
    ...(online.color ? { color: online.color } : {}),
    ...(online.note ? { note: online.note } : {}),
  };
};
