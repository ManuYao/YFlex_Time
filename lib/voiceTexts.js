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

// ═════════════════════════════════════════════════════════════════════════
//  STYLE « ESSENTIEL » — l'autre façon de parler du coach.
// ═════════════════════════════════════════════════════════════════════════
// Style PAR DÉFAUT. Au lieu des phrases motivantes ci-dessus (style
// « Motivant », au choix et jamais supprimé), le coach donne juste l'info,
// tranchée, en une ou deux secondes : « Tour 3 sur 8. », « Repos. 30
// secondes. », « Reprise dans 10 secondes. ».
// Règle : court, mais on doit toujours comprendre DE QUOI on parle sans
// regarder l'écran (« 2 sur 3 » tout seul ne voulait rien dire — retour
// utilisateur). D'où « Tour », « de repos », « Reprise dans », « Fin dans ».
// Même moment de parole que le style Motivant (mêmes repères, décidés dans
// lib/voiceCues.js) — seule la phrase change. Pas de variantes au hasard :
// une info carrée se dit toujours pareil.
// Les nombres restent en chiffres : la synthèse vocale les lit très bien.

// 30 → « 30 secondes » ; 90 → « 1 minute 30 » ; 120 → « 2 minutes ».
// Au-delà d'une minute on arrondit à 5 s près : « 1 minute 12 » à l'oral
// n'apporte rien de plus que « 1 minute 10 ».
export const spokenDuration = (sec) => {
  let s = Math.max(0, Math.round(sec));
  if (s >= 60) s = Math.round(s / 5) * 5;
  if (s < 60) return `${s} seconde${s > 1 ? 's' : ''}`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  const min = `${m} minute${m > 1 ? 's' : ''}`;
  return r ? `${min} ${r}` : min;
};

// « Tour 3 sur 8. » — dans un MIX, seulement au changement de bloc
// (« Bloc 2 sur 4. ») : ses tours internes ne sont pas connus ici.
const roundInfo = ({ prev, cur, mode }) => {
  if (!cur.currentRound || !cur.totalRounds || cur.totalRounds < 2) return null;
  if (mode === 'mix') {
    return prev && prev.currentRound !== cur.currentRound
      ? `Bloc ${cur.currentRound} sur ${cur.totalRounds}.`
      : null;
  }
  return `Tour ${cur.currentRound} sur ${cur.totalRounds}.`;
};

// Phrase « Essentiel » d'un repère. `ctx` = { prev, cur, mode } (photos de
// lib/voiceCues.js). Renvoie null quand ce style n'a rien à dire.
export const conciseText = (situation, ctx) => {
  const { cur } = ctx;
  if (situation.startsWith('remaining_rest_')) return null; // « Tour X sur Y » le dira au prochain effort
  if (situation.startsWith('remaining_')) return roundInfo(ctx);
  switch (situation) {
    // ── Changements de phase ──
    case 'work':
      return roundInfo(ctx) || 'Go.';
    case 'last_round':
      return 'Dernier tour.';
    case 'rest': {
      const block = ctx.mode === 'mix' ? roundInfo(ctx) : null;
      const rest = cur.phaseTotal > 0 ? `Repos. ${spokenDuration(cur.phaseTotal)}.` : 'Repos.';
      return block ? `${block} ${rest}` : rest;
    }

    // ── AMRAP : une seule phase qui EST la séance ──
    case 'half':
      return `Moitié. Encore ${spokenDuration(cur.totalLeft)}.`;
    case 'almost':
    case 'boost':
      return `Encore ${spokenDuration(cur.phaseLeft)}.`;

    // ── Pendant un effort ──
    case 'work_half':
      return `Encore ${spokenDuration(cur.phaseLeft)}.`;
    case 'last_10s':
      return '10 secondes.';

    // ── Pendant un repos ──
    case 'rest_half':
      return `${spokenDuration(cur.phaseLeft)} de repos.`;
    case 'rest_last_10s':
      return 'Reprise dans 10 secondes.';

    // ── EMOM ──
    case 'emom_half':
      return `Encore ${spokenDuration(cur.phaseLeft)}.`;
    case 'emom_last_10s':
      return 'Prochain tour dans 10 secondes.';

    // ── Toute la séance (hors AMRAP) : un temps de séance annoncé seul se
    // confondrait avec celui de la phase en cours (« 23 secondes » en plein
    // repos de 10 s) — on dit donc de quoi il s'agit. ──
    case 'session_half':
      return 'Mi-séance.';
    case 'session_almost':
      return `Fin dans ${spokenDuration(cur.totalLeft)}.`;
    case 'session_last_10s':
      return 'Fin dans 10 secondes.';

    case 'end':
      return 'Terminé.';
    default:
      return null;
  }
};
