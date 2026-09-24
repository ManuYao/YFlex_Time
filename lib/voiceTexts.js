// ─────────────────────────────────────────────────────────────────────────
//  TEXTES DU COACH VOCAL — c'est ICI qu'on modifie ce que dit la voix.
// ─────────────────────────────────────────────────────────────────────────
// Chaque ligne entre guillemets est une phrase possible. Pour une même
// situation, l'app en tire une au hasard (jamais deux fois la même de suite).
// Ajouter une phrase = ajouter une ligne entre guillemets, séparée par une
// virgule. Le point d'exclamation donne plus d'énergie à la voix.
//
// Garder des phrases COURTES : en TABATA une phase peut durer 10 secondes,
// une phrase trop longue déborde sur la suivante.
//
// Le réglage de la voix elle-même (grave/aigu, vitesse) est dans
// lib/voiceCoach.js, tout en haut (VOICE_TUNING).

export const VOICE_TEXTS = {
  // Début d'un effort.
  work: [
    'Go !',
    "Allez, c'est parti !",
    'On y va !',
    'Envoie !',
    'À toi de jouer !',
  ],
  // Début d'un repos.
  rest: [
    'Repos, souffle.',
    'Pause, respire.',
    'Bien joué, récupère.',
    'Souffle un coup.',
  ],
  // Début du dernier tour.
  last_round: [
    'Dernier tour, tout ce qui te reste !',
    'Dernier tour, on lâche rien !',
    "C'est le dernier, envoie tout !",
  ],

  // ── Pendant l'EFFORT ──
  half: [
    "La moitié, t'es dans le rythme !",
    'Mi-chemin, continue comme ça !',
    'Déjà la moitié, garde ce rythme !',
  ],
  almost: [
    'Presque fini, tiens bon !',
    'La fin approche, pousse !',
    "Encore un peu, t'y es presque !",
  ],
  last_10s: [
    'Dix secondes, tout donner !',
    'Plus que dix secondes, finis fort !',
    'Dix secondes, accélère !',
  ],
  // Encouragements réguliers sur un long effort (AMRAP), toutes les 3 min.
  boost: [
    "Garde le rythme, t'es bien !",
    'Tu gères, continue !',
    'Respire, reste régulier.',
    'Allez, on lâche rien !',
    'Solide, continue comme ça !',
  ],

  // ── Pendant le REPOS : on récupère, puis on se prépare ──
  half_rest: [
    'Moitié du repos, respire profondément.',
    'Tu récupères bien, encore un peu.',
    'Profite, respire bien.',
  ],
  almost_rest: [
    'Le repos se termine bientôt.',
    'Bientôt la reprise, reste concentré.',
  ],
  last_10s_rest: [
    'Dix secondes, prépare-toi !',
    'Plus que dix secondes, en place !',
    'Dix secondes, on se remet en position !',
  ],

  // Fin de séance.
  end: [
    'Terminé ! Énorme séance !',
    "C'est fini, bravo, t'as tout donné !",
    'Séance bouclée, respect !',
  ],
};

// « Encore N tours » : le nombre est inséré à la place de {n}.
export const REMAINING_TEMPLATES = [
  'Plus que {n} tours !',
  'Encore {n} tours, on tient !',
  'Encore {n} tours, accroche-toi !',
];

const NUMBER_WORDS = {
  2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq',
  6: 'six', 7: 'sept', 8: 'huit', 9: 'neuf', 10: 'dix',
};

// Mémoire du dernier texte dit par situation, pour ne jamais répéter la
// même variante deux fois de suite (module-level : survit aux re-renders).
const lastBySituation = {};

export const resetVoiceMemory = () => {
  Object.keys(lastBySituation).forEach((k) => delete lastBySituation[k]);
};

const pickFrom = (key, list, random) => {
  if (!list?.length) return null;
  if (list.length === 1) return list[0];
  const pool = list.filter((text) => text !== lastBySituation[key]);
  const chosen = pool[Math.floor(random() * pool.length)];
  lastBySituation[key] = chosen;
  return chosen;
};

// Tire un texte pour une situation. `random` injectable pour les tests.
export const pickText = (situation, { random = Math.random } = {}) => {
  if (situation.startsWith('remaining_')) {
    const word = NUMBER_WORDS[Number(situation.slice('remaining_'.length))];
    if (!word) return null;
    const template = pickFrom('remaining', REMAINING_TEMPLATES, random);
    return template.replace('{n}', word);
  }
  return pickFrom(situation, VOICE_TEXTS[situation], random);
};
