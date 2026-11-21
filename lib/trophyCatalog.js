// Catalogue des trophées (v2, 18.16.0) : les 68 trophées validés le 18/11/2026.
//
// Module PUR (aucun import React Native) : testable en Node, comme lib/badges.js. Il
// ne contient QUE des données et des textes ; le calcul vit dans lib/trophies.js.
//
// Trois formes de trophée (même anneau à 60 graduations, seul le centre change) :
//   - 'tier'   : Bronze / Argent / Or, le chiffre au centre dit l'objectif (45 médailles)
//   - 'unique' : un exploit, une seule médaille, l'icône dit ce qu'on a fait (19)
//   - 'secret' : caché (« ? ») tant qu'il n'est pas trouvé, aucun indice (4)
//
// Les 15 premiers (un par mode) gardent pour `id` l'id du mode ('amrap'…) : c'est la clé
// déjà utilisée par `flexTimer_badgesSeen`, leurs annonces passées restent valables.
//
// RÈGLE DE L'UTILISATEUR (18/11/2026) : une durée de plus de 60 min s'écrit en HEURES
// (« 1 h 30 », jamais « 90 min »). Voir formatDuration plus bas, utilisée partout.
import { BADGE_TIERS, BADGE_THRESHOLDS } from './badges.js';

// Couleurs : AUCUNE n'est inventée, toutes existent déjà dans l'app (modes, flamme de
// série, jeux, saisons, violet du MIX).
export const MODE_COLORS = {
  amrap: '#FF5454',
  basic: '#9A9A9A',
  emom: '#1FC777',
  tabata: '#FFC933',
  mix: '#9575FF',
};
export const MODE_IDS = ['amrap', 'basic', 'emom', 'tabata', 'mix'];

const WHITE = '#FFFFFF';
const FLAME = '#FF7A1A';
const VIOLET = '#9575FF';
const CYAN = '#4DD8E8';
const AUTUMN = '#FF9A2E';
const SPEC5 = [MODE_COLORS.amrap, MODE_COLORS.basic, MODE_COLORS.emom, MODE_COLORS.tabata, MODE_COLORS.mix];
const BLOCK4 = [MODE_COLORS.amrap, MODE_COLORS.basic, MODE_COLORS.emom, MODE_COLORS.tabata];
const SEASON4 = ['#8EE06B', '#FFC93A', '#E8512B', '#A9D4FF'];
const GAMES3 = [CYAN, '#FF9A4D', '#FF5FA2'];

export const TROPHY_TIERS = BADGE_TIERS; // [{ key: 'bronze', label: 'BRONZE' }, …]
export const UNIQUE_TIER = 'done'; // « palier » d'un exploit ou d'un secret dans `flexTimer_badgesSeen`

export const TROPHY_FAMILIES = [
  { id: 'modes', title: 'Par mode', hint: 'Les séances terminées dans chaque mode.' },
  { id: 'cumul', title: 'Cumul', hint: 'Tout le temps que tu as déjà donné.' },
  { id: 'regularite', title: 'Régularité', hint: 'Revenir, encore et encore.' },
  { id: 'touche', title: 'Touche-à-tout', hint: 'Varier les modes et les exercices.' },
  { id: 'exploits', title: 'Exploits', hint: 'Des séances qui comptent double.' },
  { id: 'jeux', title: 'Jeux', hint: 'Chef d’orchestre, Pyramide, Combo Bi-Exo.' },
  { id: 'createur', title: 'Créateur', hint: 'Tes mix, et ceux que tu partages.' },
  { id: 'progression', title: 'Progression', hint: 'Tes charges et ton suivi.' },
  { id: 'saisons', title: 'Saisons', hint: 'Le temps passé ensemble.' },
  { id: 'secrets', title: 'Secrets', hint: 'Cachés. À toi de les trouver.' },
];

// ── Les 15 trophées de mode (5 modes × 3 paliers) ──
const MODE_NAMES = { amrap: 'AMRAP', basic: 'BASIC', emom: 'EMOM', tabata: 'TABATA', mix: 'MIX' };
const modeTrophy = (id) => ({
  id,
  family: 'modes',
  kind: 'tier',
  name: MODE_NAMES[id],
  desc: '',
  icon: id,
  color: MODE_COLORS[id],
  thresholds: BADGE_THRESHOLDS[id],
  unit: 'n',
  noun: ['séance', 'séances'],
  detail: 'Les séances terminées dans ce mode. Une séance arrêtée trop tôt ne compte pas.',
  mode: id,
});

