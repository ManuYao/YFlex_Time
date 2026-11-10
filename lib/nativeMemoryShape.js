// Logique PURE de la sonde native (aucun import React Native : testable avec Node).
// Les relevés viennent du module Android `PerfProbe` (modules/perf-probe, voir
// lib/nativeMemory.js). Tout peut manquer (téléphone ancien, module absent) : chaque
// valeur illisible est `null`, jamais une erreur.

export const KB = 1024;

const NUM_FIELDS = [
  // mémoire du processus (Ko)
  'totalPssKb', 'javaHeapKb', 'nativeHeapKb', 'graphicsKb', 'codeKb', 'stackKb',
  'privateOtherKb', 'systemKb', 'swapPssKb', 'dalvikPssKb', 'nativePssKb', 'otherPssKb',
  'vmRssKb', 'vmHwmKb', 'vmSwapKb', 'vmSizeKb',
  'nativeHeapAllocatedKb', 'nativeHeapSizeKb', 'javaUsedKb', 'javaMaxKb',
  // ressources
  'threads', 'openFds',
  // téléphone
  'availMemMb', 'totalMemMb', 'thresholdMb', 'memoryClassMb', 'largeMemoryClassMb',
  'thermalStatus', 'thermalHeadroom', 'batteryTempC', 'batteryPct',
  // processeur
  'pid', 'cpuCores', 'cpuTimeMs', 'uptimeMs', 'atMs', 'tookMs',
];
const BOOL_FIELDS = ['isLowMemory', 'isPowerSaveMode', 'batteryPlugged'];
const NEGATIVE_OK = new Set(['batteryTempC', 'thermalHeadroom']);

/** Relevé brut du module → objet complet (valeurs `null` si absentes) ou null. */
export function normalizeNativeStats(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  let any = false;
  for (const f of NUM_FIELDS) {
    const v = raw[f];
    const n = v == null ? NaN : Number(v);
    const ok = Number.isFinite(n) && (n >= 0 || NEGATIVE_OK.has(f));
    out[f] = ok ? n : null;
    if (ok) any = true;
  }
  for (const f of BOOL_FIELDS) out[f] = raw[f] === true ? true : raw[f] === false ? false : null;
  return any ? out : null;
}

/** Liste brute des fils → [{ name, tid, cpuMs, isMain }] (10 au plus), valeurs saines. */
export function normalizeThreads(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const t of raw) {
    if (!t || typeof t !== 'object') continue;
    const cpuMs = Number(t.cpuMs);
    if (!Number.isFinite(cpuMs) || cpuMs < 0) continue;
    const tid = Number(t.tid);
    out.push({
      name: typeof t.name === 'string' && t.name ? t.name : '?',
      tid: Number.isFinite(tid) ? tid : null,
      cpuMs,
      isMain: t.isMain === true,
    });
  }
  return out.slice(0, 10);
}

/** Nom lisible d'un fil (le nom système est tronqué à 15 caractères). */
export function labelThread(name, isMain = false) {
  if (isMain) return "Fil d'interface (principal)";
  const n = String(name || '');
  if (/^mqt_js/i.test(n)) return 'Fil JavaScript';
  if (/^mqt_native/i.test(n)) return 'Fil des modules natifs';
  if (/^RenderThread/i.test(n)) return 'Dessin (RenderThread)';
  if (/^hwui/i.test(n)) return 'Dessin (HWUI)';
  if (/^ExoPlayer/i.test(n)) return 'Lecteur audio (ExoPlayer)';
  if (/^(AudioTrack|AudioOut|AAudio|AudioTrackThread)/i.test(n)) return 'Son';
  if (/^(FinalizerDaemon|HeapTaskDaemon|ReferenceQueueD|FinalizerWatchd)/i.test(n)) return 'Ramasse-miettes Java';
  if (/^OkHttp/i.test(n)) return 'Réseau';
  if (/^(Binder|HwBinder)/i.test(n)) return 'Échanges avec le système';
  return n || '?';
}

// ─── Suivi entre deux relevés ───────────────────────────────────────────────

