// Animations d'exercices : relier un exercice du planning (ou un bloc de MIX)
// à son animation du catalogue en ligne (table Supabase
// `exercise_animations`, fichiers dans le dossier public « animations »,
// voir DATA/supabase-animations.sql).
// PUR (aucun import React Native) : testable en Node. Le chargement réseau et
// le cache des fichiers vivent ailleurs ; l'affichage arrive avec le lecteur
// d'images animées (`expo-image`) de l'APK du 15/11/2026.
//
// Règles :
//   - on ne fait JAMAIS confiance au catalogue reçu (sanitizeCatalog) ;
//   - un exercice relié à la main (`animationId`) l'emporte toujours ;
//   - sinon on cherche les mots-clés du catalogue dans le nom, en MOTS ENTIERS
//     (jamais un includes() sur la chaîne brute : « abdos » contient « dos »),
//     et l'expression la plus précise gagne (« pompes diamant » avant
//     « pompes ») ;
//   - aucune correspondance : pas d'animation (rien d'inventé).

export const ANIMATION_BUCKET = 'animations';

const ID_RE = /^[a-z0-9_-]{1,40}$/;
const FILE_RE = /^[a-z0-9_-]+-v\d+\.webp$/;
const MAX_TERMS = 30;
const MAX_TERM_LEN = 60;

/** Mots d'un texte : sans accents, sans casse, sans ponctuation. */
export const toWords = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const cleanTerms = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((t) => typeof t === 'string')
    .map((t) => t.trim().slice(0, MAX_TERM_LEN))
    .filter(Boolean)
    .slice(0, MAX_TERMS);

const intIn = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

/**
 * Catalogue reçu du serveur → liste sûre. Toute ligne douteuse est ignorée
 * (jamais d'exception) ; doublons d'id : la première gagne.
 */
export const sanitizeCatalog = (rows) => {
  const out = [];
  const seen = new Set();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || typeof r !== 'object') continue;
    if (typeof r.id !== 'string' || !ID_RE.test(r.id) || seen.has(r.id)) continue;
    if (typeof r.file_path !== 'string' || !FILE_RE.test(r.file_path)) continue;
    if (!intIn(r.width, 16, 2000) || !intIn(r.height, 16, 2000)) continue;
    seen.add(r.id);
    out.push({
      id: r.id,
      version: intIn(r.version, 1, 999) ? r.version : 1,
      groupId: typeof r.group_id === 'string' ? r.group_id.slice(0, 40) : '',
      names: cleanTerms(r.names),
      keywords: cleanTerms(r.keywords),
      file: r.file_path,
      width: r.width,
      height: r.height,
    });
  }
  return out;
};

// `phrase` (liste de mots) apparaît-elle d'un bloc dans `words` ?
const containsPhrase = (words, phrase) => {
  if (!phrase.length || phrase.length > words.length) return false;
  for (let i = 0; i + phrase.length <= words.length; i++) {
    let ok = true;
    for (let j = 0; j < phrase.length; j++) {
      if (words[i + j] !== phrase[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
};

/**
 * Animation d'un exercice, ou null. `label` = nom de l'exercice (étiquette du
 * planning, nom d'un bloc de MIX) ; `animationId` = choix fait à la main
 * (exercice perso), prioritaire s'il existe encore dans le catalogue.
 * Renvoie l'entrée du catalogue + `exact` (le nom est exactement un nom ou un
 * mot-clé du catalogue, pas seulement « contenu dedans »).
 */
export const findAnimation = (catalog, label, animationId = null) => {
  const list = Array.isArray(catalog) ? catalog : [];
  if (animationId) {
    const picked = list.find((e) => e.id === animationId);
    if (picked) return { ...picked, exact: true, manual: true };
  }
  const words = toWords(label);
  if (!words.length) return null;
  const key = words.join(' ');
  let best = null;
  for (const e of list) {
    for (const term of [...e.names, ...e.keywords]) {
      const phrase = toWords(term);
      if (!containsPhrase(words, phrase)) continue;
      const exact = phrase.join(' ') === key;
      const score = (exact ? 1000 : 0) + phrase.length * 100 + phrase.join(' ').length;
      if (!best || score > best.score) best = { entry: e, exact, score };
    }
  }
  return best ? { ...best.entry, exact: best.exact, manual: false } : null;
};

/** Adresse publique du fichier d'une animation. */
export const animationUrl = (supabaseUrl, entry) => {
  if (!supabaseUrl || !entry?.file || !FILE_RE.test(entry.file)) return null;
  return `${String(supabaseUrl).replace(/\/+$/, '')}/storage/v1/object/public/${ANIMATION_BUCKET}/${entry.file}`;
};

/** Recherche dans le catalogue (choix d'une animation pour un exercice perso). */
export const searchCatalog = (catalog, query) => {
  const list = Array.isArray(catalog) ? catalog : [];
  const q = toWords(query);
  if (!q.length) return list.slice();
  return list.filter((e) => {
    const hay = [...e.names, ...e.keywords].map((t) => toWords(t).join(' ')).join(' | ');
    return q.every((w) => hay.includes(w));
  });
};
