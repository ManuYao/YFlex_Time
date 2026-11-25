// Restes de l'ancien Hub Profil factice : seuls ces deux éléments servent encore
// (ProfileAnalytics et ProfileGamification). Le reste (identité, séries,
// volumes, séances par mode…) a été remplacé par les vraies données de
// l'historique ; les anciennes constantes ont été retirées le 24/11/2026.

export const HEATMAP_DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Personnalisation à venir (thèmes, sons) : rien ne les implémente encore.
export const MOCK_CUSTOMIZATION = [
  { id: 'theme-neon', kind: 'THÈME', label: 'Néon', icon: 'palette', colors: ['#FF5454', '#9575FF'] },
  { id: 'theme-mono', kind: 'THÈME', label: 'Mono', icon: 'palette', colors: ['#FFFFFF', '#3A3A3A'] },
  { id: 'sound-arcade', kind: 'SONS', label: 'Arcade', icon: 'speaker', colors: ['#FFC933', '#E08500'] },
  { id: 'sound-zen', kind: 'SONS', label: 'Zen', icon: 'headphones', colors: ['#1FC777', '#047442'] },
];
