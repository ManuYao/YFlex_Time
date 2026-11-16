// Journal des lectures audio des JEUX (les chiffres comptés à voix haute).
//
// Pourquoi : la voix des jeux se coupe « par moments » (retours de salle du
// 14/11 et du 16/11/2026 : « 1, puis 5, puis plus rien, puis ça reprend »,
// SURTOUT quand une musique joue en fond ; sans musique ça marche direct).
// Huit correctifs à l'aveugle n'ont pas suffi (17.3.x → 18.11.2). Règle du
// CLAUDE.md : ne plus corriger au hasard — ENREGISTRER ce qui se passe
// (chaque ordre de lecture, chaque anomalie, chaque perte du lecteur
// « silence » qui tient le focus audio), puis LIRE le journal.
//
// Où le lire : Paramètres › Mémoire, carte « Voix des jeux », après une
// partie capricieuse. Bouton « Copier » pour me coller le texte.
// Tout reste dans la mémoire de l'app (perdu au redémarrage), rien ne part
// sur le réseau. Coût quasi nul : quelques entrées par seconde au pire,
// plafonnées à MAX_EVENTS.
const MAX_EVENTS = 400;

let events = [];
let dropped = 0; // entrées perdues une fois le plafond atteint
const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
};

// `tag` court (« dit », « muet », « coupé », « focus », « partie »…),
// `detail` = texte libre déjà formaté.
export const logGameAudio = (tag, detail = '') => {
  if (events.length >= MAX_EVENTS) {
    events.shift();
    dropped += 1;
  }
  events.push({ at: Date.now(), tag, detail: String(detail) });
  notify();
};

export const getGameAudioEvents = () => events.slice();
export const getGameAudioDropped = () => dropped;

export const clearGameAudioLog = () => {
  events = [];
  dropped = 0;
  notify();
};

export const subscribeGameAudioLog = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// Ces tags signalent un problème (affichés en jaune dans l'écran Mémoire).
export const GAME_AUDIO_WARN_TAGS = ['muet', 'coupé', 'décalé', 'échec', 'focus', 'sans-clip'];

const two = (x) => String(x).padStart(2, '0');

export const formatGameAudioTime = (at) => {
  const d = new Date(at);
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
};

// Tout le journal en un seul texte, pour le bouton « Copier ».
export const formatGameAudioLog = () =>
  events
    .map((e) => `${formatGameAudioTime(e.at)}  ${e.tag}${e.detail ? `  ${e.detail}` : ''}`)
    .join('\n');
