// Journal de la FENÊTRE (Paramètres › Mémoire › « Fenêtre flottante »).
//
// Pourquoi : en pop-up Samsung, la fenêtre de l'app s'ouvre grande et se redimensionne mal.
// Plutôt que des captures d'écran, on enregistre ce que l'app voit : la taille à l'ouverture
// et à chaque redimensionnement, l'écran, et le verrou d'orientation demandé à Android.
// Le testeur copie le journal et le colle dans un message. Tout reste dans la mémoire de
// l'app (perdu au redémarrage), rien ne part sur le réseau. Coût quasi nul : une entrée par
// changement de taille (déjà limité à une toutes les 100 ms par lib/throttleLatest.js),
// plafonnée à MAX_EVENTS.
const MAX_EVENTS = 300;

let events = [];
let dropped = 0;
const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
};

// `tag` court (« ouverture », « taille », « verrou », « échec »), `detail` = texte déjà formaté.
export const logWindow = (tag, detail = '') => {
  if (events.length >= MAX_EVENTS) {
    events.shift();
    dropped += 1;
  }
  events.push({ at: Date.now(), tag, detail: String(detail) });
  notify();
};

export const getWindowEvents = () => events.slice();
export const getWindowDropped = () => dropped;

export const clearWindowLog = () => {
  events = [];
  dropped = 0;
  notify();
};

export const subscribeWindowLog = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const WINDOW_WARN_TAGS = ['échec'];

const two = (x) => String(x).padStart(2, '0');

export const formatWindowTime = (at) => {
  const d = new Date(at);
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
};

// Tout le journal en un seul texte, pour le bouton « Copier ».
export const formatWindowLog = () =>
  events
    .map((e) => `${formatWindowTime(e.at)}  ${e.tag}${e.detail ? `  ${e.detail}` : ''}`)
    .join('\n');
