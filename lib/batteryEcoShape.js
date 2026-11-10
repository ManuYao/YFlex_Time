// Logique PURE de l'« économie de batterie » (aucun import React Native : testable avec Node).
//
// Règle voulue par l'utilisateur (11/11/2026) :
//  - dès que la batterie descend à 20 % (ou moins) : les décors animés (saisons, braises)
//    sont coupés. Les flammes de série RESTENT ;
//  - c'est FORCÉ : aucun réglage ne permet de les remettre ;
//  - retour des décors SEULEMENT quand la batterie reste à 25 % ou plus pendant au moins
//    20 minutes d'affilée (un passage sous 25 % remet le compteur à zéro) ;
//  - l'état « voulu » suit la batterie, mais l'interface ne change JAMAIS devant les yeux
//    de la personne : le changement est appliqué au prochain changement d'écran
//    (voir lib/batteryEco.js).

export const ECO_ON_PCT = 20; // à 20 % pile, on coupe
export const ECO_OFF_PCT = 25; // il faut 25 % ou plus pour commencer à compter
export const ECO_HOLD_MS = 20 * 60 * 1000; // 20 minutes d'affilée au-dessus de 25 %

// `eco` : décors coupés (état voulu) ; `okSince` : début du temps passé à 25 % ou plus
// pendant l'économie (null sinon) ; `noticed` : le message « décors coupés » a été montré
// pour CETTE période d'économie.
export const INITIAL_ECO = Object.freeze({ eco: false, okSince: null, noticed: false });

/** Niveau de batterie lisible (0 à 100), ou null. */
export function normalizePct(v) {
  // `Number(null)` vaut 0 : une lecture ABSENTE ne doit jamais passer pour « 0 % ».
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

/**
 * État suivant à partir d'une lecture de batterie (`pct`) à l'instant `now` (ms).
 * Renvoie le MÊME objet si rien ne change (pas de rendu pour rien).
 */
export function nextBatteryEco(prev, pct, now) {
  const p = prev || INITIAL_ECO;
  const level = normalizePct(pct);
  if (level == null) return p;

  // 20 % ou moins : économie active, compteur de retour remis à zéro.
  if (level <= ECO_ON_PCT) {
    return p.eco && p.okSince == null ? p : { eco: true, okSince: null, noticed: p.noticed };
  }
  // Pas d'économie en cours : rien à faire.
  if (!p.eco) return p.okSince == null && !p.noticed ? p : { eco: false, okSince: null, noticed: false };

  // Économie en cours, batterie au-dessus de 20 %.
  if (level < ECO_OFF_PCT) {
    // Entre 20 et 25 % : on attend, le temps déjà compté est perdu.
    return p.okSince == null ? p : { eco: true, okSince: null, noticed: p.noticed };
  }
  // 25 % ou plus : on compte.
  const since = p.okSince == null ? now : p.okSince;
  if (now - since >= ECO_HOLD_MS) return { eco: false, okSince: null, noticed: false };
  return since === p.okSince ? p : { eco: true, okSince: since, noticed: p.noticed };
}

/** Relit l'état enregistré (texte JSON) ; tout ce qui est illisible = pas d'économie. */
export function parseStoredEco(raw) {
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!o || typeof o !== 'object') return INITIAL_ECO;
    const eco = o.eco === true;
    const okSince = eco && Number.isFinite(o.okSince) ? o.okSince : null;
    return { eco, okSince, noticed: eco && o.noticed === true };
  } catch {
    return INITIAL_ECO;
  }
}

/** Minutes restantes avant le retour des décors (arrondi au-dessus), ou null. */
export function minutesUntilRelease(state, now) {
  if (!state || !state.eco || state.okSince == null) return null;
  return Math.max(0, Math.ceil((state.okSince + ECO_HOLD_MS - now) / 60000));
}
