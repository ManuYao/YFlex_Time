// File d'attente des NOTIFICATIONS de trophée (petite carte en haut de l'écran, qu'on balaye pour
// la fermer ; components/common/TrophyNotice.js, montée une fois à la racine). PUR : aucun import
// React Native, testable en Node.
//
// Seuls les trophées au format 'notice' passent par ici (announceFormat, lib/trophyCatalog.js) ; les
// autres ont la grande annonce (components/common/BadgeUnlockSheet.js).
//
// Un élément : { id, tier } (id du trophée ; tier 'bronze' | 'argent' | 'or', ou 'done' pour un
// exploit ou un secret).
let queue = [];
const listeners = new Set();
const notify = () => listeners.forEach((fn) => {
  try {
    fn();
  } catch {}
});

export const pushTrophyNotices = (items) => {
  const fresh = (Array.isArray(items) ? items : []).filter((i) => i && i.id);
  if (!fresh.length) return;
  // Jamais deux fois la même carte (un rattrapage ne doit pas doubler une annonce en cours).
  const known = new Set(queue.map((q) => `${q.id}:${q.tier}`));
  const added = [];
  for (const i of fresh) {
    const key = `${i.id}:${i.tier}`;
    if (known.has(key)) continue;
    known.add(key);
    added.push(i);
  }
  if (!added.length) return;
  queue = [...queue, ...added];
  notify();
};

// Une notification ne passe JAMAIS par-dessus une grande annonce : tant qu'une grande annonce est
// ouverte (ou sur le point de l'être), les cartes attendent, puis arrivent juste après sa fermeture.
// `ms` = filet de sécurité : si la grande annonce n'est finalement pas montrée, le blocage tombe seul.
const holds = new Map();
export const holdTrophyNotices = (token, ms = 0) => {
  const old = holds.get(token);
  if (old) clearTimeout(old);
  holds.set(token, ms > 0 ? setTimeout(() => releaseTrophyNotices(token), ms) : 0);
  notify();
};
export const releaseTrophyNotices = (token) => {
  if (!holds.has(token)) return;
  const timer = holds.get(token);
  if (timer) clearTimeout(timer);
  holds.delete(token);
  notify();
};
export const isTrophyNoticesHeld = () => holds.size > 0;

export const peekTrophyNotice = () => queue[0] || null;
export const trophyNoticeCount = () => queue.length;

export const shiftTrophyNotice = () => {
  queue = queue.slice(1);
  notify();
};

export const clearTrophyNotices = () => {
  queue = [];
  notify();
};

export const onTrophyNotices = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