export const EMPTY_NATIVE_TRACK = Object.freeze({
  now: null, // dernier relevé complet
  base: null, // relevé du « départ » (après « Repartir de zéro »)
  minPss: null,
  maxPss: null,
  cpuPct: null, // part d'UN cœur utilisée depuis le relevé précédent (100 = un cœur plein)
  cpuPctPeak: 0,
  threads: [], // [{ name, label, tid, isMain, cpuMs, deltaMs, pct }] les plus actifs d'abord
  threadsCum: {}, // tid → cpuMs cumulé du dernier relevé (pour calculer le delta)
  thermalMax: null, // pire statut thermique vu (0 à 6)
  throttledSamples: 0, // relevés au statut ≥ 2 (modéré)
  lowMemorySeen: false,
  tempBase: null,
  tempMax: null,
  pctBase: null, // niveau de batterie au départ
  samples: 0,
});

const maxOf = (a, b) => (a == null ? b : b == null ? a : Math.max(a, b));
const minOf = (a, b) => (a == null ? b : b == null ? a : Math.min(a, b));

/**
 * Ajoute un relevé au suivi. `stats` = normalizeNativeStats(...), `threadsRaw` =
 * normalizeThreads(...). Calcule la part de processeur de l'app et l'écart par fil
 * depuis le relevé précédent.
 */
export function nextNativeTrack(prev, stats, threadsRaw) {
  const p = prev || EMPTY_NATIVE_TRACK;
  if (!stats) return p;
  const before = p.now;

  // Δ horloge (ms). Si le processus a redémarré (temps CPU qui recule) : pas de delta.
  let dt = null;
  let cpuPct = null;
  if (before && Number.isFinite(stats.atMs) && Number.isFinite(before.atMs)) {
    const d = stats.atMs - before.atMs;
    if (d > 0) dt = d;
  }
  if (
    dt != null &&
    Number.isFinite(stats.cpuTimeMs) &&
    Number.isFinite(before.cpuTimeMs) &&
    stats.cpuTimeMs >= before.cpuTimeMs
  ) {
    cpuPct = ((stats.cpuTimeMs - before.cpuTimeMs) / dt) * 100;
  }

  const cum = {};
  const rows = [];
  for (const t of threadsRaw || []) {
    if (t.tid != null) cum[t.tid] = t.cpuMs;
    const prevMs = t.tid != null ? p.threadsCum[t.tid] : undefined;
    const deltaMs = dt != null && prevMs != null && t.cpuMs >= prevMs ? t.cpuMs - prevMs : null;
    rows.push({
      name: t.name,
      label: labelThread(t.name, t.isMain),
      tid: t.tid,
      isMain: t.isMain,
      cpuMs: t.cpuMs,
      deltaMs,
      pct: deltaMs != null ? (deltaMs / dt) * 100 : null,
    });
  }
  // Les plus actifs depuis le dernier relevé d'abord ; à défaut, les plus gourmands au total.
  rows.sort((a, b) => (b.deltaMs ?? -1) - (a.deltaMs ?? -1) || b.cpuMs - a.cpuMs);

  const thermal = stats.thermalStatus;
  return {
    now: stats,
    base: p.base || stats,
    minPss: minOf(p.minPss, stats.totalPssKb),
    maxPss: maxOf(p.maxPss, stats.totalPssKb),
    cpuPct,
    cpuPctPeak: Math.max(p.cpuPctPeak || 0, cpuPct || 0),
    threads: rows.slice(0, 6),
    threadsCum: cum,
    thermalMax: maxOf(p.thermalMax, thermal),
    throttledSamples: p.throttledSamples + (thermal != null && thermal >= 2 ? 1 : 0),
    lowMemorySeen: p.lowMemorySeen || stats.isLowMemory === true,
    tempBase: p.tempBase != null ? p.tempBase : stats.batteryTempC,
    tempMax: maxOf(p.tempMax, stats.batteryTempC),
    pctBase: p.pctBase != null ? p.pctBase : stats.batteryPct,
    samples: p.samples + 1,
  };
}

/** « Repartir de zéro » : le dernier relevé devient le départ. */
export function resetNativeTrack(prev) {
  const s = prev && prev.now;
  if (!s) return EMPTY_NATIVE_TRACK;
  return {
    ...EMPTY_NATIVE_TRACK,
    now: s,
    base: s,
    minPss: s.totalPssKb,
    maxPss: s.totalPssKb,
    thermalMax: s.thermalStatus,
    throttledSamples: 0,
    lowMemorySeen: s.isLowMemory === true,
    tempBase: s.batteryTempC,
    tempMax: s.batteryTempC,
    pctBase: s.batteryPct,
    samples: 1,
  };
}

// ─── Affichage ──────────────────────────────────────────────────────────────

