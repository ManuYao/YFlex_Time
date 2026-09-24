// Partage d'un MIX entre utilisateurs, SANS backend (décidé le 25/09/2026,
// voir CLAUDE.md — section MIX PARTAGE). Un mix est réduit à ce qui compte
// vraiment ({ name, blocks: [{ type, duration, rest, rounds, label, role? }] })
// puis encodé dans un lien profond flextimer://import-mix?m=... envoyé via la
// feuille de partage native (app/mix-builder.js). L'écran app/import-mix.js
// fait le chemin inverse.
//
// Fichier PUR, sans aucun import React Native : testable directement avec
// `node`, comme lib/badges.js ou lib/progression.js. Le lien lui-même
// (Linking.createURL) et l'appel à Share.share() vivent dans app/mix-builder.js,
// qui a besoin du natif — pas ici.
//
// Encodage base64url écrit à la main : Hermes ne garantit pas `btoa`/`atob`
// globaux, donc pas de dépendance sur eux (ni sur `Buffer`, absent en RN).

import { isBlockRole } from './blockRoles';
import { BLOCK_TYPES, getBlockType } from './mix-blocks';

const SCHEMA_VERSION = 1;
const VALID_TYPES = new Set([...BLOCK_TYPES.map((t) => t.id), 'basic']); // 'basic' = legacy, cf. mix-blocks.js

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_REV = (() => {
  const m = {};
  for (let i = 0; i < B64_CHARS.length; i++) m[B64_CHARS[i]] = i;
  return m;
})();

function stringToUtf8Bytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i);
    if (code > 0xffff) i++; // le second surrogate a déjà été consommé par codePointAt
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return bytes;
}

function utf8BytesToString(bytes) {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i];
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
      i += 1;
    } else if ((b0 & 0xe0) === 0xc0) {
      out += String.fromCharCode(((b0 & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if ((b0 & 0xf0) === 0xe0) {
      out += String.fromCharCode(
        ((b0 & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f)
      );
      i += 3;
    } else {
      const cp =
        ((b0 & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      out += String.fromCodePoint(cp);
      i += 4;
    }
  }
  return out;
}

function bytesToBase64Url(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : null;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : null;
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 0x03) << 4) | (b1 === null ? 0 : b1 >> 4)];
    if (b1 !== null) out += B64_CHARS[((b1 & 0x0f) << 2) | (b2 === null ? 0 : b2 >> 6)];
    if (b2 !== null) out += B64_CHARS[b2 & 0x3f];
  }
  return out; // pas de padding '=' : inutile en base64url, la longueur suffit au décodage
}

function base64UrlToBytes(str) {
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < str.length; i++) {
    const v = B64_REV[str[i]];
    if (v === undefined) throw new Error('caractère base64url invalide');
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

const clampNum = (n, min, max, fallback) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
};

// mix -> objet réduit aux seuls champs transportables. Jamais les ids locaux
// (mix_<timestamp>, b<timestamp><rand> — cf. lib/mixes.js) : ils ne servent
// que sur l'appareil qui les a créés, aucun sens hors de lui.
export const buildSharePayload = (mix) => ({
  v: SCHEMA_VERSION,
  name: String(mix?.name || '').slice(0, 28),
  blocks: (mix?.blocks || []).map((b) => {
    const out = {
      type: b.type,
      duration: b.duration,
      rest: b.rest || 0,
      rounds: b.rounds || 1,
      label: b.label,
    };
    if (isBlockRole(b.role)) out.role = b.role;
    return out;
  }),
});

export const serializeMix = (mix) => bytesToBase64Url(stringToUtf8Bytes(JSON.stringify(buildSharePayload(mix))));

// Ne lève jamais : un lien corrompu doit se lire "invalide", pas planter l'app.
export const deserializeMix = (encoded) => {
  try {
    const json = utf8BytesToString(base64UrlToBytes(String(encoded || '')));
    const payload = JSON.parse(json);
    if (!payload || typeof payload !== 'object') return { ok: false };
    return { ok: true, payload };
  } catch {
    return { ok: false };
  }
};

/**
 * Construit un Mix prêt pour lib/mixes.js (addToLibrary) à partir d'un
 * payload reçu par lien — jamais confiance dans les données externes :
 * type filtré (bloc ignoré silencieusement si inconnu, pas d'échec global),
 * valeurs numériques bornées, ids toujours régénérés localement. Renvoie
 * `null` si rien d'exploitable ne survit (jamais un mix vide silencieux).
 */
// Un lien collé à la main (copié depuis un message où il n'était pas
// cliquable — beaucoup d'apps, Instagram en tête, ne rendent pas un scheme
// personnalisé flextimer:// cliquable dans une conversation) peut être soit
// le lien complet, soit juste le code si la personne n'a copié que ça.
// Jamais de `new URL()` (pas garanti sous Hermes) : une regex suffit, le
// code ne contient jamais lui-même de '?', '&' ou d'espace (alphabet
// base64url + décodage défensif d'un éventuel %-encodage en chemin).
export const extractShareCode = (text) => {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const match = raw.match(/[?&]m=([^&\s]+)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return raw.replace(/\s+/g, '');
};

export const sanitizeImportedPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.blocks)) return null;

  const blocks = payload.blocks
    .filter((b) => b && VALID_TYPES.has(b.type))
    .map((b, i) => {
      const type = getBlockType(b.type); // undefined pour 'basic' (legacy)
      const fallbackLabel = type ? `Bloc ${type.name}` : 'Bloc';
      const label =
        typeof b.label === 'string' && b.label.trim() ? b.label.trim().slice(0, 40) : fallbackLabel;
      const block = {
        id: `b${Date.now()}${i}`,
        type: b.type,
        label,
        duration: clampNum(b.duration, 1, 3600, type?.defaults?.duration ?? 60),
        rest: clampNum(b.rest, 0, 3600, 0),
        rounds: clampNum(b.rounds, 1, 999, 1),
      };
      if (isBlockRole(b.role)) block.role = b.role;
      return block;
    });

  if (blocks.length === 0) return null;

  const name =
    typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim().slice(0, 28) : 'Mix reçu';

  return { id: `mix_${Date.now()}`, name, blocks };
};
