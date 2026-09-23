// Textes du coach vocal (TTS, expo-speech). Pas de fichiers audio : les
// phrases sont dites directement, donc les nombres ("encore N tours") sont
// composés à la volée plutôt que d'avoir un fichier par valeur.
//
// Plusieurs variantes par situation → tirées au hasard (jamais la même
// deux fois de suite, voir pickText) pour éviter la répétition mécanique.
// Reprend le vocabulaire de SCRIPT-VOIX-COACH.txt (sections A-E), moins le
// décompte de lancement (reste en bips) et les rôles de bloc MIX (écartés
// par l'utilisateur : les exercices y sont trop spécifiques pour un mot
// générique par rôle).

export const VOICE_TEXTS = {
  work: ['Go !', 'Au travail !', "C'est reparti !"],
  rest: ['Repos.', 'Souffle.', 'Récupère.'],
  last_round: ['Dernier tour !', 'Le dernier, à fond !', 'Dernier tour, tout donner !'],
  half: ['On est à la moitié !', 'La moitié est faite !', 'Mi-parcours, tiens bon !'],
  almost: ['On y est presque !', 'Encore un petit effort !', 'Plus que quelques secondes !'],
  last_10s: ['Dix secondes !', 'Plus que dix secondes !'],
  end: ['Terminé, bravo !', 'Séance validée, bien joué !', "C'est fini, tu as tout donné !"],
  boost: ['Garde le rythme !', 'Tu gères !', 'Respire, reste régulier.', 'Continue comme ça !', 'Ne lâche rien !'],
};

const NUMBER_WORDS = {
  2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq',
  6: 'six', 7: 'sept', 8: 'huit', 9: 'neuf', 10: 'dix',
};

// `remaining_4` -> "Encore quatre tours" (une seule formulation : un nombre
// n'a pas besoin de variantes, contrairement à "Go"/"Repos").
const remainingText = (situation) => {
  const n = Number(situation.slice('remaining_'.length));
  const word = NUMBER_WORDS[n];
  if (!word) return null;
  return `Encore ${word} tour${n > 1 ? 's' : ''}`;
};

// Mémoire du dernier texte dit par situation, pour ne jamais répéter la
// même variante deux fois de suite (module-level : survit aux re-renders,
// remise à zéro au montage de l'app comme tout ce registre).
const lastBysituation = {};

export const resetVoiceMemory = () => {
  Object.keys(lastBysituation).forEach((k) => delete lastBysituation[k]);
};

// Tire un texte pour une situation. `random` injectable pour les tests.
export const pickText = (situation, { random = Math.random } = {}) => {
  if (situation.startsWith('remaining_')) return remainingText(situation);
  const list = VOICE_TEXTS[situation];
  if (!list?.length) return null;
  if (list.length === 1) return list[0];
  const last = lastBysituation[situation];
  const pool = list.filter((text) => text !== last);
  const chosen = pool[Math.floor(random() * pool.length)];
  lastBysituation[situation] = chosen;
  return chosen;
};
