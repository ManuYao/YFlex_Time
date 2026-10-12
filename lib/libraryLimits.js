// Limites GRATUITES de la bibliothèque « Mes mix » (décision du 12/10/2026,
// qui remplace les quotas de lancement TABATA / MIX : lancer est illimité, c'est
// la taille de la bibliothèque qui distingue Premium).
//
//  - création : un mix fabriqué par la personne (et pas encore publié) — 3
//  - téléchargé : un mix pris dans le fil public ou reçu par lien — 5
//    Il reste « téléchargé » même modifié ou vidé : la classe ne dépend que de
//    l'origine (`fromFeed`), jamais du contenu.
//  - publié : géré à part (FREE_PUBLISHED_MIXES, lib/publicMixShape.js)
//
// Jamais de suppression forcée : une bibliothèque déjà au-dessus de la limite
// est gardée telle quelle, seul l'ajout est refusé. Premium = illimité.

export const FREE_CREATIONS = 3;
export const FREE_DOWNLOADS = 5;

export const LIMIT_BY_KIND = { creation: FREE_CREATIONS, download: FREE_DOWNLOADS };

// Un mix de la bibliothèque est-il « téléchargé » ? Même règle que
// lib/mixes.js isFeedMix, sans la liste de mes publications (non disponible hors
// écran) : `own` marque un de mes mix repris du fil.
export const isDownloaded = (mix) => {
  if (!mix || mix.own) return false;
  if (mix.fromFeed) return true;
  return String(mix.id || '').startsWith('mix_pub_');
};

// Une création qui est publiée compte dans la limite de publication, pas ici.
export const countLibrary = (library = []) => {
  let creation = 0;
  let download = 0;
  for (const m of library) {
    if (isDownloaded(m)) download += 1;
    else if (!m.publishedId) creation += 1;
  }
  return { creation, download };
};

export const hasRoomFor = (library, kind, isPremium) => {
  if (isPremium) return true;
  return countLibrary(library)[kind] < LIMIT_BY_KIND[kind];
};

// Mini pub/sub : le refus est décidé dans lib/mixes.js (aucun écran en main),
// la feuille « bibliothèque pleine » est montée une seule fois à la racine.
const listeners = new Set();
export const onLibraryLimit = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const emitLibraryLimit = (kind) => {
  listeners.forEach((fn) => fn(kind));
};