// unit : 'n' (un nombre + un nom), 'time' (minutes, écrites en heures au-delà de 60) ou 'months'.
// noun : [singulier, pluriel]. tail : suite de la phrase, une chaîne ou [singulier, pluriel].
// goal(th) : phrase complète d'un palier quand « nombre + nom + suite » ne suffit pas.
// labels : texte COURT écrit au centre de la médaille (sinon le seuil tel quel).
const RAW_TROPHIES = [
  ...MODE_IDS.map(modeTrophy),

  // ── Cumul ──
  {
    id: 'sweat', family: 'cumul', kind: 'tier', name: 'Heures de sueur', desc: 'Temps total de séance',
    icon: 'drop', color: WHITE, unit: 'time', thresholds: [60, 600, 3000], labels: ['1h', '10h', '50h'],
    tail: ' de séance',
    detail: 'Tout le temps passé en séance, repos compris, chronos et jeux confondus.',
  },
  {
    id: 'marathon', family: 'cumul', kind: 'tier', name: 'Marathonien', desc: 'Temps sous tension',
    icon: 'pulse', color: WHITE, unit: 'time', thresholds: [120, 600, 1800], labels: ['2h', '10h', '30h'],
    tail: ' sous tension',
    detail: 'Le temps où tu es vraiment en effort. Les repos ne comptent pas : seul le travail fait monter l’anneau.',
  },
  {
    id: 'loyal', family: 'cumul', kind: 'tier', name: 'Fidèle', desc: 'Jours avec une séance',
    icon: 'calendar', color: WHITE, unit: 'n', thresholds: [10, 50, 150], noun: ['jour', 'jours'],
    detail: 'Le nombre de jours différents où tu as fait au moins une séance. Plusieurs séances le même jour comptent pour un seul jour.',
  },

  // ── Régularité ──
  {
    id: 'flame', family: 'regularite', kind: 'tier', name: 'Flamme', desc: 'Jours d’affilée',
    icon: 'flame', color: FLAME, unit: 'n', thresholds: [3, 7, 30], noun: ['jour', 'jours'], tail: ' d’affilée',
    detail: 'Ta plus longue série de jours d’affilée avec une séance. Elle reste gagnée même si la série s’arrête ensuite.',
  },
  {
    id: 'weeks', family: 'regularite', kind: 'tier', name: 'Semaines solides', desc: '3 séances par semaine',
    icon: 'repeat', color: FLAME, unit: 'n', thresholds: [4, 12, 26], noun: ['semaine', 'semaines'], tail: ' d’affilée',
    detail: 'Des semaines d’affilée (du lundi au dimanche) avec au moins 3 séances de chrono. Les jeux ne comptent pas.',
  },
  {
    id: 'comeback', family: 'regularite', kind: 'unique', name: 'Retour en force', desc: 'Reprendre après 14 jours de pause',
    icon: 'loop', colors: [FLAME],
    detail: 'Reprendre une séance après au moins 14 jours sans rien faire. Le plus dur, c’est de revenir.',
  },

  // ── Touche-à-tout ──
  {
    id: 'collector', family: 'touche', kind: 'tier', name: 'Collectionneur', desc: 'Exercices différents',
    icon: 'tag', color: WHITE, unit: 'n', thresholds: [10, 25, 50], noun: ['exercice', 'exercices'], tail: [' différent', ' différents'],
    detail: 'Les exercices que tu nommes dans tes mix et dans tes jeux, comptés une seule fois chacun. Il compte à partir de maintenant.',
  },
  {
    id: 'five', family: 'touche', kind: 'unique', name: 'Les 5 doigts de la main', desc: 'Les 5 modes au moins une fois',
    icon: 'five', colors: SPEC5, target: 5,
    detail: 'AMRAP, BASIC, EMOM, TABATA et MIX : un chrono de chaque mode, au moins une fois.',
  },
  {
    id: 'fullweek', family: 'touche', kind: 'unique', name: 'Semaine complète', desc: 'Les 5 modes la même semaine',
    icon: 'weekfull', colors: SPEC5, target: 5,
    detail: 'Lance les 5 modes dans la même semaine, du lundi au dimanche.',
  },
  {
    id: 'foreman', family: 'touche', kind: 'unique', name: 'Chef de chantier', desc: 'Un MIX avec les 4 types de blocs',
    icon: 'blocks', colors: BLOCK4, target: 4,
    detail: 'Termine un MIX qui contient un bloc AMRAP, un EMOM, un TABATA et un BASIC.',
  },

  // ── Exploits ──
  {
    id: 'longhaul', family: 'exploits', kind: 'tier', name: 'Longue haleine', desc: 'Ta plus longue séance',
    icon: 'stopwatch', color: WHITE, unit: 'time', thresholds: [30, 60, 90], labels: ['30m', '1h', '1h30'],
    goal: (th) => `Une séance de ${formatDuration(th)}`, tail: '',
    detail: 'La durée de ta plus longue séance de chrono. Chaque palier se gagne une fois pour toutes.',
  },
  {
    id: 'finishTabata', family: 'exploits', kind: 'unique', name: 'Jusqu’au bout', desc: 'Un TABATA de 8 tours terminé',
    icon: 'tabata', colors: [MODE_COLORS.tabata], sub: 'TABATA',
    detail: 'Un TABATA d’au moins 8 tours, tous les tours faits.',
  },
  {
    id: 'finishEmom', family: 'exploits', kind: 'unique', name: 'Jusqu’au bout', desc: 'Un EMOM de 10 min terminé',
    icon: 'emom', colors: [MODE_COLORS.emom], sub: 'EMOM',
    detail: 'Un EMOM d’au moins 10 minutes, tous les tours faits, sans t’arrêter.',
  },
  {
    id: 'finishAmrap', family: 'exploits', kind: 'unique', name: 'Jusqu’au bout', desc: 'Tenir 20 min d’AMRAP',
    icon: 'amrap', colors: [MODE_COLORS.amrap], sub: 'AMRAP',
    detail: 'Un AMRAP tenu pendant au moins 20 minutes.',
  },
  {
    id: 'bigmix', family: 'exploits', kind: 'unique', name: 'Gros MIX', desc: 'Un MIX de 10 blocs terminé',
    icon: 'mix', colors: [MODE_COLORS.mix], target: 10,
    detail: 'Termine un MIX d’au moins 10 blocs d’exercice. Les repos ne comptent pas.',
  },
  {
    id: 'triple', family: 'exploits', kind: 'unique', name: 'Triple', desc: '3 séances le même jour',
    icon: 'bolt', colors: [WHITE], target: 3,
    detail: 'Trois séances de chrono dans la même journée. Les jeux ne comptent pas.',
  },

  // ── Jeux ──
  {
    id: 'player', family: 'jeux', kind: 'tier', name: 'Joueur', desc: 'Répétitions en jeu',
    icon: 'puzzle', color: CYAN, unit: 'n', thresholds: [100, 1000, 5000], noun: ['répétition', 'répétitions'], tail: ' en jeu',
    detail: 'Toutes les répétitions comptées dans tes parties du Chef d’orchestre, de la Pyramide et du Combo Bi-Exo.',
  },
  {
    id: 'threeGames', family: 'jeux', kind: 'unique', name: 'Les 3 jeux', desc: 'Jouer aux 3 jeux',
    icon: 'tri', colors: GAMES3, target: 3,
    detail: 'Une partie du Chef d’orchestre, une de la Pyramide et une du Combo Bi-Exo.',
  },
  {
    id: 'record', family: 'jeux', kind: 'unique', name: 'Record battu', desc: 'Battre ton record dans un jeu',
    icon: 'record', colors: [CYAN],
    detail: 'Fais mieux que ton meilleur score dans un jeu, à format égal.',
  },

  // ── Créateur ──
  {
    id: 'architect', family: 'createur', kind: 'tier', name: 'Architecte', desc: 'Mix créés',
    icon: 'edit', color: VIOLET, unit: 'n', thresholds: [1, 3, 10], noun: ['mix créé', 'mix créés'],
    detail: 'Les mix que tu as fabriqués toi-même (pas ceux reçus d’un ami ou du fil public).',
  },
  {
    id: 'stage', family: 'createur', kind: 'unique', name: 'Sur scène', desc: 'Publier un mix sur le fil',
    icon: 'globe', colors: [VIOLET],
    detail: 'Publie un de tes mix sur le fil public, pour que tout le monde puisse l’essayer.',
  },
  {
    id: 'sharer', family: 'createur', kind: 'unique', name: 'Partageur', desc: 'Envoyer un mix à un ami',
    icon: 'share', colors: [VIOLET],
    detail: 'Copie le lien d’un de tes mix pour l’envoyer à un ami.',
  },
  {
    id: 'liked', family: 'createur', kind: 'unique', name: 'Apprécié', desc: 'Un de tes mix noté 4,5 étoiles',
    icon: 'star', colors: [VIOLET],
    detail: 'Un de tes mix publiés atteint 4,5 étoiles de moyenne, avec au moins 3 avis.',
  },

  // ── Progression ──
  {
    id: 'firstLoad', family: 'progression', kind: 'unique', name: 'Première charge', desc: 'Noter une charge',
    icon: 'dumbbell', colors: [WHITE],
    detail: 'Note une charge sur un exercice de ton planning, ou pendant une séance.',
  },
  {
    id: 'overload', family: 'progression', kind: 'unique', name: 'Surcharge acceptée', desc: 'Suivre un conseil de charge',
    icon: 'trend', colors: [WHITE], premium: true,
    detail: 'Applique un conseil « tu peux monter » : un cran de plus sur la barre.',
  },
  {
    id: 'weighIn', family: 'progression', kind: 'unique', name: 'Pesée régulière', desc: '10 pesées notées',
    icon: 'scale', colors: [WHITE], target: 10,
    detail: 'Note ton poids 10 fois. Ce trophée récompense le suivi, jamais le chiffre.',
  },

  // ── Saisons ──
  {
    id: 'veteran', family: 'saisons', kind: 'tier', name: 'Vétéran', desc: 'Depuis ta 1re séance',
    icon: 'hourglass', color: AUTUMN, unit: 'months', thresholds: [1, 3, 12], labels: ['1m', '3m', '1an'],
    detail: 'Le temps écoulé depuis ta toute première séance, même les semaines où tu as fait une pause.',
  },
  {
    id: 'fourSeasons', family: 'saisons', kind: 'unique', name: 'Quatre saisons', desc: 'Une séance à chaque saison',
    icon: 'quarters', colors: SEASON4, target: 4,
    detail: 'Une séance au printemps, une en été, une en automne et une en hiver.',
  },
  {
    id: 'firstRecap', family: 'saisons', kind: 'unique', name: 'Premier bilan', desc: 'Ouvrir ton bilan de saison',
    icon: 'chart', colors: [AUTUMN],
    detail: 'Ouvre le bilan de fin de saison, depuis ton profil.',
  },

  // ── Secrets (rien n'est dit tant qu'ils ne sont pas trouvés) ──
  {
    id: 'earlyBird', family: 'secrets', kind: 'secret', name: 'Lève-tôt', desc: 'Avant 7 h',
    icon: 'sunrise', colors: [WHITE],
    detail: 'Une séance commencée avant 7 h du matin.',
  },
  {
    id: 'nightOwl', family: 'secrets', kind: 'secret', name: 'Oiseau de nuit', desc: 'Après 22 h',
    icon: 'moon', colors: [WHITE],
    detail: 'Une séance commencée après 22 h.',
  },
  {
    id: 'weekendActive', family: 'secrets', kind: 'secret', name: 'Week-end actif', desc: 'Samedi et dimanche',
    icon: 'weekend', colors: [WHITE],
    detail: 'Une séance le samedi et une le dimanche du même week-end.',
  },
  {
    id: 'onTheDot', family: 'secrets', kind: 'secret', name: 'Pile poil', desc: 'Une minute pile',
    icon: 'target', colors: [WHITE],
    detail: 'Une séance BASIC arrêtée sur une minute pile, à 5 minutes ou plus.',
  },
];

