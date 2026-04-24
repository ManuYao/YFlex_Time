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
    return { main: `${String(mins).padStart(2, '0')}:00`, unit: 'min' };
  }
  return {
    main: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    unit: 'min',
  };
};

export const formatDuration = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
