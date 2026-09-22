import { storage } from './storage';

export const COOLDOWN_KEY = 'flexTimer_cooldown';

// Seuls ces modes sont limités — les autres (AMRAP/BASIC/EMOM) restent
// gratuits et illimités. Décision produit explicite, pas un oubli.
export const COOLDOWN_MODES = ['tabata', 'mix'];

// Quota de base PAR MODE (22/09/2026 — avant, un seul chiffre partagé par
// tous les modes limités). Ce n'est PAS un quota quotidien : le compteur ne
// se recharge qu'une fois le verrou purgé, jamais au changement de date.
export const FREE_USES_BY_MODE = { tabata: 6, mix: 4 };
const quotaFor = (timerId) => FREE_USES_BY_MODE[timerId] ?? 4;

// Durée du verrouillage à chaque nouveau palier atteint — s'allonge à chaque
// fois que l'utilisateur se fait reverrouiller (pas de désescalade), plafonné
// à la dernière valeur au-delà. « Cramer » (voir burnLaunch) ne touche PAS ce
// palier — décision explicite de l'utilisateur : seul le quota est pénalisé.
export const LOCKOUT_HOURS = [24, 48, 72];

// Seule remise à zéro possible : le verrou est arrivé à échéance.
//   - `malus` (0 ou 1) réduit le quota du CYCLE QUI COMMENCE si le cycle qui
//     vient de se terminer a été « cramé » — sinon le quota plein revient.
//     Le malus ne s'accumule jamais au-delà de 1, même en cramant plusieurs
//     cycles d'affilée (décision utilisateur du 22/09/2026 : « ça se
//     stabilise à -1 », pas une pénalité qui grandit sans fin).
//   - `burnedThisLock` retombe à false : le nouveau cycle a droit à sa propre
//     place à cramer.
// `usesToday` est l'ancien nom du champ (quota quotidien), relu une dernière
// fois ici pour ne pas repartir de zéro chez les installations existantes.
const normalize = (entry) => {
  if (!entry) return { uses: 0, lockoutLevel: 0, lockedUntil: null, malus: 0, burnedThisLock: false };

  const base = {
    uses: entry.uses ?? entry.usesToday ?? 0,
    lockoutLevel: entry.lockoutLevel || 0,
    lockedUntil: entry.lockedUntil || null,
    malus: entry.malus || 0,
    burnedThisLock: !!entry.burnedThisLock,
  };

  if (base.lockedUntil && base.lockedUntil <= Date.now()) {
    return {
      uses: 0,
      lockoutLevel: base.lockoutLevel,
      lockedUntil: null,
      malus: base.burnedThisLock ? 1 : 0,
      burnedThisLock: false,
    };
  }
  return base;
};

export const loadCooldownMap = async () => (await storage.get(COOLDOWN_KEY)) || {};
export const saveCooldownMap = (map) => storage.set(COOLDOWN_KEY, map);

// { limited, isLocked, canBurn, remaining, uses, quota, baseQuota, malus, lockoutLevel, lockedUntil }
export const getCooldownStatus = (cooldownMap, timerId) => {
  if (!COOLDOWN_MODES.includes(timerId)) {
    return {
      limited: false,
      isLocked: false,
      canBurn: false,
      remaining: Infinity,
      uses: 0,
      quota: Infinity,
      baseQuota: Infinity,
      malus: 0,
      lockoutLevel: 0,
      lockedUntil: null,
    };
  }
  const entry = normalize(cooldownMap[timerId]);
  const baseQuota = quotaFor(timerId);
  const quota = Math.max(1, baseQuota - entry.malus);
  const isLocked = !!entry.lockedUntil && entry.lockedUntil > Date.now();
  return {
    limited: true,
    isLocked,
    // « Cramer » : une seule place en trop, une seule fois par verrou en
    // cours — pas avant d'être réellement à 0 (confirmé par l'utilisateur :
    // « cramer si on arrive à 0 »), jamais une deuxième fois sur le même
    // verrou même si on pouvait relancer la question.
    canBurn: isLocked && !entry.burnedThisLock,
    remaining: Math.max(0, quota - entry.uses),
    uses: entry.uses,
    quota,
    baseQuota,
    malus: entry.malus,
    lockoutLevel: entry.lockoutLevel,
    lockedUntil: entry.lockedUntil,
  };
};

// À appeler uniquement quand un lancement est effectivement autorisé et
// déclenché (getCooldownStatus().isLocked doit avoir été vérifié avant par
// l'appelant). Verrouille automatiquement si ce lancement épuise le quota du
// cycle, avec un palier de cooldown qui s'allonge à chaque nouveau
// verrouillage.
export const consumeLaunch = (cooldownMap, timerId) => {
  if (!COOLDOWN_MODES.includes(timerId)) return cooldownMap;

  const entry = normalize(cooldownMap[timerId]);
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) return cooldownMap;

  const quota = Math.max(1, quotaFor(timerId) - entry.malus);
  const nextUses = entry.uses + 1;
  if (nextUses > quota) return cooldownMap;

  let nextEntry = { ...entry, uses: nextUses };
  if (nextUses >= quota) {
    const hours = LOCKOUT_HOURS[Math.min(entry.lockoutLevel, LOCKOUT_HOURS.length - 1)];
    nextEntry = {
      ...nextEntry,
      lockoutLevel: entry.lockoutLevel + 1,
      lockedUntil: Date.now() + hours * 3600 * 1000,
      burnedThisLock: false,
    };
  }
  return { ...cooldownMap, [timerId]: nextEntry };
};

// « Cramer une place » : accorde UN lancement de plus alors que le mode est
// verrouillé — l'appelant doit avoir vérifié `canBurn` avant (comme
// `consumeLaunch` avec `isLocked`). Ne touche NI `lockedUntil` NI
// `lockoutLevel` : le verrou en cours dure toujours aussi longtemps, seul le
// prochain cycle sera pénalisé d'une place (voir `malus` dans `normalize`).
// Une seule fois par verrou — retenté, c'est un no-op.
export const burnLaunch = (cooldownMap, timerId) => {
  if (!COOLDOWN_MODES.includes(timerId)) return cooldownMap;

  const entry = normalize(cooldownMap[timerId]);
  const isLocked = !!entry.lockedUntil && entry.lockedUntil > Date.now();
  if (!isLocked || entry.burnedThisLock) return cooldownMap;

  return {
    ...cooldownMap,
    [timerId]: { ...entry, uses: entry.uses + 1, burnedThisLock: true },
  };
};