// OÙ un trophée s'annonce (retour de l'utilisateur, 21/11 : un trophée de jeu est tombé à la fin
// d'un chrono) :
//   'game'  : se gagne dans un jeu, s'annonce à la fin de la PARTIE (famille Jeux) ;
//   'timer' : se gagne dans une séance de chrono, s'annonce à la fin de la SÉANCE ;
//   'any'   : peut venir des deux (temps, jours, série, saisons…) ou d'un événement (mix publié,
//             lien envoyé, conseil suivi…) : il s'annonce au premier des deux moments.
const TIMER_ONLY = new Set([
  ...MODE_IDS, 'weeks', 'five', 'fullweek', 'foreman', 'finishTabata', 'finishEmom', 'finishAmrap',
  'bigmix', 'triple', 'longhaul', 'earlyBird', 'nightOwl', 'weekendActive', 'onTheDot',
]);
export const TROPHIES = RAW_TROPHIES.map((t) => ({
  ...t,
  scope: t.family === 'jeux' ? 'game' : TIMER_ONLY.has(t.id) ? 'timer' : 'any',
}));

export const TROPHY_BY_ID = Object.fromEntries(TROPHIES.map((t) => [t.id, t]));
export const getTrophy = (id) => TROPHY_BY_ID[id] || null;