/** « 312 Mo » / « 1,3 Go » à partir de Ko ; « — » si inconnu. */
export function formatKb(kb) {
  if (!Number.isFinite(kb)) return '—';
  const mb = kb / KB;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1).replace('.', ',')} Go`;
  return `${(mb >= 100 ? mb.toFixed(0) : mb.toFixed(1)).replace('.', ',')} Mo`;
}

/** « +12,3 Mo » / « −1,0 Mo » / « stable » (moins de 0,3 Mo d'écart). */
export function formatDeltaKb(deltaKb) {
  if (!Number.isFinite(deltaKb)) return '';
  const mb = deltaKb / KB;
  if (Math.abs(mb) < 0.3) return 'stable';
  const txt = Math.abs(mb) >= 100 ? Math.abs(mb).toFixed(0) : Math.abs(mb).toFixed(1);
  return `${mb > 0 ? '+' : '−'}${txt.replace('.', ',')} Mo`;
}

/** « +3 » / « −1 » / « = » pour un compte (fils, fichiers ouverts). */
export function formatDeltaCount(d) {
  if (!Number.isFinite(d)) return '';
  if (d === 0) return '=';
  return `${d > 0 ? '+' : '−'}${Math.abs(Math.round(d))}`;
}

export const THERMAL_LABELS = ['Normal', 'Léger', 'Modéré', 'Sévère', 'Critique', 'Urgence', 'Arrêt'];

export function formatThermal(status) {
  if (!Number.isFinite(status)) return '—';
  return THERMAL_LABELS[Math.max(0, Math.min(THERMAL_LABELS.length - 1, Math.round(status)))];
}

/** « 38,5 °C » ; « — » si inconnu. */
export function formatTemp(c) {
  return Number.isFinite(c) ? `${c.toFixed(1).replace('.', ',')} °C` : '—';
}

/** « 42 % » (part d'un cœur : 100 % = un cœur plein) ; « — » si inconnu. */
export function formatCpu(pct) {
  return Number.isFinite(pct) ? `${Math.round(pct)} %` : '—';
}

/**
 * Lignes prêtes à afficher : [{ key, label, value, delta }]. `delta` = écart depuis
 * le départ (chaîne vide si inconnu).
 */
export function describeNative(track) {
  const t = track || EMPTY_NATIVE_TRACK;
  const n = t.now;
  if (!n) return [];
  const b = t.base || n;
  const dKb = (k) => (n[k] != null && b[k] != null ? formatDeltaKb(n[k] - b[k]) : '');
  const dCount = (k) => (n[k] != null && b[k] != null ? formatDeltaCount(n[k] - b[k]) : '');
  return [
    { key: 'totalPssKb', label: "Mémoire totale de l'app", value: formatKb(n.totalPssKb), delta: dKb('totalPssKb') },
    { key: 'javaHeapKb', label: 'Java', value: formatKb(n.javaHeapKb), delta: dKb('javaHeapKb') },
    { key: 'nativeHeapKb', label: 'Natif (C++, sons)', value: formatKb(n.nativeHeapKb), delta: dKb('nativeHeapKb') },
    { key: 'graphicsKb', label: 'Graphique (vues, images)', value: formatKb(n.graphicsKb), delta: dKb('graphicsKb') },
    { key: 'codeKb', label: "Code de l'app", value: formatKb(n.codeKb), delta: dKb('codeKb') },
    { key: 'threads', label: 'Fils en cours', value: n.threads != null ? String(n.threads) : '—', delta: dCount('threads') },
    { key: 'openFds', label: 'Fichiers ouverts', value: n.openFds != null ? String(n.openFds) : '—', delta: dCount('openFds') },
    {
      key: 'availMemMb',
      label: 'Mémoire libre du téléphone',
      value: n.availMemMb != null ? formatKb(n.availMemMb * KB) : '—',
      delta: '',
    },
    { key: 'thermalStatus', label: 'Chauffe (statut)', value: formatThermal(n.thermalStatus), delta: '' },
    {
      key: 'batteryTempC',
      label: 'Température batterie',
      value: formatTemp(n.batteryTempC),
      delta:
        n.batteryTempC != null && b.batteryTempC != null && Math.abs(n.batteryTempC - b.batteryTempC) >= 0.5
          ? `${n.batteryTempC > b.batteryTempC ? '+' : '−'}${Math.abs(n.batteryTempC - b.batteryTempC).toFixed(1).replace('.', ',')} °C`
          : '',
    },
    { key: 'cpuPct', label: "Processeur (part d'un cœur)", value: formatCpu(t.cpuPct), delta: '' },
  ];
}

/**
 * Constats en français simple, du plus grave au plus rassurant :
 * [{ level: 'ok' | 'warn' | 'bad', text }]. Ce sont des MESURES, pas des verdicts :
 * le texte dit ce qui a été relevé, pas pourquoi.
 */
export function diagnoseNative(track) {
  const t = track || EMPTY_NATIVE_TRACK;
  const n = t.now;
  const out = [];
  if (!n) return out;
  const b = t.base || n;

  // Chauffe
  if (t.thermalMax != null) {
    if (t.thermalMax >= 3) {
      out.push({ level: 'bad', text: `Le téléphone a atteint le statut de chauffe « ${formatThermal(t.thermalMax)} » : il bride le processeur pour refroidir, ce qui ralentit tout.` });
    } else if (t.thermalMax >= 2) {
      out.push({ level: 'warn', text: `Le téléphone est monté au statut de chauffe « ${formatThermal(t.thermalMax)} » : il commence à se brider.` });
    } else {
      out.push({ level: 'ok', text: `Pas de bridage dû à la chaleur relevé (statut max : ${formatThermal(t.thermalMax)}).` });
    }
  }
  if (n.batteryTempC != null) {
    const max = t.tempMax != null ? t.tempMax : n.batteryTempC;
    const level = max >= 42 ? 'bad' : max >= 38 ? 'warn' : 'ok';
    const start = t.tempBase != null ? ` (départ : ${formatTemp(t.tempBase)})` : '';
    out.push({ level, text: `Batterie : ${formatTemp(n.batteryTempC)}, pic ${formatTemp(max)}${start}.` });
  }
  if (n.isPowerSaveMode === true) {
    out.push({ level: 'warn', text: "Le mode économie d'énergie est activé : le téléphone ralentit volontairement." });
  }

  // Mémoire du téléphone
  if (t.lowMemorySeen) {
    out.push({ level: 'bad', text: 'Le téléphone a manqué de mémoire à un moment : il ferme alors des applications et ralentit.' });
  } else if (n.availMemMb != null && n.thresholdMb != null && n.availMemMb < n.thresholdMb * 2) {
    out.push({ level: 'warn', text: `Peu de mémoire libre sur le téléphone : ${formatKb(n.availMemMb * KB)} libres (seuil d'alerte ${formatKb(n.thresholdMb * KB)}).` });
  } else if (n.availMemMb != null) {
    out.push({ level: 'ok', text: `Mémoire du téléphone correcte (${formatKb(n.availMemMb * KB)} libres).` });
  }

  // Mémoire et ressources de l'app depuis le départ
  if (n.totalPssKb != null && b.totalPssKb != null) {
    const growth = n.totalPssKb - b.totalPssKb;
    if (growth > 150 * KB) {
      out.push({ level: 'warn', text: `La mémoire de l'app a augmenté de ${formatKb(growth)} depuis le départ.` });
    }
  }
  if (n.openFds != null && b.openFds != null && n.openFds - b.openFds > 100) {
    out.push({ level: 'warn', text: `${n.openFds - b.openFds} fichiers ouverts de plus qu'au départ.` });
  }
  if (n.threads != null && b.threads != null && n.threads - b.threads > 20) {
    out.push({ level: 'warn', text: `${n.threads - b.threads} fils de plus qu'au départ.` });
  }

  // Processeur
  if (t.cpuPct != null) {
    const top = t.threads.find((x) => x.pct != null);
    if (top && top.pct >= 60) {
      out.push({
        level: top.pct >= 90 ? 'bad' : 'warn',
        text: `« ${top.label} » occupe ${formatCpu(top.pct)} d'un cœur du processeur (l'app en tout : ${formatCpu(t.cpuPct)}).`,
      });
    } else if (t.cpuPct >= 150) {
      out.push({ level: 'warn', text: `L'app utilise ${formatCpu(t.cpuPct)} d'un cœur (plusieurs cœurs à la fois).` });
    } else {
      out.push({ level: 'ok', text: `Processeur au repos ou presque (${formatCpu(t.cpuPct)} d'un cœur).` });
    }
  }

  const order = { bad: 0, warn: 1, ok: 2 };
  return out.sort((a, b2) => order[a.level] - order[b2.level]);
}
