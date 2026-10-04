// Identité d'un MIX : une clé aléatoire unique (uuid v4), `uid`, posée à la
// création du mix et qui ne change plus jamais, de téléphone en téléphone.
//
// Pourquoi une clé en plus de `id` : l'`id` (« mix_<horodatage> ») n'a de sens que
// sur l'appareil qui l'a créé. Quand un mix voyage (lien d'un ami, fil public), la
// seule façon de savoir « j'ai déjà CE mix » est une identité qui voyage avec lui.
// Sans elle, recevoir deux fois le même lien créait deux mix ; republier un mix
// renommé en créait un deuxième dans le fil.
//
// Règles :
//  - un NOUVEAU mix reçoit un uid neuf ; une COPIE (« Enregistrer sous… ») aussi,
//    c'est un autre mix ;
//  - un mix reçu GARDE l'uid de l'original : le recevoir une seconde fois est
//    reconnu, et seule une mise à jour est alors proposée.
//
// Fichier PUR, sans import React Native : testable directement avec `node`.

const UID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const isMixUid = (value) => typeof value === 'string' && UID_RE.test(value.toLowerCase());

/** uuid v4. `crypto.getRandomValues` quand il existe (Hermes récent), sinon Math.random. */
export const generateMixUid = () => {
  const bytes = new Array(16);
  let filled = false;
  try {
    const c = globalThis.crypto;
    if (c && typeof c.getRandomValues === 'function') {
      const arr = new Uint8Array(16);
      c.getRandomValues(arr);
      for (let i = 0; i < 16; i++) bytes[i] = arr[i];
      filled = true;
    }
  } catch {
    filled = false;
  }
  if (!filled) for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** Le uid valide d'un mix (en minuscules), ou `null`. */
export const readUid = (mix) => (isMixUid(mix?.uid) ? mix.uid.toLowerCase() : null);

/** Le mix, avec son uid : celui qu'il a déjà, sinon un neuf. Ne modifie pas l'original. */
export const ensureUid = (mix) => {
  if (!mix) return mix;
  const uid = readUid(mix);
  return uid && mix.uid === uid ? mix : { ...mix, uid: uid || generateMixUid() };
};

/** Une COPIE est un autre mix : uid neuf, sans rien qui la relie à l'original. */
export const withFreshUid = (mix) => ({ ...mix, uid: generateMixUid() });

/**
 * Empreinte du CONTENU des blocs (sans leurs ids, sans les champs vides) : deux
 * versions d'un mix ont la même empreinte si et seulement si elles se jouent
 * pareil. Un champ absent et un champ vide comptent pour pareil.
 */
export const blocksSignature = (blocks) =>
  JSON.stringify(
    (blocks || []).map((b) => {
      const out = {};
      for (const k of Object.keys(b || {}).sort()) {
        const v = b[k];
        // L'id d'un bloc est régénéré à chaque import : un détail interne.
        if (k === 'id' || v === undefined || v === null || v === '') continue;
        out[k] = v;
      }
      return out;
    })
  );

/** Empreinte nom + blocs : sert à savoir si le brouillon du constructeur a changé. */
export const mixSignature = (mix) =>
  JSON.stringify({ name: String(mix?.name || '').trim(), blocks: blocksSignature(mix?.blocks) });

// Id du fil public d'un mix repris du fil : `fromFeed.feedId`, ou l'id
// « mix_pub_<id du fil> » des enregistrements plus anciens.
const feedIdOf = (mix) => {
  if (mix?.fromFeed?.feedId) return String(mix.fromFeed.feedId);
  const id = String(mix?.id || '');
  return id.startsWith('mix_pub_') ? id.slice('mix_pub_'.length) : null;
};

/**
 * Ce mix reçu (lien, fil public) est-il déjà dans « Mes mix » ?
 *
 * Rend `null` (rien d'équivalent : on peut l'ajouter) ou
 * `{ entry, status }` avec `status` :
 *  - `'same'`   : je l'ai déjà, dans cette version-là → rien à faire ;
 *  - `'update'` : je l'ai déjà, mais la version reçue est DIFFÉRENTE → on propose
 *                 UNIQUEMENT de mettre à jour, jamais d'en ajouter un deuxième.
 *
 * Reconnaissance, dans l'ordre : même uid ; même mix du fil public (les mix
 * enregistrés avant l'existence des uid n'ont que ça) ; à défaut d'uid sur le mix
 * reçu (vieux lien), exactement le même contenu.
 *
 * « Cette version-là » = la dernière version REÇUE (`entry.syncSig`, posée à
 * l'enregistrement), pas le contenu actuel : si j'ai retouché ma copie, recevoir à
 * nouveau l'original ne doit pas me proposer d'écraser mon travail. Sans
 * `syncSig` (un mix à moi), on compare au contenu actuel.
 */
export const findLibraryMatch = (library, incoming) => {
  if (!incoming || !Array.isArray(library) || library.length === 0) return null;
  const uid = readUid(incoming);
  const feedId = feedIdOf(incoming);
  let entry = null;
  if (uid) entry = library.find((m) => readUid(m) === uid) || null;
  if (!entry && feedId) entry = library.find((m) => feedIdOf(m) === feedId) || null;
  if (!entry && !uid) {
    const sig = mixSignature(incoming);
    entry = library.find((m) => mixSignature(m) === sig) || null;
  }
  if (!entry) return null;
  const incomingSig = blocksSignature(incoming.blocks);
  // Un mix enregistré depuis le fil AVANT les uid n'a pas noté quelle version il
  // avait reçue : impossible de savoir s'il a été retouché depuis. On suppose qu'il
  // est à jour plutôt que de proposer d'écraser un travail peut-être modifié.
  const legacyFeedCopy = !entry.syncSig && !entry.own && !!feedIdOf(entry);
  const knownSig = entry.syncSig || (legacyFeedCopy ? incomingSig : blocksSignature(entry.blocks));
  return { entry, status: incomingSig === knownSig ? 'same' : 'update' };
};

const nameKey = (x) => String(x || '').trim().toLowerCase();

/**
 * Un nom libre dans « Mes mix » : le nom demandé, sinon suivi de « 2 », « 3 »…
 * `exceptId` : le mix qui porte déjà ce nom ne compte pas contre lui-même.
 * 28 caractères au plus (même borne que partout).
 */
export const uniqueMixName = (library, wanted, exceptId = null) => {
  const used = new Set((library || []).filter((m) => m.id !== exceptId).map((m) => nameKey(m.name)));
  const base = String(wanted || '').trim() || 'Sans nom';
  let name = base.slice(0, 28);
  for (let i = 2; used.has(nameKey(name)); i++) name = `${base.slice(0, 24)} ${i}`;
  return name;
};

/**
 * La mise à jour d'un mix déjà enregistré : le contenu (nom, blocs) vient du mix
 * reçu ; tout ce qui est propre à CE téléphone reste (id local, lien de
 * publication, « mix à moi »). L'uid reçu remplace l'ancien : les mix enregistrés
 * avant les uid n'en avaient qu'un tiré au hasard.
 */
export const mergeMixUpdate = (entry, incoming, library = []) => {
  const next = {
    ...entry,
    name: uniqueMixName(library, incoming.name || entry.name, entry.id),
    blocks: (incoming.blocks || []).map((b) => ({ ...b })),
    uid: readUid(incoming) || readUid(entry) || generateMixUid(),
    syncSig: blocksSignature(incoming.blocks),
  };
  if (incoming.fromFeed) next.fromFeed = incoming.fromFeed;
  return next;
};
