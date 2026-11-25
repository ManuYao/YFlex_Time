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
// Jamais de suppression forcée : seul l'ajout est refusé, et une bibliothèque
// au-dessus de la limite (fin de Premium) se règle en CHOISISSANT ses mix actifs :
// les autres passent en pause, sans rien perdre (voir « Mix EN PAUSE » plus bas).
// Premium = illimité.

export const FREE_CREATIONS = 3;
export const FREE_DOWNLOADS = 5;

export const LIMIT_BY_KIND = { creation: FREE_CREATIONS, download: FREE_DOWNLOADS };

// Un mix de la bibliothèque est-il « téléchargé » (reçu d'ailleurs) ? UNE seule
// règle, partagée avec lib/mixes.js isFeedMix et la feuille « Mes mix » : un mix
// créé ici ne doit jamais se retrouver rangé avec les mix des autres, ni
// l'inverse. `own` marque un de mes mix repris du fil.
//  - `fromFeed` : posé à l'enregistrement d'un mix du fil ou d'un lien d'ami ;
//  - `syncSig`  : la version reçue, posée par receiveMix et jamais sur un mix
//                 créé ici (filet pour une entrée dont `fromFeed` se serait perdu) ;
//  - id `mix_pub_…` : les enregistrements du fil d'avant les uid.
export const isDownloaded = (mix) => {
  if (!mix || mix.own) return false;
  if (mix.fromFeed || mix.syncSig) return true;
  return String(mix.id || '').startsWith('mix_pub_');
};

// Une création qui est publiée compte dans la limite de publication, pas ici.
// Un mix EN PAUSE (voir plus bas) ne compte pas : il ne prend aucune place.
export const countLibrary = (library = []) => {
  let creation = 0;
  let download = 0;
  for (const m of library) {
    if (m.paused) continue;
    if (isDownloaded(m)) download += 1;
    else if (!m.publishedId) creation += 1;
  }
  return { creation, download };
};

// ─── Mix EN PAUSE (perte de Premium) ─────────────────────────────────────────
// Quelqu'un qui perd Premium avec 7 mix créés alors que la limite gratuite est 3
// choisit ses 3 mix ACTIFS ; les autres passent « en pause » (`paused: true`) :
// ils restent sur le téléphone, rien n'est supprimé, ils ne se chargent ni ne se
// lancent plus tant qu'on n'est pas Premium, et reviennent TOUS d'un coup si on
// repasse Premium (le drapeau est simplement ignoré, jamais réécrit : on retrouve
// même le choix fait la fois d'avant si on perd Premium une seconde fois).
// Les mix publiés ne sont pas concernés ici : leur limite est celle de la
// publication, et les retirer du fil est une action en ligne, jamais automatique.

// Ce mix est-il en pause POUR CETTE PERSONNE ? Un Premium n'en a jamais.
export const isPaused = (mix, isPremium) => !isPremium && !!mix?.paused;

// La classe qui compte dans les limites chiffrées d'ici, ou null (mix publié).
export const limitKindOf = (mix) => {
  if (isDownloaded(mix)) return 'download';
  return mix?.publishedId ? null : 'creation';
};

// Les classes où il y a un CHOIX à faire : plus de mix possédés que la limite
// (en pause compris). `candidates` = TOUS les mix de la classe, on choisit parmi
// tout ce qu'on possède ; `need` = combien en garder actifs ; `kept` = la
// présélection (les actifs les plus récents, complétés par les plus récents des
// autres s'il en manque).
export const pauseGroups = (library = []) => {
  const out = [];
  for (const kind of ['creation', 'download']) {
    const limit = LIMIT_BY_KIND[kind];
    const candidates = library.filter((m) => limitKindOf(m) === kind);
    if (candidates.length <= limit) continue;
    const kept = candidates.filter((m) => !m.paused).slice(-limit).map((m) => m.id);
    for (let i = candidates.length - 1; i >= 0 && kept.length < limit; i -= 1) {
      if (!kept.includes(candidates[i].id)) kept.push(candidates[i].id);
    }
    out.push({ kind, limit, need: limit, candidates, kept });
  }
  return out;
};

// Les classes qui DÉPASSENT leur limite en mix actifs (ce qui déclenche la
// proposition à la perte de Premium). Vide = rien d'urgent.
export const reviewNeeded = (library = []) =>
  pauseGroups(library).filter((g) => g.candidates.filter((m) => !m.paused).length > g.limit);

// Y a-t-il quelque chose à échanger à la main (des mix en pause) ?
export const hasPaused = (library = []) => library.some((m) => m.paused && limitKindOf(m));

// Pose le choix : dans chaque classe nommée, les mix de `keepIds` redeviennent
// actifs, tous les autres passent en pause. Les autres classes ne bougent pas.
// Ne supprime rien et ne touche à aucun autre champ.
export const applyPauseChoice = (library = [], kinds = [], keepIds = []) => {
  const keep = new Set(keepIds);
  const scope = new Set(kinds);
  return library.map((m) => {
    const kind = limitKindOf(m);
    if (!kind || !scope.has(kind)) return m;
    const shouldPause = !keep.has(m.id);
    if (!!m.paused === shouldPause) return m;
    if (shouldPause) return { ...m, paused: true };
    const { paused: _awake, ...rest } = m;
    return rest;
  });
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

// Demande d'ouverture du sélecteur « mes mix actifs » (components/common/
// MixPauseGate.js, monté une fois à la racine) : « Mes mix » n'a qu'à l'appeler.
const pauseListeners = new Set();
export const onMixPauseRequest = (fn) => {
  pauseListeners.add(fn);
  return () => pauseListeners.delete(fn);
};
export const emitMixPauseRequest = () => {
  pauseListeners.forEach((fn) => fn());
};