// FORMAT d'annonce (décision de l'utilisateur, 21/11/2026) : la rareté décide.
//   'sheet'  : grande annonce plein écran, un moment fort qu'on ne rate pas ;
//   'notice' : petite notification qu'on balaye, qui ne coupe rien.
// Règle : les 5 modes (tous paliers) + tout palier OR + les 4 secrets + 3 exploits « émotion » ;
// le reste (bronze et argent des trophées à paliers, autres exploits) = notification.
const SHEET_UNIQUES = new Set(['five', 'fourSeasons', 'comeback']);
export const announceFormat = (idOrDef, tier) => {
  const def = typeof idOrDef === 'string' ? getTrophy(idOrDef) : idOrDef;
  if (!def) return 'notice';
  if (def.mode) return 'sheet';
  if (def.kind === 'secret') return 'sheet';
  if (def.kind === 'tier') return tier === 'or' ? 'sheet' : 'notice';
  return SHEET_UNIQUES.has(def.id) ? 'sheet' : 'notice';
};

// Nombre total de médailles : 45 (paliers) + 19 (exploits) + 4 (secrets) = 68.
export const TROPHY_TOTAL = TROPHIES.reduce((n, t) => n + (t.kind === 'tier' ? t.thresholds.length : 1), 0);

/* ───────────────────────── Écriture des durées et des quantités ───────────────────────── */

