export const formatValue = (v, type) => {
  if (type === 'minutes') {
    return { main: String(v).padStart(2, '0'), unit: 'min' };
  }
  if (type === 'rounds') {
    return { main: String(v).padStart(2, '0'), unit: v > 1 ? 'tours' : 'tour' };
  }
  // Charges du planning : pas de zéro devant (on écrit "50 kg", pas "05 kg")
  // et les demi-kilos doivent rester lisibles ("2.5").
  if (type === 'weight') {
    if (v === 0) return { main: 'PDC', unit: '' };
    return { main: String(v), unit: 'kg' };
  }
  if (type === 'sets') {
    return { main: String(v).padStart(2, '0'), unit: v > 1 ? 'séries' : 'série' };
  }
  if (v < 60) {
    return { main: String(v).padStart(2, '0'), unit: 'sec' };
  }
  const mins = Math.floor(v / 60);
  const secs = v % 60;
  if (secs === 0) {
    return { main: `${mins} min`, unit: '' };
  }
  return {
    main: `${mins} min ${String(secs).padStart(2, '0')}`,
    unit: '',
  };
};

// Durée pour une case de la fiche d'exercice : "45 s", "1 min", "1 min 30"
// (jamais "90 s"). Même découpage que formatValue, unité courte sous la minute.
export const formatSecondsCompact = (v) => {
  if (v < 60) return { main: String(v), unit: 's' };
  return formatValue(v, 'seconds');
};

export const formatDuration =(totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Heures + minutes : « 1h07 ». Minutes arrondies à la plus proche, retenue
// comprise (3 599 s → « 1h00 », jamais « 0h60 »).
export const formatHoursMinutes = (totalSeconds) => {
  const totalMin = Math.round(Math.max(0, totalSeconds || 0) / 60);
  return `${Math.floor(totalMin / 60)}h${String(totalMin % 60).padStart(2, '0')}`;
};

// Durée totale d'un mix : MM:SS sous une heure, « 1h07 » au-delà (jamais « 67:00 »).
export const formatMixClock = (totalSeconds) => {
  const t = Math.max(0, Math.round(totalSeconds || 0));
  return t >= 3600 ? formatHoursMinutes(t) : formatDuration(t);
};
