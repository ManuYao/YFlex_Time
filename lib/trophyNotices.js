// File d'attente des NOTIFICATIONS de trophée (petite carte en haut de l'écran, qu'on balaye pour
// la fermer ; components/common/TrophyNotice.js, montée une fois à la racine). PUR : aucun import
// React Native, testable en Node.
//
// Seuls les trophées « du quotidien » passent par ici ; les 5 trophées de mode gardent la grande
// annonce de fin de séance (components/common/BadgeUnlockSheet.js).
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
