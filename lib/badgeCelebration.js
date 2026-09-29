import { storage } from './storage';
import { BADGE_THRESHOLDS, BADGE_TIERS } from './badges';

// Les badges (lib/badges.js) sont entierement DERIVES de l'historique : rien
// n'est compte a part. Consequence, rien ne sait dire "ce palier vient
// d'etre franchi", seulement "ce palier est atteint". Ce module garde la
// seule chose qui manque : la liste des paliers deja ANNONCES.
//
// La detection ne marque rien : un palier reste "en attente" tant que la
// celebration n'a pas ete montree pour de vrai (markBadgeSeen). C'est ce qui
// fait le rattrapage — quitter l'ecran de fin avant de la voir ne fait pas
// perdre la medaille, elle ressort au prochain endroit prevu.
export const BADGES_SEEN_KEY = 'flexTimer_badgesSeen';

// Amorcage silencieux (repasse a `true` en v15.7.0) : au tout premier appel,
// les paliers DEJA acquis sont marques comme vus sans rien annoncer. Sinon
// quelqu'un qui arrive avec 150 seances derriere lui recevrait toutes ses
// medailles d'un coup, comme s'il venait de les gagner. (En v12.1.0 c'etait
// `false` : l'utilisateur voulait voir le mecanisme a l'oeuvre tout de suite.)
//
// Ce n'est pas suffisant seul : depuis la synchro de l'historique
// (lib/historySync.js), une reconnexion sur un nouveau telephone RESTAURE des
// dizaines de seances apres l'amorcage. Ce cas est traite par
// markAllUnlockedSeen, ci-dessous.
const SILENT_BOOTSTRAP = true;

const loadSeen = async () => (await storage.get(BADGES_SEEN_KEY)) || null;

export const unlockedTiersFor = (timerId, sessionCount) => {
  const thresholds = BADGE_THRESHOLDS[timerId] || BADGE_THRESHOLDS.amrap;
  return BADGE_TIERS.filter((_, i) => sessionCount >= thresholds[i]).map((t) => t.key);
};

/**
 * Paliers atteints mais jamais annonces, a partir d'un {timerId: nbSeances}.
 * Renvoie [{ timerId, tier }], du plus ancien palier au plus recent.
 *
 * Au premier appel, le comportement depend de SILENT_BOOTSTRAP (voir plus
 * haut) : en v12.1.0 tout l'historique deja acquis est annonce.
 */
export const pendingBadges = async (countsByTimer) => {
  const seen = await loadSeen();

  if (!seen && SILENT_BOOTSTRAP) {
    const initial = {};
    for (const [timerId, count] of Object.entries(countsByTimer)) {
      initial[timerId] = unlockedTiersFor(timerId, count);
    }
    await storage.set(BADGES_SEEN_KEY, initial);
    return [];
  }

  const fresh = [];
  for (const [timerId, count] of Object.entries(countsByTimer)) {
    const already = (seen && seen[timerId]) || [];
    for (const tier of unlockedTiersFor(timerId, count)) {
      if (!already.includes(tier)) fresh.push({ timerId, tier });
    }
  }
  return fresh;
};

/**
 * Marque comme deja annonces TOUS les paliers atteints avec ces comptes.
 * Sert apres une restauration de l'historique depuis le cloud (nouveau
 * telephone, reconnexion) : ces medailles ont ete gagnees — et deja
 * celebrees — avant, sur un autre appareil. Les rejouer d'un coup serait
 * absurde. Un palier qui n'est PAS encore atteint n'est jamais touche : il
 * sera annonce normalement le jour ou il le sera.
 */
export const markAllUnlockedSeen = async (countsByTimer) => {
  const seen = (await loadSeen()) || {};
  const next = { ...seen };
  for (const [timerId, count] of Object.entries(countsByTimer)) {
    const merged = new Set([...(seen[timerId] || []), ...unlockedTiersFor(timerId, count)]);
    next[timerId] = [...merged];
  }
  await storage.set(BADGES_SEEN_KEY, next);
};

export const markBadgeSeen = async (timerId, tier) => {
  const seen = (await loadSeen()) || {};
  const already = seen[timerId] || [];
  if (already.includes(tier)) return;
  await storage.set(BADGES_SEEN_KEY, { ...seen, [timerId]: [...already, tier] });
};
