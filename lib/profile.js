// Profil local de l'utilisateur. Optionnel : l'app marche entièrement sans
// (un profil « par défaut » est fabriqué à la volée, jamais forcé).
// Pensé pour qu'une base de données puisse s'y brancher plus tard sans rien
// casser : identifiant stable (`localId`), champs validés, `schemaVersion`.
// Pur JS, aucune dépendance native (livrable par OTA).
import { charCount } from './text';
import { storage } from './storage';
import { DISCIPLINES, MAX_DISCIPLINES } from './disciplines';

export const PROFILE_KEY = 'flexTimer_profile';
export const PROFILE_SCHEMA_VERSION = 1;

export const PSEUDO_MIN = 2;
export const PSEUDO_MAX = 20;
// Pseudo neutre par défaut : jamais le vrai prénom de la personne.
export const DEFAULT_PSEUDO = 'Athlète';

// Lettres (accents compris), chiffres, espace, point, tiret, tiret bas, et
// EMOJIS (v16.6.0) : pictogrammes, plus les caractères qui les composent — liant
// invisible (U+200D, 👨‍👩‍👧), sélecteur d'emoji (U+FE0F) et teintes de peau.
const PSEUDO_ALLOWED = /^[\p{L}\p{N} ._\-\p{Extended_Pictographic}\u200D\uFE0F\p{Emoji_Modifier}]+$/u;

const MONTH_NAMES = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

// Identifiant aléatoire stable, sans module natif. Math.random suffit : ce
// n'est pas un secret, juste une étiquette locale que la future base saura
// rattacher à un compte.
export const generateLocalId = () => {
  let out = '';
  for (let i = 0; i < 16; i++) out += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  return `u_${Date.now().toString(36)}${out}`;
};

// Nettoie un pseudo saisi : espaces superflus retirés, longueur bornée.
export const cleanPseudo = (raw) =>
  String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/** { ok: true, value } ou { ok: false, reason } — reason = phrase affichable. */
export const validatePseudo = (raw) => {
  const value = cleanPseudo(raw);
  // Caractères, pas unités UTF-16 : un emoji compte pour UN (même règle que la
  // base, char_length).
  const count = charCount(value);
  if (count < PSEUDO_MIN) return { ok: false, reason: `${PSEUDO_MIN} caractères minimum.` };
  if (count > PSEUDO_MAX) return { ok: false, reason: `${PSEUDO_MAX} caractères maximum.` };
  if (!PSEUDO_ALLOWED.test(value)) {
    return { ok: false, reason: 'Lettres, chiffres, emojis, espace, point et tiret uniquement.' };
  }
  return { ok: true, value };
};

export const initialsOf = (pseudo) => {
  const words = cleanPseudo(pseudo).split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = Array.from(words[0])[0] ?? '?';
  const second = words.length > 1 ? Array.from(words[1])[0] ?? '' : '';
  return (first + second).toUpperCase();
};

const validDisciplineIds = (ids) => {
  if (!Array.isArray(ids)) return [];
  const known = new Set(DISCIPLINES.map((d) => d.id));
  const out = [];
  for (const id of ids) {
    if (known.has(id) && !out.includes(id)) out.push(id);
    if (out.length >= MAX_DISCIPLINES) break;
  }
  return out;
};

const isoOrNow = (v, fallback) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
};

/** Toujours un profil complet et sain, quelle que soit l'entrée (données
 *  absentes, abîmées, d'une ancienne version...). */
export const normalizeProfile = (raw, now = new Date()) => {
  const nowIso = now.toISOString();
  const src = raw && typeof raw === 'object' ? raw : {};
  const pseudoCheck = validatePseudo(src.pseudo);
  const createdAt = isoOrNow(src.createdAt, nowIso);
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    localId: typeof src.localId === 'string' && src.localId ? src.localId : generateLocalId(),
    pseudo: pseudoCheck.ok ? pseudoCheck.value : DEFAULT_PSEUDO,
    disciplineIds: validDisciplineIds(src.disciplineIds),
    createdAt,
    updatedAt: isoOrNow(src.updatedAt, createdAt),
  };
};

// « sept. 2026 » — depuis la création du profil ou, si une séance est plus
// ancienne (historique antérieur au profil), depuis la toute première séance.
export const formatMemberSince = (profile, oldestSessionDate) => {
  let d = new Date(profile?.createdAt);
  if (Number.isNaN(d.getTime())) d = new Date();
  if (oldestSessionDate) {
    const o = new Date(oldestSessionDate);
    if (!Number.isNaN(o.getTime()) && o < d) d = o;
  }
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

export const loadProfile = async () => normalizeProfile(await storage.get(PROFILE_KEY));

export const saveProfile = async (profile) => {
  const next = normalizeProfile({ ...profile, updatedAt: new Date().toISOString() });
  await storage.set(PROFILE_KEY, next);
  return next;
};
