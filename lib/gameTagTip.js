// Quand montrer la bulle « maintiens ton score pour noter ton exercice » (demande de
// l'utilisateur, 06/11/2026). Elle est la même pour TOUS les jeux et compte les parties
// finies, tous jeux confondus :
//  - la toute première partie finie : elle s'affiche ;
//  - « Compris » : elle ne revient plus jamais ;
//  - « Passer » (ou le retour Android) : elle revient 3 parties plus tard, et ainsi de
//    suite, mais jamais plus de 3 fois en tout (la personne a clairement dit non) ;
//  - si elle n'a pas pu s'afficher, rien ne change : elle sera retentée.
//
// Module PUR (aucun import React Native) : testable en Node. Le stockage est dans
// lib/gameExercisesStore.js.

export const TIP_EVERY_N_GAMES = 3;
export const TIP_MAX_SKIPS = 3;

// MODE TEST (demande de l'utilisateur, 06/11/2026) : `true` = la bulle s'affiche à CHAQUE partie
// finie et rien n'est enregistré (comme HUB_TIPS_ALWAYS pour les bulles du menu). RETIRÉ le
// 07/11/2026 (17.11.36) : il a validé la bulle, la règle ci-dessus s'applique.
export const GAME_TAG_TIP_ALWAYS = false;

export const INITIAL_TIP_STATE = { done: false, skips: 0, since: 0 };

const count = (v) => (Number.isInteger(v) && v >= 0 && v < 1000 ? v : 0);

/** Un état lu du stockage, remis d'aplomb (jamais de plantage sur une donnée abîmée). */
export const normalizeTipState = (raw) => {
  if (!raw || typeof raw !== 'object') return { ...INITIAL_TIP_STATE };
  return { done: raw.done === true, skips: count(raw.skips), since: count(raw.since) };
};

/**
 * Une partie vient de se finir (dans un jeu qui sait noter l'exercice) : faut-il montrer
 * la bulle ? Renvoie { show, state } — `state` est à enregistrer.
 */
export const onGameFinished = (rawState) => {
  const s = normalizeTipState(rawState);
  if (s.done || s.skips >= TIP_MAX_SKIPS) return { show: false, state: s };
  if (s.skips === 0) return { show: true, state: s }; // jamais passée : on la montre
  const since = s.since + 1;
  const next = { ...s, since };
  return { show: since >= TIP_EVERY_N_GAMES, state: next };
};

/** La bulle s'est affichée et la personne a répondu : 'done' (Compris) ou 'skip' (Passer). */
export const onTipOutcome = (rawState, outcome) => {
  const s = normalizeTipState(rawState);
  if (outcome === 'done') return { ...s, done: true };
  if (outcome === 'skip') return { ...s, skips: s.skips + 1, since: 0 };
  return s;
};
