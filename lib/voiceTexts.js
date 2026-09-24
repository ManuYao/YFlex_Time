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
  // ═══ CHANGEMENTS DE PHASE ═══
  // Début d'un effort.
  work: [
    'Go !',
    "Allez, c'est parti !",
    'On y va !',
    'Envoie !',
    "C'est reparti !",
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

  // ═══ PENDANT UN EFFORT ═══
  // Moitié d'un effort qui n'est pas toute la séance (travail d'un TABATA
  // long, bloc d'effort d'un MIX) : on dit « de l'effort ».
  work_half: [
    "Moitié de l'effort, garde ce rythme !",
    'Mi-effort, continue comme ça !',
    "La moitié de l'effort, tiens bon !",
  ],
  // AMRAP (un seul effort qui dure toute la séance).
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

  // ═══ PENDANT UN REPOS ═══
  // On récupère, puis on se prépare. Jamais « effort », jamais « pousse ».
  rest_half: [
    'Moitié du repos, respire profondément.',
    'Tu récupères bien, relâche les épaules.',
    'Profite, respire bien.',
  ],
  rest_last_10s: [
    'Dix secondes, prépare-toi !',
    'Plus que dix secondes, en place !',
    'Dix secondes, on se remet en position !',
  ],

  // ═══ EMOM : pendant un tour ═══
  // L'effort est au DÉBUT du tour ; ensuite on termine ses répétitions et
  // on souffle en attendant la vague suivante.
  emom_half: [
    'Mi-tour. Si tu as fini, souffle.',
    'Moitié du tour, termine proprement.',
    'Mi-tour, récupère si tu as terminé.',
  ],
  emom_last_10s: [
    'Dix secondes, prépare le prochain tour !',
    'Plus que dix secondes, mets-toi en place !',
    'Dix secondes, prochaine vague !',
  ],

  // ═══ REPÈRES DE TOUTE LA SÉANCE ═══
  // Peuvent tomber pendant un effort OU un repos : ils disent « la séance »,
  // pour qu'on sache de quoi on parle sans regarder l'écran.
  session_half: [
    'Moitié de la séance !',
    'La moitié de la séance est faite, continue !',
    "Mi-séance, t'es dans le rythme !",
  ],
  session_almost: [
    'Bientôt la fin de la séance, tiens bon !',
    'Dernière ligne droite !',
    'La séance se termine bientôt !',
  ],
  session_last_10s: [
    "Dix secondes et c'est terminé !",
    'Plus que dix secondes de séance !',
    'Dix secondes, on termine !',
  ],

  // ═══ FIN DE SÉANCE ═══
  end: [
    'Terminé ! Énorme séance !',
    "C'est fini, bravo, t'as tout donné !",
    'Séance bouclée, respect !',
  ],
};

// « Encore N tours » : le nombre est inséré à la place de {n}.
// Annoncé au début d'un effort (EMOM) : ton d'effort.
export const REMAINING_TEMPLATES = [
  'Plus que {n} tours !',
  'Encore {n} tours, on tient !',
  'Encore {n} tours, accroche-toi !',
];
// Annoncé au début d'un repos : ton calme, simple information.
export const REMAINING_REST_TEMPLATES = [
  'Il reste {n} tours.',
  'Encore {n} tours après ce repos.',
  'Plus que {n} tours, récupère bien.',
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
  const remaining = situation.match(/^remaining_(rest_)?(\d+)$/);
  if (remaining) {
    const word = NUMBER_WORDS[Number(remaining[2])];
    if (!word) return null;
    const [key, list] = remaining[1]
      ? ['remaining_rest', REMAINING_REST_TEMPLATES]
      : ['remaining', REMAINING_TEMPLATES];
    return pickFrom(key, list, random).replace('{n}', word);
  }
  return pickFrom(situation, VOICE_TEXTS[situation], random);
};
