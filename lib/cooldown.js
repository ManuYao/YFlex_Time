import { storage } from './storage';

export const COOLDOWN_KEY = 'flexTimer_cooldown';

// Seuls ces modes sont limités — les autres (AMRAP/BASIC/EMOM) restent
// gratuits et illimités. Décision produit explicite, pas un oubli.
export const COOLDOWN_MODES = ['tabata', 'mix'];

// Nombre de lancements gratuits par jour calendaire avant verrouillage.
export const FREE_USES_PER_DAY = 4;

// Durée du verrouillage à chaque nouveau palier atteint — s'allonge à chaque
// fois que l'utilisateur se fait reverrouiller (pas de désescalade), plafonné
// à la dernière valeur au-delà.
export const LOCKOUT_HOURS = [24, 48, 72];

const todayKey = () => new Date().toISOString().slice(0, 10);

// Repart de zéro sur usesToday si on a changé de jour calendaire — mais ne
// touche jamais lockoutLevel/lockedUntil : le verrouillage en cours (24-72h)
// doit survivre au changement de jour, et le palier ne redescend jamais tout
// seul.
const normalize = (entry) => {
  const today = todayKey();
  if (!entry || entry.date !== today) {
    return {
      date: today,
      usesToday: 0,
      lockoutLevel: entry?.lockoutLevel || 0,
      lockedUntil: entry?.lockedUntil || null,
    };
  }
  return entry;
};

export const loadCooldownMap = async () => (await storage.get(COOLDOWN_KEY)) || {};
export const saveCooldownMap = (map) => storage.set(COOLDOWN_KEY, map);

// { limited, isLocked, remaining, usesToday, lockoutLevel, lockedUntil }
export const getCooldownStatus = (cooldownMap, timerId) => {
  if (!COOLDOWN_MODES.includes(timerId)) {
    return { limited: false, isLocked: false, remaining: Infinity, usesToday: 0, lockoutLevel: 0, lockedUntil: null };
  }
  const entry = normalize(cooldownMap[timerId]);
  const isLocked = !!entry.lockedUntil && entry.lockedUntil > Date.now();
  return {
    limited: true,
    isLocked,
    remaining: Math.max(0, FREE_USES_PER_DAY - entry.usesToday),
    usesToday: entry.usesToday,
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

  const nextUses = entry.usesToday + 1;
  if (nextUses > FREE_USES_PER_DAY) return cooldownMap;

  let nextEntry = { ...entry, usesToday: nextUses };
  if (nextUses >= FREE_USES_PER_DAY) {
    const hours = LOCKOUT_HOURS[Math.min(entry.lockoutLevel, LOCKOUT_HOURS.length - 1)];
    nextEntry = {
      ...nextEntry,
      lockoutLevel: entry.lockoutLevel + 1,
      lockedUntil: Date.now() + hours * 3600 * 1000,
    };
  }
  return { ...cooldownMap, [timerId]: nextEntry };
};
