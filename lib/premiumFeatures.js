// Tout ce qui est réservé à Premium, au MÊME endroit (pur, sans React : testable
// en Node). Une fonction réservée = une « porte » (gate) déclarée ici ; l'écran
// ne décide rien tout seul, il demande `isLocked(porte, isPremium)` ou passe par
// hooks/usePremiumGate.js.
//
// RÈGLES PREMIUM (valables pour toute nouvelle fonction) :
//  1. Une porte par fonction, nommée `zone.fonction` (ex. 'game.combo'), déclarée
//     dans PREMIUM_BENEFITS : la liste de la page Premium s'écrit à partir de là,
//     elle ne peut donc plus se désynchroniser des vraies règles.
//  2. Pour un non-Premium : la fonction est visible, marquée d'une couronne
//     (pastille dorée ou icône), et un appui joue le refus commun
//     (usePremiumGate().deny(porte) : vibration d'alerte, son de refus, puis le pop-up
//     Premium commun — couronne, phrase de la porte, « Voir Premium » —, JAMAIS une
//     redirection d'office vers la page Premium ; phrase = PROMPT_TEXTS plus bas).
//     Les vrais boutons « Voir Premium » (bilan de saison, analyse, partage) restent
//     des liens directs vers la page Premium : c'est leur rôle.
//  3. Pour un Premium : AUCUN repère « Premium » nulle part (ni pastille, ni
//     couronne, ni « réservé à Premium » dans un texte). Il a payé : on ne lui
//     rappelle pas ce qu'il n'a pas à se demander. Seule exception : la page
//     Premium et la ligne Paramètres, qui disent « Tu es Pro ».
//  4. Jamais de suppression de données quand on perd Premium : on refuse le
//     NOUVEL usage, on garde ce qui existe. Pour la bibliothèque de mix, la
//     personne choisit ses mix actifs et les autres passent EN PAUSE (drapeau
//     `paused`, ignoré dès qu'on est Premium) — voir lib/libraryLimits.js et
//     components/common/MixPauseGate.js.
//  5. Un écran atteignable sans passer par le menu (lien, ancien réglage) a son
//     propre filet : à l'ouverture ou au lancement il revérifie la porte.
//  6. Les limites gratuites chiffrées (3 mix créés…) restent dans leur fichier
//     (lib/libraryLimits.js, lib/publicMixShape.js) ; elles sont seulement
//     DÉCRITES ici pour la page Premium.
//  7. Une nouvelle porte = une ligne dans PREMIUM_BENEFITS + une ligne dans les
//     conditions d'utilisation (app/terms.js, date) + le site (seo-build.js).

export const PREMIUM_BENEFITS = [
  {
    id: 'planning',
    icon: 'calendar',
    title: 'Lancer depuis ton planning',
    desc: "Le planning est gratuit. En Pro, tu lances un bloc en MIX d'un maintien ou un mix enregistré directement depuis ta semaine, avec le conseil de charge.",
    gates: ['planning.launch'],
  },
  {
    id: 'library',
    icon: 'infinity',
    title: 'Une bibliothèque de mix sans limite',
    desc: "En gratuit : 3 mix créés par toi et 5 mix téléchargés depuis la communauté, que tu peux lancer mais pas modifier. En Pro : autant que tu veux, et tu modifies aussi les mix des autres. Si ton Pro s'arrête, rien n'est supprimé : tu choisis tes mix actifs, les autres attendent en pause.",
    // Limites chiffrées : gérées par lib/libraryLimits.js (hasRoomFor), pas par une porte.
    // Seule porte : modifier un mix téléchargé (lecture seule en gratuit).
    gates: ['mix.editDownloaded'],
  },
  {
    id: 'publish',
    icon: 'globe',
    title: 'Publie plus de mix',
    desc: "En gratuit : 3 mix publiés en même temps dans le fil public. En Pro : jusqu'à 30.",
    gates: [],
  },
  {
    id: 'games',
    icon: 'blocks',
    title: 'Jeux en plus',
    desc: "Le jeu Combo Bi-Exo en entier, et les formats Évolutif et Dégressif de La pyramide. La pyramide complète et Le chef d'orchestre restent gratuits.",
    gates: ['game.combo', 'game.pyramid.up', 'game.pyramid.down'],
  },
  {
    id: 'stats',
    icon: 'pulse',
    title: 'Statistiques avancées',
    desc: 'Temps sous tension, graphiques, régularité et analyse de tes jeux (parties, records, progression) : vois précisément où tu progresses.',
    gates: ['stats.advanced'],
  },
  {
    id: 'soon',
    icon: 'palette',
    title: 'Bientôt : synchronisation, thèmes et sons',
    desc: "Retrouve tes données sur tous tes appareils, et personnalise l'appli avec des thèmes et des sons exclusifs. Pas encore disponible.",
    gates: [],
    soon: true,
  },
];

// Toutes les portes connues.
export const PREMIUM_GATES = new Set(PREMIUM_BENEFITS.flatMap((b) => b.gates));

// Modifier un mix téléchargé (fil public ou lien d'ami) : lecture seule en gratuit.
export const MIX_EDIT_GATE = 'mix.editDownloaded';

// Portes des jeux (un seul endroit pour les nommer).
export const GAME_GATES = {
  combo: 'game.combo',
  pyramidFormat: (formatId) => `game.pyramid.${formatId}`,
};

// Phrase du pop-up Premium (components/common/PremiumPromptGate.js) quand une porte
// refuse : dit CE qui est réservé ET que le reste reste libre (même ton que celui du
// Planning). Une nouvelle porte ajoute sa ligne ici ; sans ligne, phrase générique.
const PROMPT_TEXTS = {
  'planning.launch': 'Lancer depuis le planning : Premium. Le reste est libre.',
  'mix.editDownloaded': 'Modifier un mix téléchargé : Premium. Tu peux le lancer, et créer tes propres mix gratuitement.',
  'game.combo': 'Combo Bi-Exo : Premium. Les autres jeux sont libres.',
  'game.pyramid.up': 'Ce format de la pyramide : Premium. La pyramide complète est libre.',
  'game.pyramid.down': 'Ce format de la pyramide : Premium. La pyramide complète est libre.',
  'stats.advanced': "L'analyse avancée : Premium. Tes stats de base sont libres.",
};
const PROMPT_FALLBACK = 'Cette fonction est réservée à Premium.';
// Quota de lancement (dormant tant que COOLDOWN_MODES est vide, lib/cooldown.js).
export const COOLDOWN_PROMPT_TEXT = 'Ce chrono est verrouillé pour le moment : Premium le débloque.';

export const gatePromptText = (gate) => PROMPT_TEXTS[gate] || PROMPT_FALLBACK;

// Une porte inconnue (faute de frappe) laisserait la fonction GRATUITE sans
// bruit : on le dit à voix haute en développement.
const warnUnknown = (gate) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && !PREMIUM_GATES.has(gate)) {
    console.warn(`[premium] porte inconnue : "${gate}" (à déclarer dans lib/premiumFeatures.js)`);
  }
};

// Cette porte est-elle réservée à Premium ? (indépendamment de la personne)
export const isGated = (gate) => {
  warnUnknown(gate);
  return PREMIUM_GATES.has(gate);
};

// Cette porte est-elle FERMÉE pour cette personne ?
export const isLocked = (gate, isPremium) => !isPremium && isGated(gate);
