// Statistiques des jeux (Menu › Jeux) : page « Analyse avancée » (Premium) et
// bilan de saison (pour tout le monde). Module PUR (aucun import React Native) :
// testable en Node, comme lib/profileStats.js et lib/seasonRecap.js.
//
// Source : les trois listes de scores gardées sur le téléphone (lib/gameScores.js,
// lib/gamePyramidScores.js, lib/gameComboStore.js). Chaque partie porte sa date
// (`at`), donc une saison se découpe sans rien enregistrer de plus. Les parties
// supprimées par le joueur (honor system) ne comptent évidemment plus.
import { EXERCISES, TEMPOS, DEFAULT_TEMPO } from './gameCount.js';
import { FORMATS, pyramidKey } from './gamePyramid.js';

const DAY_MS = 86400000;

export const GAMES = {
  count: { id: 'count', label: 'Le chef d’orchestre', color: '#4DD8E8' },
  pyramid: { id: 'pyramid', label: 'La pyramide', color: '#FF9A4D' },
  combo: { id: 'combo', label: 'Combo Bi-Exo', color: '#FF5FA2' },
};

const SERIES_LENGTH = 8; // dernières parties montrées dans la courbe de progression

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const dayKey = (at) => Math.round(startOfDay(at).getTime() / DAY_MS);
const mondayOf = (d) => {
  const x = startOfDay(d);
  const iso = x.getDay() === 0 ? 7 : x.getDay();
  x.setDate(x.getDate() - (iso - 1));
  return x;
};
const isoWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / DAY_MS + 1) / 7);
};

// Une partie, ramenée à la même forme pour les trois jeux :
//   key      = ce qui rend deux scores comparables (même clé que le record du jeu)
//   keyLabel = comment on nomme cette clé à l'écran
//   complete = true / false si le jeu sait si la partie est allée au bout, sinon null
const fromCount = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((e) => e && EXERCISES[e.game] && Number.isFinite(e.at) && Number.isFinite(e.count))
    .map((e) => ({
      game: 'count',
      key: e.game,
      keyLabel: EXERCISES[e.game].label,
      value: e.count,
      at: e.at,
      complete: null,
    }));

const fromPyramid = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((e) => e && EXERCISES[e.exercise] && Number.isFinite(e.at) && Number.isFinite(e.total))
    .map((e) => ({
      game: 'pyramid',
      key: pyramidKey(e.exercise, e.format, e.peak),
      keyLabel: `${EXERCISES[e.exercise].label} · ${(FORMATS[e.format] || FORMATS.pyramid).label} ${e.peak}`,
      value: e.total,
      at: e.at,
      complete: !!e.complete,
    }));

const fromCombo = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((e) => e && Number.isFinite(e.at) && Number.isFinite(e.total))
    .map((e) => {
      const tempo = TEMPOS[e.tempo] ? e.tempo : DEFAULT_TEMPO;
      return {
        game: 'combo',
        key: tempo,
        keyLabel: `Rythme ${TEMPOS[tempo].label.toLowerCase()}`,
        value: e.total,
        at: e.at,
        complete: !!e.complete,
      };
    });

const sum = (list) => list.reduce((n, v) => n + v, 0);

// Résumé d'un jeu, à partir de ses parties de la période (`plays`, déjà triées de la
// plus ancienne à la plus récente). `broke` = la partie a battu le record de sa clé.
const summarizeGame = (id, plays) => {
  const totalReps = sum(plays.map((p) => p.value));
  const bestPlay = plays.reduce((m, p) => (!m || p.value > m.value ? p : m), null);

  // Clé la plus jouée (à égalité : la plus récente) : c'est elle qui sert de courbe.
  const byKey = new Map();
  plays.forEach((p, i) => {
    const g = byKey.get(p.key) || { key: p.key, label: p.keyLabel, plays: [], lastIndex: -1 };
    g.plays.push(p);
    g.lastIndex = i;
    byKey.set(p.key, g);
  });
  const main = [...byKey.values()].sort(
    (a, b) => b.plays.length - a.plays.length || b.lastIndex - a.lastIndex
  )[0];
  const series = main.plays.slice(-SERIES_LENGTH).map((p) => p.value);

  const withEnd = plays.filter((p) => p.complete !== null);
  const finished = withEnd.filter((p) => p.complete).length;

  return {
    id,
    label: GAMES[id].label,
    color: GAMES[id].color,
    plays: plays.length,
    totalReps,
    avg: Math.round(totalReps / plays.length),
    best: { value: bestPlay.value, label: bestPlay.keyLabel },
    recordsBroken: plays.filter((p) => p.broke).length,
    // Progression sur le format le plus joué (la comparaison n'a de sens qu'à armes égales).
    main: {
      label: main.label,
      plays: main.plays.length,
      series,
      delta: series.length >= 2 ? series[series.length - 1] - series[0] : null,
    },
    // Part des parties allées jusqu'au bout (null pour le chef d'orchestre : on s'arrête quand on lâche).
    finishedPct: withEnd.length ? Math.round((finished / withEnd.length) * 100) : null,
    lastAt: plays[plays.length - 1].at,
  };
};

/**
 * Statistiques de tous les jeux.
 * @param {{count?: Array, pyramid?: Array, combo?: Array}} lists  scores locaux
 * @param {{from?: Date, to?: Date, now?: Date}} opts  `from` inclus, `to` exclu (une saison) ;
 *   sans période : toutes les parties.
 */
export const computeGameStats = (lists = {}, { from = null, to = null, now = new Date() } = {}) => {
  const all = [...fromCount(lists.count), ...fromPyramid(lists.pyramid), ...fromCombo(lists.combo)].sort(
    (a, b) => a.at - b.at
  );

  // Records battus : on suit tout l'historique (pas seulement la période), sinon la
  // première partie d'une saison compterait à tort comme un record.
  const bests = new Map();
  for (const p of all) {
    const id = `${p.game}|${p.key}`;
    const prev = bests.get(id);
    p.broke = prev !== undefined && p.value > prev;
    if (prev === undefined || p.value > prev) bests.set(id, p.value);
  }

  const lo = from ? from.getTime() : -Infinity;
  const hi = to ? to.getTime() : Infinity;
  const inPeriod = all.filter((p) => p.at >= lo && p.at < hi);

  const games = Object.keys(GAMES)
    .map((id) => inPeriod.filter((p) => p.game === id))
    .filter((plays) => plays.length > 0)
    .map((plays) => summarizeGame(plays[0].game, plays));

  const favorite = [...games].sort((a, b) => b.plays - a.plays || b.lastAt - a.lastAt)[0] || null;

  // Parties par semaine, 8 dernières semaines (la plus récente en dernier).
  const thisMonday = mondayOf(now).getTime();
  const weeklyPlays = [];
  const weeklyLabels = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - 7 * i);
    const a = start.getTime();
    const b = new Date(a);
    b.setDate(b.getDate() + 7);
    weeklyPlays.push(all.filter((p) => p.at >= a && p.at < b.getTime()).length);
    weeklyLabels.push(`S${isoWeek(start)}`);
  }

  return {
    hasData: inPeriod.length > 0,
    plays: inPeriod.length,
    totalReps: sum(inPeriod.map((p) => p.value)),
    activeDays: new Set(inPeriod.map((p) => dayKey(p.at))).size,
    recordsBroken: inPeriod.filter((p) => p.broke).length,
    favorite: favorite ? { id: favorite.id, label: favorite.label, plays: favorite.plays } : null,
    games,
    weeklyPlays,
    weeklyLabels,
  };
};
