// Disciplines sportives du profil : un tag visuel, préparé pour de futurs
// algorithmes de recommandation (rien ne le lit encore). `icon` = nom AppIcon.
export const DISCIPLINES = [
  { id: 'street', label: 'Street Workout', short: 'CALISTHENICS', icon: 'bar' },
  { id: 'gym', label: 'Musculation', short: 'GYM', icon: 'dumbbell' },
  { id: 'running', label: 'Course à pied', short: 'RUNNING', icon: 'run' },
  { id: 'swim', label: 'Natation', short: 'NATATION', icon: 'swim' },
  { id: 'athletics', label: 'Athlétisme', short: 'ATHLÉTISME', icon: 'stopwatch' },
  { id: 'crossfit', label: 'Cross-training', short: 'CROSS', icon: 'bolt' },
  { id: 'other', label: 'Autre', short: 'LIBRE', icon: 'pulse' },
];

// Décision utilisateur : deux disciplines au plus par profil, dans l'ordre —
// la première est la principale (« beaucoup de street workout »), la seconde
// la secondaire (« un peu de running »).
export const MAX_DISCIPLINES = 2;
export const DISCIPLINE_RANK_LABELS = ['PRINCIPALE', 'SECONDAIRE'];

export const getDiscipline = (id) => DISCIPLINES.find((d) => d.id === id) ?? DISCIPLINES[0];

// Ajoute ou retire une discipline. Au maximum, renvoie `null` : l'écran le
// signale plutôt que de remplacer une discipline en silence.
export const toggleDiscipline = (ids, id) => {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  if (ids.length >= MAX_DISCIPLINES) return null;
  return [...ids, id];
};
