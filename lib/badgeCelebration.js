import { storage } from './storage';
import { loadTrophyEvaluation } from './trophyLoader';
import { allUnlocks, unseenUnlocks, seenFromUnlocks } from './trophies';
import { getTrophy, announceFormat } from './trophyCatalog';
import { holdTrophyNotices, pushTrophyNotices } from './trophyNotices';

// Les trophées (lib/trophies.js) sont entierement DERIVES de l'historique et de quelques
// faits memorises : rien n'est compte a part. Consequence, rien ne sait dire "ce palier
// vient d'etre franchi", seulement "ce palier est atteint". Ce module garde la seule chose
// qui manque : la liste des trophees deja ANNONCES.
//
// La detection ne marque rien : un trophee reste "en attente" tant que la celebration n'a
// pas ete montree pour de vrai (markBadgeSeen). C'est ce qui fait le rattrapage — quitter
// l'ecran de fin avant de la voir ne fait pas perdre la medaille, elle ressort au prochain
// endroit prevu.
//
// Cle de `flexTimer_badgesSeen` : l'id du trophee ('amrap', 'sweat', 'five'…), valeur : la
// liste de ses paliers deja annonces (['bronze', 'argent'] ou ['done'] pour un exploit).
// Les 15 trophees de mode gardent leur ancienne cle (l'id du mode).
export const BADGES_SEEN_KEY = 'flexTimer_badgesSeen';

// Passage a la version 2 des trophees (18.16.0) : fait UNE fois par telephone.
export const TROPHIES_V2_KEY = 'flexTimer_trophiesV2';

// Amorcage silencieux : au tout premier appel, les trophees DEJA acquis sont marques comme
// vus sans rien annoncer. Sinon quelqu'un qui arrive avec 150 seances derriere lui recevrait
// toutes ses medailles d'un coup, comme s'il venait de les gagner.
//
// Ce n'est pas suffisant seul : depuis la synchro de l'historique (lib/historySync.js), une
// reconnexion sur un nouveau telephone RESTAURE des dizaines de seances apres l'amorcage. Ce
// cas est traite par markAllUnlockedSeen, ci-dessous.
const SILENT_BOOTSTRAP = true;

const loadSeen = async () => (await storage.get(BADGES_SEEN_KEY)) || null;

/**
 * Trophees atteints mais jamais annonces : [{ timerId, tier }], du plus ancien au plus
 * recent. ⚠️ `timerId` est l'ID DU TROPHEE (l'id du mode pour les 15 premiers, 'sweat',
 * 'five'… pour les autres) : le nom est garde tel quel pour les ecrans qui le lisent deja
 * (app/home.js, app/end-session.js). `tier` : 'bronze' | 'argent' | 'or' | 'done'.
 *
 * `scope` : 'timer' (fin d'une seance de chrono), 'game' (fin d'une partie), 'any' ou rien
 * (= tout, au lancement de l'app). Toute autre valeur (l'ancien comptage par mode que passaient
 * app/home.js) vaut « tout ». Ne RENVOIE que les trophees au format « grande annonce »
 * (announceFormat) ; les autres partent en notification (voir plus bas). `opts.hold: false` quand
 * l'appelant n'affichera PAS la grande annonce (elle reste alors en attente pour plus tard).
 */
