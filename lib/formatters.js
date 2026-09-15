export const formatValue = (v, type) => {
  if (type === 'minutes') {
    return { main: String(v).padStart(2, '0'), unit: 'min' };
  }
  if (type === 'rounds') {
    return { main: String(v).padStart(2, '0'), unit: v > 1 ? 'tours' : 'tour' };
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
