// Logique PURE du « mode allégé » selon la CHAUFFE du téléphone (aucun import React Native :
// testable avec Node). Décision de l'utilisateur (11/11/2026) : des paliers, pas un
// interrupteur — les effets de décor RALENTISSENT d'abord, puis S'ARRÊTENT.
//
//   niveau 0 = normal ; niveau 1 = effets ralentis ; niveau 2 = effets coupés.
//
// Le niveau 2 est aussi celui de l'économie de batterie (≤ 20 %, voir lib/batteryEcoShape.js).
// On MONTE tout de suite quand le téléphone chauffe, on REDESCEND lentement (il faut rester
// plus frais pendant COOL_HOLD_MS). Les flammes de série ne sont jamais touchées.

export const LEVEL_NORMAL = 0;
export const LEVEL_SLOW = 1;
export const LEVEL_OFF = 2;

// Statut thermique Android (PowerManager, API 29+) : 0 normal, 1 léger, 2 modéré, 3 sévère…
export const THERMAL_SLOW_STATUS = 1;
export const THERMAL_OFF_STATUS = 2;
// Température de la batterie (°C), lue sur tous les téléphones (le statut thermique,
// lui, manque sur les plus anciens).
export const TEMP_SLOW_C = 40;
export const TEMP_OFF_C = 43;
// Redescendre d'un niveau demande de rester sous le seuil pendant 10 minutes d'affilée.
export const COOL_HOLD_MS = 10 * 60 * 1000;

const num = (v) => (v == null || v === '' ? NaN : Number(v));

/** Y a-t-il au moins une lecture de chauffe exploitable ? */
export function hasHeatReading(reading) {
  return !!reading && (Number.isFinite(num(reading.thermalStatus)) || Number.isFinite(num(reading.batteryTempC)));
}

/** Niveau (0, 1 ou 2) que demande UNE lecture de chauffe : le plus sévère des deux signaux. */
export function heatLevelOf(reading) {
  if (!reading) return LEVEL_NORMAL;
  const status = num(reading.thermalStatus);
  const temp = num(reading.batteryTempC);
  let level = LEVEL_NORMAL;
  if (Number.isFinite(status)) {
    if (status >= THERMAL_OFF_STATUS) level = LEVEL_OFF;
    else if (status >= THERMAL_SLOW_STATUS) level = LEVEL_SLOW;
  }
  if (Number.isFinite(temp)) {
    if (temp >= TEMP_OFF_C) level = LEVEL_OFF;
    else if (temp >= TEMP_SLOW_C) level = Math.max(level, LEVEL_SLOW);
  }
  return level;
}

export const INITIAL_HEAT = Object.freeze({ level: LEVEL_NORMAL, coolSince: null });

/**
 * État suivant. Monte tout de suite ; redescend (au niveau demandé par la lecture) seulement
 * après COOL_HOLD_MS d'affilée sous le niveau actuel. Renvoie le MÊME objet si rien ne change.
 */
export function nextHeat(prev, reading, now) {
  const p = prev || INITIAL_HEAT;
  if (!hasHeatReading(reading)) return p;
  const wanted = heatLevelOf(reading);
  if (wanted >= p.level) {
    return wanted === p.level && p.coolSince == null ? p : { level: wanted, coolSince: null };
  }
  const since = p.coolSince == null ? now : p.coolSince;
  if (now - since >= COOL_HOLD_MS) return { level: wanted, coolSince: null };
  return since === p.coolSince ? p : { level: p.level, coolSince: since };
}

/** Niveau final : l'économie de batterie (coupure) l'emporte sur la chauffe. */
export function combineLevel(batteryEcoApplied, heatLevel) {
  return batteryEcoApplied ? LEVEL_OFF : heatLevel || LEVEL_NORMAL;
}

/**
 * Facteur de durée à appliquer aux boucles de décor : 1 en normal, 2 en ralenti ; `null` =
 * ne plus animer du tout (niveau 2).
 */
export function slowFactor(level) {
  if (level >= LEVEL_OFF) return null;
  return level === LEVEL_SLOW ? 2 : 1;
}