// Une durée en MINUTES : « 45 min » sous l'heure, « 1 h », « 1 h 30 », « 8 h 40 » au-delà.
// Jamais « 90 min » (règle de l'utilisateur).
export const formatDuration = (minutes) => {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
};

export const formatMonths = (months) => {
  const m = Math.max(0, Math.round(Number(months) || 0));
  if (m === 12) return '1 an';
  if (m > 12 && m % 12 === 0) return `${m / 12} ans`;
  return `${m} mois`;
};

// Milliers séparés par une espace insécable (« 1 000 »), sans dépendre d'Intl (selon le
// moteur JavaScript, toLocaleString('fr-FR') n'est pas garanti).
const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const pick = (value, plural) => (Array.isArray(value) ? value[plural ? 1 : 0] : value || '');

// « 50 séances », « 7 jours d’affilée », « 10 h de séance » : la quantité telle qu'on la dit.
export const formatAmount = (def, n) => {
  if (def.unit === 'time') return `${formatDuration(n)}${pick(def.tail, true)}`;
  if (def.unit === 'months') return formatMonths(n);
  const plural = n > 1;
  return `${num(n)} ${pick(def.noun, plural)}${pick(def.tail, plural)}`;
};

// Le but d'un palier en toutes lettres (« Une séance de 1 h », « 10 h sous tension »…).
export const formatGoal = (def, index) => {
  const th = def.thresholds[index];
  return def.goal ? def.goal(th) : formatAmount(def, th);
};

// « 8 h 40 sur 10 h », « 31 sur 50 », « 2 sur 3 mois » : le suivi d'un palier. Jamais de barre
// oblique : « 17/11 » se lisait « 17 sur 11 » (retour de l'utilisateur, 20/11).
export const formatProgress = (def, value, threshold) => {
  if (def.unit === 'time') return `${formatDuration(value)} sur ${formatDuration(threshold)}`;
  if (def.unit === 'months') {
    return threshold === 12 ? `${formatMonths(value)} sur 1 an` : `${Math.round(value)} sur ${formatMonths(threshold)}`;
  }
  return `${num(value)} sur ${num(threshold)}`;
};

// Ce qu'il reste, en trois mots : « encore 30 séances », « encore 55 min ».
export const formatLeft = (def, remaining) => {
  const left = Math.max(0, remaining);
  if (def.unit === 'time') return `encore ${formatDuration(left)}`;
  if (def.unit === 'months') return `encore ${formatMonths(left)}`;
  return `encore ${num(left)} ${pick(def.noun, left > 1)}`;
};

// « Plus que 1 h 20 sous tension », « Plus que 3 séances ».
export const formatRemaining = (def, remaining) => {
  const left = Math.max(0, remaining);
  if (def.unit === 'time') return `Plus que ${formatDuration(left)}${pick(def.tail, true)}`;
  if (def.unit === 'months') return `Plus que ${formatMonths(left)}`;
  const plural = left > 1;
  return `Plus que ${num(left)} ${pick(def.noun, plural)}${pick(def.tail, plural)}`;
};

// Texte COURT au centre de la médaille d'un palier.
export const medalLabel = (def, index) =>
  def.labels ? def.labels[index] : String(def.thresholds[index]);
