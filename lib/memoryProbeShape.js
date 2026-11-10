// Logique PURE du compteur de mémoire (aucun import React Native : testable avec Node).
//
// On ne mesure ici que la mémoire du CODE de l'app (le « tas » JavaScript de
// Hermes, via `performance.memory`). Elle monte quand l'app garde des données
// ou des objets dont elle n'a plus besoin. Elle monte et descend en dents de scie
// (le ramasse-miettes la vide de temps en temps) : ce qui compte est le PLANCHER
// (le plus bas atteint), car un plancher qui monte écran après écran = quelque
// chose s'accumule.
// La mémoire TOTALE de l'app (images, vues natives, sons) n'est pas lisible depuis
// le JavaScript : elle demandera un petit module natif (prochain APK).

export const MB = 1024 * 1024;

export const EMPTY_STATS = Object.freeze({
  now: null, // dernière lecture
  base: null, // première lecture après « Repartir de zéro »
  min: null, // plancher depuis le départ
  max: null, // pic depuis le départ
  samples: 0,
});

/** Met à jour les statistiques avec une nouvelle lecture (octets). */
export function nextStats(prev, used) {
  const p = prev || EMPTY_STATS;
  if (!Number.isFinite(used) || used <= 0) return p;
  return {
    now: used,
    base: p.base == null ? used : p.base,
    min: p.min == null ? used : Math.min(p.min, used),
    max: p.max == null ? used : Math.max(p.max, used),
    samples: p.samples + 1,
  };
}

/** Repart de zéro à partir de la dernière lecture connue. */
export function resetStats(prev) {
  const used = prev && prev.now;
  if (!Number.isFinite(used)) return EMPTY_STATS;
  return { now: used, base: used, min: used, max: used, samples: 1 };
}

/** « 23,4 Mo » (une décimale sous 100 Mo) ; « — » si inconnu. */
export function formatMb(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  const mb = bytes / MB;
  return `${(mb >= 100 ? mb.toFixed(0) : mb.toFixed(1)).replace('.', ',')} Mo`;
}

/** Écart signé « +4,2 Mo » / « −1,0 Mo » / « stable » (moins de 0,3 Mo). */
export function formatDelta(now, base) {
  if (!Number.isFinite(now) || !Number.isFinite(base)) return '';
  const d = (now - base) / MB;
  if (Math.abs(d) < 0.3) return 'stable';
  const txt = Math.abs(d) >= 100 ? Math.abs(d).toFixed(0) : Math.abs(d).toFixed(1);
  return `${d > 0 ? '+' : '−'}${txt.replace('.', ',')} Mo`;
}

// ─── Fluidité ────────────────────────────────────────────────────────────────
// Une mesure par seconde : images par seconde, pire image (en ms, côté écran) et
// pire « gel » du code JavaScript (en ms). Au-delà de ~33 ms une image est
// perdue ; au-delà de ~400 ms de gel, les touches arrivent en retard.

export const SLOW_FRAME_MS = 33;
// Au-delà, c'est presque sûrement un retour d'arrière-plan : mesure ignorée.
export const IGNORE_ABOVE_MS = 5000;

// Journal des « gros moments » (pour une capture d'écran après une séance) :
// une image de plus de EVENT_FRAME_MS ou un gel de plus de EVENT_STALL_MS.
export const EVENT_FRAME_MS = 100;
export const EVENT_STALL_MS = 300;
export const MAX_EVENTS = 8;

export const EMPTY_PERF = Object.freeze({
  fps: null,
  worstFrame: 0, // pire image de la dernière seconde
  slowFrames: 0, // images lentes de la dernière seconde
  stall: 0, // pire gel JS de la dernière seconde
  worstFrameAll: null, // { ms, path, at } depuis « Repartir de zéro »
  worstStallAll: null, // { ms, path, at }
  slowAll: 0,
  seconds: 0,
  events: [], // les MAX_EVENTS derniers gros moments : { at, path, frame, stall }
});

/** Ajoute la mesure d'une seconde ; `path` = écran ouvert à ce moment-là. */
export function nextPerf(prev, sample, path = '', now = 0) {
  const p = prev || EMPTY_PERF;
  if (!sample) return p;
  const worstFrame = Math.max(0, Math.round(Number(sample.worstFrame) || 0));
  const stall = Math.max(0, Math.round(Number(sample.stall) || 0));
  if (worstFrame > IGNORE_ABOVE_MS || stall > IGNORE_ABOVE_MS) return p;
  const slowFrames = Math.max(0, Math.round(Number(sample.slowFrames) || 0));
  const fps = Number.isFinite(sample.fps) ? Math.round(sample.fps) : null;
  const wf = p.worstFrameAll;
  const ws = p.worstStallAll;
  const big = worstFrame >= EVENT_FRAME_MS || stall >= EVENT_STALL_MS;
  const prevEvents = p.events || [];
  return {
    fps,
    worstFrame,
    slowFrames,
    stall,
    worstFrameAll: worstFrame > (wf ? wf.ms : 0) ? { ms: worstFrame, path, at: now } : wf,
    worstStallAll: stall > (ws ? ws.ms : 0) ? { ms: stall, path, at: now } : ws,
    slowAll: p.slowAll + slowFrames,
    seconds: p.seconds + 1,
    events: big
      ? [...prevEvents, { at: now, path, frame: worstFrame, stall }].slice(-MAX_EVENTS)
      : prevEvents,
  };
}

/** « 21:17:42 » à partir d'un horodatage en ms (heure locale). */
export function formatClock(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const d = new Date(ms);
  const two = (n) => String(n).padStart(2, '0');
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

/** « 85 ms » / « 1,3 s » ; « — » si inconnu. */
export function formatMs(ms) {
  if (!Number.isFinite(ms)) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
  return `${Math.round(ms)} ms`;
}

/** 'ok' | 'warn' | 'bad' pour colorer l'affichage. */
export function perfLevel(sample) {
  if (!sample) return 'ok';
  if (sample.worstFrame >= 100 || sample.stall >= 400) return 'bad';
  if (sample.worstFrame >= 50 || sample.stall >= 150) return 'warn';
  return 'ok';
}

/** Lecture brute de `performance.memory` → octets utilisés, ou null si absente. */
export function pickUsedBytes(memory) {
  if (!memory) return null;
  const used = Number(memory.usedJSHeapSize);
  return Number.isFinite(used) && used > 0 ? used : null;
}
