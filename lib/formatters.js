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

export const formatDuration = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
