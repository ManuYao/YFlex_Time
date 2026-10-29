import { VOICE_TEXTS, REMAINING_TEMPLATES, REMAINING_REST_TEMPLATES } from './voiceTexts.js';

// ─────────────────────────────────────────────────────────────────────────
//  VOCABULAIRE DE LA VOIX HUMAINE (clips MP3 pré-générés)
// ─────────────────────────────────────────────────────────────────────────
// Module PUR (aucun import React Native) : il sert à l'app ET au script
// scripts/voice-pack/generate.mjs qui fabrique les MP3 avec Azure.
//
// Principe : le coach écrit une phrase (lib/voiceTexts.js) ; `textToClips`
// la découpe en morceaux connus (phrases entières, « Tour 3 », « sur 8 »,
// « 30 secondes »…) et l'app joue les MP3 correspondants l'un après l'autre.
// Un seul morceau inconnu (ex. le nom d'un exercice écrit par l'utilisateur)
// ⇒ `null` ⇒ l'app retombe sur la voix du téléphone pour TOUTE la phrase
// (jamais deux voix mélangées dans une même phrase).
//
// L'import a l'extension « .js » exprès : Node (script de génération) l'exige,
// Metro l'accepte aussi.

// Bornes des clips chiffrés. Au-delà, on retombe sur la voix du téléphone.
export const LIMITS = { tour: 40, sur: 40, sec: 59, min: 60 };

const NUMBER_WORDS = {
  2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq',
  6: 'six', 7: 'sept', 8: 'huit', 9: 'neuf', 10: 'dix',
};

// Morceaux du style « Essentiel » (lib/voiceTexts.js, conciseText) qui ne
// changent jamais. Les chiffres, eux, passent par les clips numériques.
const ESSENTIAL_LITERALS = [
  'Go.',
  'Dernier tour.',
  'Repos.',
  'Terminé.',
  'Moitié.',
  'Moitié de la séance.',
  'Reprise dans 10 secondes.',
  'Prochain tour dans 10 secondes.',
  'Travail,',
  'Encore',
  'Fin dans',
  'de repos.',
  'de travail.',
];

const fillRemaining = (templates) =>
  Object.values(NUMBER_WORDS).flatMap((word) => templates.map((t) => t.replace('{n}', word)));

// Toutes les phrases entières (style « Motivant » + « Essentiel »), sans doublon.
export const LITERALS = [
  ...new Set([
    ...ESSENTIAL_LITERALS,
    ...Object.values(VOICE_TEXTS).flat(),
    ...fillRemaining(REMAINING_TEMPLATES),
    ...fillRemaining(REMAINING_REST_TEMPLATES),
  ]),
];

// Clé stable d'un texte (nom de fichier). Hachage FNV-1a : pas de caractère
// spécial, et le même texte donne toujours la même clé.
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};
export const literalKey = (text) => `lit_${hash(text)}`;

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

// Tous les clips à fabriquer : [{ key, text }].
export const allClips = () => {
  const clips = [];
  for (let n = 1; n <= LIMITS.tour; n++) clips.push({ key: `tour_${n}`, text: `Tour ${n},` });
  for (let n = 2; n <= LIMITS.sur; n++) clips.push({ key: `sur_${n}`, text: `sur ${n}.` });
  for (let n = 1; n <= LIMITS.sec; n++) clips.push({ key: `sec_${n}`, text: plural(n, 'seconde') });
  for (let n = 1; n <= LIMITS.min; n++) clips.push({ key: `min_${n}`, text: plural(n, 'minute') });
  for (let n = 5; n <= 55; n += 5) clips.push({ key: `rem_${n}`, text: String(n) });
  LITERALS.forEach((text) => clips.push({ key: literalKey(text), text }));
  return clips;
};

const SORTED_LITERALS = [...LITERALS].sort((a, b) => b.length - a.length);

const startsWord = (rest, lit) =>
  rest.startsWith(lit) && (rest.length === lit.length || rest[lit.length] === ' ');

// Découpe une phrase en clés de clips, ou renvoie null si un morceau est
// inconnu (nom d'exercice, durée hors bornes…).
export const textToClips = (text) => {
  let rest = (text || '').replace(/\s+/g, ' ').trim();
  const keys = [];
  while (rest) {
    const lit = SORTED_LITERALS.find((l) => startsWord(rest, l));
    if (lit) {
      keys.push(literalKey(lit));
      rest = rest.slice(lit.length).trimStart();
      continue;
    }
    let m = rest.match(/^Tour (\d+) sur (\d+)[.,]?(?= |$)/);
    if (m) {
      const n = Number(m[1]);
      const total = Number(m[2]);
      if (n < 1 || n > LIMITS.tour || total < 2 || total > LIMITS.sur) return null;
      keys.push(`tour_${n}`, `sur_${total}`);
      rest = rest.slice(m[0].length).trimStart();
      continue;
    }
    m = rest.match(/^(\d+) secondes?[.,]?(?= |$)/);
    if (m) {
      const n = Number(m[1]);
      if (n < 1 || n > LIMITS.sec) return null;
      keys.push(`sec_${n}`);
      rest = rest.slice(m[0].length).trimStart();
      continue;
    }
    m = rest.match(/^(\d+) minutes?(?: (\d+))?[.,]?(?= |$)/);
    if (m) {
      const n = Number(m[1]);
      if (n < 1 || n > LIMITS.min) return null;
      keys.push(`min_${n}`);
      if (m[2] !== undefined) {
        const r = Number(m[2]);
        if (r < 5 || r > 55 || r % 5 !== 0) return null;
        keys.push(`rem_${r}`);
      }
      rest = rest.slice(m[0].length).trimStart();
      continue;
    }
    return null;
  }
  return keys.length ? keys : null;
};
