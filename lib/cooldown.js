import { storage } from './storage';

export const COOLDOWN_KEY = 'flexTimer_cooldown';

// Seuls ces modes sont limités — les autres (AMRAP/BASIC/EMOM) restent
// gratuits et illimités. Décision produit explicite, pas un oubli.
export const COOLDOWN_MODES = ['tabata', 'mix'];

// Quota GRATUIT PAR SEMAINE et par mode (30/09/2026, remplace l'ancien
// système de verrous 24 h → 48 h → 72 h et le « cramer une place », jugés
// trop compliqués par deux bêta-testeurs). Le compteur repart à zéro chaque
// lundi à minuit (heure du téléphone), pour toujours. Premium = illimité
// (le contournement se fait côté écrans, ce fichier ignore Premium).
//
// 06/10/2026 : TABATA 4 → 15 et MIX 3 → 6, sur décision de l'utilisateur après
// un comparatif de la concurrence (des chronos TABATA entièrement gratuits
// existent : 4 par semaine ne tenait pas la comparaison). 15 « ni trop ni pas
// assez » ; MIX, forme centrale de l'app, passe à 6 (une séance MIX par jour,
// en général 1 à 4 par semaine). Un quota qui monte ne verrouille personne :
// quelqu'un qui avait épuisé l'ancien quota retrouve des places.
export const FREE_USES_BY_MODE = { tabata: 15, mix: 6 };
const quotaFor = (timerId) => FREE_USES_BY_MODE[timerId] ?? 3;

// Lundi 00:00 (heure locale) de la semaine qui contient `now`.
export const weekStartOf = (now = Date.now()) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const sinceMonday = (d.getDay() + 6) % 7; // lundi = 0 … dimanche = 6
  d.setDate(d.getDate() - sinceMonday);
  return d.getTime();
};

// Lundi 00:00 suivant : le moment où les lancements reviennent.
export const nextWeekStartOf = (now = Date.now()) => {
  const d = new Date(weekStartOf(now));
  d.setDate(d.getDate() + 7);
  return d.getTime();
};

// Une entrée d'une semaine passée (ou d'un ancien format à verrous, sans
// `weekStart`) repart de zéro.
const normalize = (entry) => {
  const weekStart = weekStartOf();
  if (!entry || entry.weekStart !== weekStart) return { uses: 0, weekStart };
  return { uses: entry.uses || 0, weekStart };
};

export const loadCooldownMap = async () => (await storage.get(COOLDOWN_KEY)) || {};
export const saveCooldownMap = (map) => storage.set(COOLDOWN_KEY, map);

// { limited, isLocked, remaining, uses, quota, lockedUntil }
export const getCooldownStatus = (cooldownMap, timerId) => {
  if (!COOLDOWN_MODES.includes(timerId)) {
    return { limited: false, isLocked: false, remaining: Infinity, uses: 0, quota: Infinity, lockedUntil: null };
  }
  const entry = normalize(cooldownMap[timerId]);
  const quota = quotaFor(timerId);
  const isLocked = entry.uses >= quota;
  return {
    limited: true,
    isLocked,
    remaining: Math.max(0, quota - entry.uses),
    uses: entry.uses,
    quota,
    lockedUntil: isLocked ? nextWeekStartOf() : null,
  };
};

// À appeler uniquement quand un lancement est effectivement autorisé (le
// verrou doit avoir été vérifié avant par l'appelant).
export const consumeLaunch = (cooldownMap, timerId) => {
  if (!COOLDOWN_MODES.includes(timerId)) return cooldownMap;
  const entry = normalize(cooldownMap[timerId]);
  if (entry.uses >= quotaFor(timerId)) return cooldownMap;
  return { ...cooldownMap, [timerId]: { ...entry, uses: entry.uses + 1 } };
};
