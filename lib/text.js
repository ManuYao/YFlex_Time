// Petits outils de texte, purs (aucun import React Native).
//
// `string.length` compte des unités UTF-16 : un emoji en vaut 2 (parfois bien
// plus : 👨‍👩‍👧 = 8). Postgres, lui, compte des CARACTÈRES (points de code) dans
// `char_length`. Pour qu'une limite « 20 caractères » dise la même chose dans
// l'app et dans la base, on compte et on coupe en points de code — et on ne
// coupe jamais un emoji en deux (ce qui laisserait un caractère cassé).

/** Nombre de caractères (points de code). */
export const charCount = (text) => Array.from(String(text ?? '')).length;

/** Les `max` premiers caractères, sans jamais couper un emoji en deux. */
export const clipChars = (text, max) => Array.from(String(text ?? '')).slice(0, max).join('');
