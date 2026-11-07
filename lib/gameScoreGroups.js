// Liste des scores d'un jeu (Menu › Jeux) : logique pure, sans React.
// Les 3 derniers scores restent visibles ; le reste est rangé par jour dans des
// blocs qu'on déplie, pour qu'une longue liste (jusqu'à 200 parties) ne
// s'étale pas d'un coup.

export const HEAD_COUNT = 3; // scores toujours visibles, avant tout dépliage
export const DAY_PAGE = 10; // lignes montrées d'un coup dans un jour déplié

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const startOfDay = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Nombre de jours civils entre `at` et `now` (0 = aujourd'hui). Jamais négatif.
export const daysAgo = (at, now = Date.now()) =>
  Math.max(0, Math.round((startOfDay(now) - startOfDay(at)) / 86400000));

export const dayLabel = (at, now = Date.now()) => {
  const n = daysAgo(at, now);
  if (n === 0) return 'Aujourd’hui';
  if (n === 1) return 'Hier';
  if (n <= 6) return `Il y a ${n} jours`;
  const d = new Date(at);
  const year = d.getFullYear() === new Date(now).getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year}`;
};

/**
 * Sépare une liste de scores en « tête » (les plus récents) et blocs par jour.
 * `getValue(score)` donne le chiffre du score (pour le « meilleur » du bloc).
 * Renvoie { head, groups: [{ key, label, items, best }] } ; les groupes sont
 * du plus récent au plus ancien. Si un jour commence déjà dans la tête, son
 * bloc le dit (« Plus tôt aujourd'hui », « Hier (suite) »).
 */
export const groupScores = (list, getValue = (s) => s.total ?? s.count ?? 0, now = Date.now()) => {
  const sorted = [...(Array.isArray(list) ? list : [])].sort((a, b) => (b.at || 0) - (a.at || 0));
  const head = sorted.slice(0, HEAD_COUNT);
  const rest = sorted.slice(HEAD_COUNT);

  const groups = [];
  const byKey = new Map();
  for (const s of rest) {
    const key = String(startOfDay(s.at || 0));
    let g = byKey.get(key);
    if (!g) {
      g = { key, label: dayLabel(s.at || 0, now), items: [], best: 0, continued: false };
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(s);
    g.best = Math.max(g.best, Number(getValue(s)) || 0);
  }

  const last = head[head.length - 1];
  if (last && groups[0] && groups[0].key === String(startOfDay(last.at || 0))) {
    const g = groups[0];
    g.continued = true;
    g.label = daysAgo(last.at, now) === 0 ? 'Plus tôt aujourd’hui' : `${g.label} (suite)`;
  }
  return { head, groups };
};

// « 1 partie », « 12 parties ».
export const partiesLabel = (n) => `${n} ${n > 1 ? 'parties' : 'partie'}`;
