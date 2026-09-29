// Données factices du Hub Profil — étape 1 : interface seule, sans BDD ni
// lecture de l'historique réel. Le câblage réel viendra une fois l'interface
// validée ; chaque bloc de l'écran ne lit QUE ce fichier pour l'instant.
import { TIMERS } from './timers-config';

export const MOCK_IDENTITY = {
  // Pseudo fictif explicite : les bêta-testeurs voient cet écran, jamais le
  // vrai prénom de l'utilisateur (demande explicite, 29/09/2026).
  pseudo: 'MOI',
  initials: 'M',
  memberSince: 'sept. 2026',
  // Jusqu'à MAX_DISCIPLINES (lib/disciplines.js), la première = principale.
  disciplineIds: ['street', 'running'],
};

export const MOCK_REGULARITY = {
  streak: 6,
  bestStreak: 11,
  sessionCount: 42,
  timeLabel: '18h30',
};

// 8 dernières semaines (la plus récente en dernier), nombre de séances.
export const MOCK_WEEKLY_VOLUME = [3, 5, 2, 6, 4, 7, 5, 6];
export const MOCK_WEEKLY_LABELS = ['S31', 'S32', 'S33', 'S34', 'S35', 'S36', 'S37', 'S38'];

// 6 semaines (colonnes, la plus récente en dernier) × 7 jours (lun → dim),
// intensité 0 (rien) à 3 (grosse journée).
export const MOCK_HEATMAP_WEEKS = [
  [0, 1, 0, 2, 1, 0, 0],
  [1, 2, 1, 3, 2, 0, 1],
  [0, 0, 2, 2, 3, 1, 0],
  [2, 1, 1, 3, 2, 2, 0],
  [1, 3, 2, 2, 3, 1, 1],
  [0, 2, 3, 3, 2, 3, 1],
];
export const HEATMAP_DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Répartition des formats : couleurs des vrais modes (aucune couleur inventée).
const FORMAT_COUNTS = { amrap: 14, basic: 6, emom: 18, tabata: 9, mix: 4 };
export const MOCK_FORMAT_BREAKDOWN = TIMERS.map((t) => ({
  id: t.id,
  label: t.name,
  color: t.color,
  count: FORMAT_COUNTS[t.id] ?? 0,
}));

// 6 derniers mois (le plus récent en dernier), nombre de séances.
export const MOCK_MONTHLY_COMPARISON = [12, 15, 9, 18, 22, 20];
export const MOCK_MONTHLY_LABELS = ['AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT'];

// Temps sous tension (effort réel, repos exclus) sur le mois en cours.
export const MOCK_TIME_UNDER_TENSION = {
  label: '6h42',
  deltaPct: 12,
  // 4 dernières semaines, en minutes.
  weekly: [84, 96, 102, 120],
};

// Séances par mode, pour montrer les vraies médailles (lib/badges.js,
// BadgeMedal) dans des états variés sans historique réel.
export const MOCK_BADGE_COUNTS = { amrap: 62, basic: 8, emom: 152, tabata: 23, mix: 4 };
export const MOCK_MODE_TIME = { amrap: '14h20', basic: '1h05', emom: '21h40', tabata: '2h10', mix: '0h50' };

// Personnalisation à venir (thèmes, sons) : rien ne les implémente encore.
export const MOCK_CUSTOMIZATION = [
  { id: 'theme-neon', kind: 'THÈME', label: 'Néon', icon: 'palette', colors: ['#FF5454', '#9575FF'] },
  { id: 'theme-mono', kind: 'THÈME', label: 'Mono', icon: 'palette', colors: ['#FFFFFF', '#3A3A3A'] },
  { id: 'sound-arcade', kind: 'SONS', label: 'Arcade', icon: 'speaker', colors: ['#FFC933', '#E08500'] },
  { id: 'sound-zen', kind: 'SONS', label: 'Zen', icon: 'headphones', colors: ['#1FC777', '#047442'] },
];

// Dernière séance, pour l'aperçu « Partager ma séance » (format Story).
export const MOCK_LAST_SESSION = {
  timerId: 'emom',
  name: 'EMOM',
  duration: '24:00',
  rounds: 24,
  dateLabel: 'Aujourd’hui',
};
