// Suivi du poids de corps : logique PURE (aucune lecture de stockage, aucun
// import React Native) pour pouvoir la tester directement avec `node`. Le
// stockage vit dans lib/bodyWeight.js.
//
// Une entrée = { id, at, kg } : `at` est l'horodatage (ms) pris sur l'horloge du
// téléphone au moment de la pesée. UNE pesée par jour : en peser une deuxième le
// même jour remplace la première (le graphique garde ainsi un point par jour).

export const MIN_KG = 20;
export const MAX_KG = 400;
// Variation (en kg) en dessous de laquelle le poids est dit « stable ».
export const STABLE_KG = 0.3;
// Fenêtre de la tendance (« hausse / baisse / maintien »).
export const TREND_DAYS = 30;
// Garde-fou de stockage : une pesée par jour pendant plus d'un an.
export const MAX_ENTRIES = 400;

const DAY_MS = 86400000;
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_LONG = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const round1 = (n) => Math.round(n * 10) / 10;

/** Jour calendaire LOCAL d'un horodatage, sous la forme « 2026-10-15 ». */
export const dayKey = (at) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Ce que la personne a tapé → kg (arrondi au dixième), ou `null` si ça ne tient
 * pas debout. Accepte la virgule (« 72,5 ») comme le point.
 */
export const parseWeightInput = (text) => {
  const clean = String(text ?? '').trim().replace(',', '.').replace(/\s*kg$/i, '');
  if (!/^\d{1,3}(\.\d{0,2})?$/.test(clean)) return null;
  const kg = round1(Number(clean));
  return kg >= MIN_KG && kg <= MAX_KG ? kg : null;
};

/** « 72,5 » (virgule française, une décimale seulement si elle existe). */
export const formatKg = (kg) => {
  const v = round1(Number(kg) || 0);
  return (Number.isInteger(v) ? String(v) : v.toFixed(1)).replace('.', ',');
};

/** Liste relue du stockage : entrées valides, triées de la plus ancienne à la plus récente. */
export const sanitizeEntries = (raw) => {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const e of raw) {
    const at = Number(e?.at);
    const kg = Number(e?.kg);
    if (!Number.isFinite(at) || !Number.isFinite(kg) || kg < MIN_KG || kg > MAX_KG) continue;
    out.push({ id: typeof e.id === 'string' && e.id ? e.id : `w${at}`, at, kg: round1(kg) });
  }
  out.sort((a, b) => a.at - b.at);
  return out.slice(-MAX_ENTRIES);
};

/** Ajoute une pesée (remplace celle du même jour). Rend une NOUVELLE liste triée. */
export const addWeight = (list, kg, now = Date.now()) => {
  const key = dayKey(now);
  const kept = sanitizeEntries(list).filter((e) => dayKey(e.at) !== key);
  kept.push({ id: `w${now}`, at: now, kg: round1(kg) });
  kept.sort((a, b) => a.at - b.at);
  return kept.slice(-MAX_ENTRIES);
};

export const removeWeight = (list, id) => sanitizeEntries(list).filter((e) => e.id !== id);

/**
 * Tendance sur les `TREND_DAYS` derniers jours : le poids le plus récent comparé
 * au plus ancien de la fenêtre.
 *  - `'none'`   : moins de deux pesées dans la fenêtre, rien à comparer ;
 *  - `'stable'` : écart sous `STABLE_KG` ;
 *  - `'up'` / `'down'` sinon. `delta` = écart signé en kg (dixième).
 */
export const weightTrend = (list, now = Date.now()) => {
  const from = now - TREND_DAYS * DAY_MS;
  const window = sanitizeEntries(list).filter((e) => e.at >= from && e.at <= now);
  if (window.length < 2) return { direction: 'none', delta: 0, days: TREND_DAYS };
  const delta = round1(window[window.length - 1].kg - window[0].kg);
  const direction = Math.abs(delta) < STABLE_KG ? 'stable' : delta > 0 ? 'up' : 'down';
  return { direction, delta, days: TREND_DAYS };
};

/** Points du graphique : les pesées des `days` derniers jours, 40 au plus. */
export const chartEntries = (list, now = Date.now(), days = 90, max = 40) =>
  sanitizeEntries(list)
    .filter((e) => e.at >= now - days * DAY_MS && e.at <= now)
    .slice(-max);

/** « Aujourd'hui », « Hier », sinon « 3 oct. » (jour calendaire local). */
export const formatWeightDate = (at, now = Date.now()) => {
  const diff = Math.round((new Date(dayKey(now)).getTime() - new Date(dayKey(at)).getTime()) / DAY_MS);
  if (diff <= 0) return 'Aujourd’hui';
  if (diff === 1) return 'Hier';
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** « jeudi 15 octobre » : la date du téléphone, affichée dans la feuille de saisie. */
export const formatLongDate = (at = Date.now()) => {
  const d = new Date(at);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
};
