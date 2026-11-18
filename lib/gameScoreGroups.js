// Liste des scores d'un jeu (Menu › Jeux) : logique pure, sans React.
// Les 3 derniers scores restent visibles ; le reste est rangé PAR MOIS dans des
// blocs qu'on déplie. Un seul niveau de dépliage : un mois ouvert montre
// directement ses parties, jamais de bloc dans un bloc. Une longue liste
// (jusqu'à 200 parties) ne s'étale donc pas d'un coup.

export const HEAD_COUNT = 3; // scores toujours visibles, avant tout dépliage
export const PAGE = 10; // parties montrées d'un coup dans un mois déplié
export const MONTHS_PAGE = 3; // mois montrés d'un coup, les plus anciens sur demande

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Clé de tri d'un mois : « 2026-11 ».
const monthKey = (at) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// « novembre », ou « décembre 2025 » quand ce n'est pas l'année en cours.
const monthName = (at, now) => {
  const d = new Date(at);
  const year = d.getFullYear() === new Date(now).getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${MONTH_NAMES[d.getMonth()]}${year}`;
};

export const monthLabel = (at, now = Date.now()) => capitalize(monthName(at, now));

/**
 * Sépare une liste de scores en « tête » (les plus récents) et blocs par mois.
 * `getValue(score)` donne le chiffre du score (pour le « meilleur » du bloc).
 * Renvoie { head, groups: [{ key, label, items, best, continued }] } ; les
 * groupes sont du plus récent au plus ancien, les parties de chacun aussi. Si le
 * premier mois commence déjà dans la tête, son bloc le dit (« Plus tôt en
 * novembre ») : ses chiffres ne comptent que les parties qu'il contient.
 */
export const groupScores = (list, getValue = (s) => s.total ?? s.count ?? 0, now = Date.now()) => {
  const sorted = [...(Array.isArray(list) ? list : [])].sort((a, b) => (b.at || 0) - (a.at || 0));
  const head = sorted.slice(0, HEAD_COUNT);
  const rest = sorted.slice(HEAD_COUNT);

  const groups = [];
  const byKey = new Map();
  for (const s of rest) {
    const key = monthKey(s.at || 0);
    let g = byKey.get(key);
    if (!g) {
      g = { key, label: monthLabel(s.at || 0, now), items: [], best: 0, continued: false };
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(s);
    g.best = Math.max(g.best, Number(getValue(s)) || 0);
  }

  const last = head[head.length - 1];
  if (last && groups[0] && groups[0].key === monthKey(last.at || 0)) {
    const g = groups[0];
    g.continued = true;
    g.label = `Plus tôt en ${monthName(last.at || 0, now)}`;
  }
  return { head, groups };
};

// « 1 partie », « 12 parties ».
export const partiesLabel = (n) => `${n} ${n > 1 ? 'parties' : 'partie'}`;

// Le détail d'un mois : « 12 parties · meilleur 33 » (sans « meilleur » à 0).
export const groupMeta = (g) =>
  `${partiesLabel(g.items.length)}${g.best > 0 ? ` · meilleur ${g.best}` : ''}`;

// Combien de parties se cachent derrière les mois pas encore montrés.
export const olderCount = (groups, shownMonths) =>
  groups.slice(shownMonths).reduce((n, g) => n + g.items.length, 0);
