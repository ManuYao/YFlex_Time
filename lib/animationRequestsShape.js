// Demandes d'animations d'exercices — partie PURE (aucun import React Native :
// testable en Node). Le stockage et l'envoi vivent dans lib/animationRequests.js.
import { toWords } from './exerciseAnimations';

export const REQUEST_EMAIL = 'yaomanuit@gmail.com';
export const LABEL_MAX = 60;

/** Nom d'exercice nettoyé : espaces simples, 60 caractères au plus. */
export const cleanLabel = (label) =>
  String(label ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, LABEL_MAX)
    .trim();

/** Clé de comparaison (sans accents, casse ni ponctuation) : « Pompes  Archer ! » = « pompes archer ». */
export const requestKey = (label) => toWords(cleanLabel(label)).join(' ').slice(0, LABEL_MAX).trim();

/** Une demande a-t-elle un sens ? (2 caractères au moins une fois nettoyée.) */
export const isRequestable = (label) => requestKey(label).length >= 2;

/** Liste locale reçue du stockage → liste sûre ({ [clé]: { label, at, seen } }). */
export const sanitizeRequests = (raw) => {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [key, v] of Object.entries(raw)) {
    if (typeof key !== 'string' || !key || key.length > LABEL_MAX) continue;
    if (!v || typeof v !== 'object') continue;
    out[key] = {
      label: typeof v.label === 'string' ? cleanLabel(v.label) : key,
      at: Number.isFinite(v.at) ? v.at : 0,
      seen: v.seen === true,
    };
  }
  return out;
};

/**
 * État d'une demande pour un exercice, à afficher dans sa fiche :
 *   'none'      : jamais demandée ;
 *   'requested' : envoyée, pas encore d'animation ;
 *   'added'     : l'animation est arrivée (exacte) et la personne ne l'a pas
 *                 encore vue → on le lui dit une fois ;
 *   'done'      : animation arrivée et déjà annoncée.
 * `hasExactAnimation` : le catalogue a maintenant une animation à ce nom.
 */
export const requestState = (requests, label, hasExactAnimation) => {
  const r = requests?.[requestKey(label)];
  if (!r) return 'none';
  if (!hasExactAnimation) return 'requested';
  return r.seen ? 'done' : 'added';
};

/** Sujet et corps du mail de demande (sans compte, ou en secours). */
export const requestMail = (label, appVersion = '') => {
  const name = cleanLabel(label) || 'un exercice';
  return {
    recipients: [REQUEST_EMAIL],
    subject: `Flex Timer — demande d'animation : ${name}`,
    body: [
      'Bonjour,',
      '',
      `J'aimerais une animation pour l'exercice : ${name}`,
      '',
      'Précisions (matériel, variante, angle…) :',
      '',
      '',
      '—',
      `Flex Timer ${appVersion}`.trim(),
    ].join('\n'),
  };
};
