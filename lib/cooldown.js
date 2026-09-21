import { storage } from './storage';

export const COOLDOWN_KEY = 'flexTimer_cooldown';

// Seuls ces modes sont limités — les autres (AMRAP/BASIC/EMOM) restent
// gratuits et illimités. Décision produit explicite, pas un oubli.
export const COOLDOWN_MODES = ['tabata', 'mix'];

// Nombre de lancements avant verrouillage. Ce n'est PAS un quota quotidien :
// le compteur ne se recharge qu'une fois le verrou purge, jamais au
// changement de date. Consommer 2 lancements lundi laisse donc 2 lancements
// disponibles indefiniment, jusqu'a ce que les 4 soient atteints.
export const FREE_USES = 4;

// Durée du verrouillage à chaque nouveau palier atteint — s'allonge à chaque
// fois que l'utilisateur se fait reverrouiller (pas de désescalade), plafonné
// à la dernière valeur au-delà.
export const LOCKOUT_HOURS = [24, 48, 72];

// Seule remise a zero possible : le verrou est arrive a echeance, on rend les
// 4 lancements. `usesToday` est l'ancien nom du champ (quota quotidien), relu
// une derniere fois ici pour ne pas repartir de zero chez les installations
// existantes.
const normalize = (entry) => {
  if (!entry) return { uses: 0, lockoutLevel: 0, lockedUntil: null };

  const base = {
    uses: entry.uses ?? entry.usesToday ?? 0,
    lockoutLevel: entry.lockoutLevel || 0,
    lockedUntil: entry.lockedUntil || null,
  };

  if (base.lockedUntil && base.lockedUntil <= Date.now()) {
    return { ...base, uses: 0, lockedUntil: null };
  }
  return base;
};

export const loadCooldownMap = async () => (await storage.get(COOLDOWN_KEY)) || {};
export const saveCooldownMap = (map) => storage.set(COOLDOWN_KEY, map);

// { limited, isLocked, remaining, uses, lockoutLevel, lockedUntil }
export const getCooldownStatus = (cooldownMap, timerId) => {
  if (!COOLDOWN_MODES.includes(timerId)) {
    return { limited: false, isLocked: false, remaining: Infinity, uses: 0, lockoutLevel: 0, lockedUntil: null };
  }
  const entry = normalize(cooldownMap[timerId]);
  const isLocked = !!entry.lockedUntil && entry.lockedUntil > Date.now();
  return {
    limited: true,
    isLocked,
    remaining: Math.max(0, FREE_USES - entry.uses),
    uses: entry.uses,
    lockoutLevel: entry.lockoutLevel,
    lockedUntil: entry.lockedUntil,
  };
};

// À appeler uniquement quand un lancement est effectivement autorisé et
// déclenché (getCooldownStatus().isLocked doit avoir été vérifié avant par
// l'appelant). Verrouille automatiquement si ce lancement épuise le quota du
// jour, avec un palier de cooldown qui s'allonge à chaque nouveau verrouillage.
export const consumeLaunch = (cooldownMap, timerId) => {
  if (!COOLDOWN_MODES.includes(timerId)) return cooldownMap;

  const entry = normalize(cooldownMap[timerId]);
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) return cooldownMap;

  const nextUses = entry.uses + 1;
  if (nextUses > FREE_USES) return cooldownMap;

  let nextEntry = { ...entry, uses: nextUses };
  if (nextUses >= FREE_USES) {
    const hours = LOCKOUT_HOURS[Math.min(entry.lockoutLevel, LOCKOUT_HOURS.length - 1)];
    nextEntry = {
      ...nextEntry,
      lockoutLevel: entry.lockoutLevel + 1,
      lockedUntil: Date.now() + hours * 3600 * 1000,
    };
  }
  return { ...cooldownMap, [timerId]: nextEntry };
};