export const pendingBadges = async (scope, opts = {}) => {
  const evaluation = await loadTrophyEvaluation();
  const unlocks = allUnlocks(evaluation);
  let seen = await loadSeen();

  if (!seen && SILENT_BOOTSTRAP) {
    await storage.set(BADGES_SEEN_KEY, seenFromUnlocks(unlocks));
    await storage.set(TROPHIES_V2_KEY, true);
    return [];
  }

  // Premier lancement depuis la version 2 : on ne montre PAS d'un coup tout ce que
  // l'historique fait deja gagner dans les nouveaux trophees (ils sont a decouvrir dans
  // la page Trophees, avec leur date). Pour les 15 trophees de mode, un palier compte comme
  // "vu" seulement s'il est reellement atteint (avant, l'annonce se basait sur un comptage
  // qui ajoutait les blocs des MIX aux autres modes).
  if (!(await storage.get(TROPHIES_V2_KEY))) {
    const kept = {};
    for (const mode of ['amrap', 'basic', 'emom', 'tabata', 'mix']) {
      const reached = new Set(
        unlocks.filter((u) => u.id === mode).map((u) => u.tier)
      );
      const before = Array.isArray(seen?.[mode]) ? seen[mode] : [];
      kept[mode] = before.filter((tier) => reached.has(tier));
    }
    const base = { ...(seen || {}), ...kept };
    seen = seenFromUnlocks(
      unlocks.filter((u) => !['amrap', 'basic', 'emom', 'tabata', 'mix'].includes(u.id)),
      base
    );
    await storage.set(BADGES_SEEN_KEY, seen);
    await storage.set(TROPHIES_V2_KEY, true);
  }

  // Seuls les trophées de CE moment : un trophée de jeu ne s'annonce pas à la fin d'un chrono
  // (retour de l'utilisateur, 21/11). Le FORMAT dépend de la rareté (announceFormat) : la grande
  // annonce est renvoyée ici (l'écran la montre, puis marque le trophée vu) ; le reste passe par
  // une petite notification qu'on balaye (lib/trophyNotices.js), marquée vue tout de suite.
  const wanted = typeof scope === 'string' ? scope : 'all';
  const inScope = (def) => wanted === 'all' || def.scope === 'any' || def.scope === wanted;
  const sheet = [];
  const notices = [];
  for (const u of unseenUnlocks(evaluation, seen)) {
    const def = getTrophy(u.id);
    if (!def || !inScope(def)) continue;
    if (announceFormat(def, u.tier) === 'sheet') sheet.push({ timerId: u.id, tier: u.tier });
    else notices.push({ id: u.id, tier: u.tier });
  }
  // Pas de conflit : les cartes attendent la fermeture de la grande annonce (qui les bloque dès
  // qu'elle s'ouvre ; ce filet couvre le court délai avant son affichage, et tombe seul si elle
  // n'est finalement pas montrée).
  if (sheet.length && opts.hold !== false) holdTrophyNotices('pending', 8000);
  if (notices.length) {
    let next = { ...(seen || {}) };
    for (const n of notices) next = seenFromUnlocks([n], next);
    await storage.set(BADGES_SEEN_KEY, next);
    pushTrophyNotices(notices);
  }
  return sheet;
};

/**
 * Annonce en NOTIFICATION ce qui vient d'être gagné après un événement (scope 'any' : mix publié,
 * lien envoyé, conseil suivi…). Une éventuelle grande annonce n'est pas montrée ici : elle reste en
 * attente du prochain moment calme (fin de séance, fin de partie, lancement). Ne lève jamais : un
 * souci ici ne doit pas gêner l'écran. (Fin de partie : hooks/useTrophySheet.js.)
 */
export const announceTrophies = async (scope) => {
  try {
    await pendingBadges(scope, { hold: false });
  } catch {}
};

/**
 * Marque comme deja annonces TOUS les trophees atteints. Sert apres une restauration de
 * l'historique depuis le cloud (nouveau telephone, reconnexion) : ces medailles ont ete
 * gagnees — et deja celebrees — avant, sur un autre appareil. Les rejouer d'un coup serait
 * absurde. Un trophee qui n'est PAS encore atteint n'est jamais touche : il sera annonce
 * normalement le jour ou il le sera. L'argument (ancien comptage par mode) est ignore.
 */
export const markAllUnlockedSeen = async () => {
  const evaluation = await loadTrophyEvaluation();
  const seen = (await loadSeen()) || {};
  await storage.set(BADGES_SEEN_KEY, seenFromUnlocks(allUnlocks(evaluation), seen));
  await storage.set(TROPHIES_V2_KEY, true);
};

export const markBadgeSeen = async (id, tier) => {
  const seen = (await loadSeen()) || {};
  const already = Array.isArray(seen[id]) ? seen[id] : [];
  if (already.includes(tier)) return;
  await storage.set(BADGES_SEEN_KEY, { ...seen, [id]: [...already, tier] });
};
