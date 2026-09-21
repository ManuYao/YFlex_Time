// Système de badges (freemium, sans pub) — 1 palier Bronze/Argent/Or par mode,
// débloqué en fonction du nombre de séances complétées sur ce mode (calculé
// depuis lib/history.js, pas de compteur dédié à faire dériver).

export const BADGE_THRESHOLDS = {
  amrap: [10, 50, 150],
  basic: [10, 50, 150],
  emom: [10, 50, 150],
  tabata: [10, 50, 150],
  mix: [10, 50, 150],
};

export const BADGE_TIERS = [
  { key: 'bronze', label: 'BRONZE' },
  { key: 'argent', label: 'ARGENT' },
  { key: 'or', label: 'OR' },
];

// { tiers: [{key,label,threshold,unlocked}], nextTier, progressPct, prevThreshold }
export function getBadgeProgress(timerId, sessionCount) {
  const thresholds = BADGE_THRESHOLDS[timerId] || BADGE_THRESHOLDS.amrap;
  // `progress` = avancement GLOBAL vers ce palier (séances / seuil), pas la
  // part du segment depuis le palier précédent : chaque médaille raconte son
  // propre objectif, et toutes avancent ensemble à des rythmes différents.
  // BadgeMedal le multiplie ensuite par le niveau caractéristique du palier
  // (un tiers / deux tiers / complet), pour que trois paliers acquis restent
  // visuellement distincts.
  const tiers = BADGE_TIERS.map((tier, i) => ({
    ...tier,
    threshold: thresholds[i],
    unlocked: sessionCount >= thresholds[i],
    progress: thresholds[i] > 0 ? Math.max(0, Math.min(1, sessionCount / thresholds[i])) : 1,
  }));

  const nextIndex = tiers.findIndex((tier) => !tier.unlocked);
  const nextTier = nextIndex === -1 ? null : tiers[nextIndex];
  const prevThreshold = nextIndex <= 0 ? 0 : thresholds[nextIndex - 1];
  const progressPct = nextTier
    ? Math.max(0, Math.min(1, (sessionCount - prevThreshold) / (nextTier.threshold - prevThreshold)))
    : 1;

  return { tiers, nextTier, prevThreshold, progressPct, sessionCount };
}
