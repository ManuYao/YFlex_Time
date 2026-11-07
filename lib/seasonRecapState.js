import { storage } from './storage';

// Saisons dont le bilan a déjà été montré automatiquement (« autumn-2026 »…).
// Une saison n'est proposée qu'une fois ; le bilan reste rouvrable depuis le
// Profil. Purgée par le reset complet (app/settings.js).
export const SEASON_RECAP_SEEN_KEY = 'flexTimer_seasonRecapSeen';

export const loadSeenSeasons = async () => {
  const v = await storage.get(SEASON_RECAP_SEEN_KEY);
  return Array.isArray(v) ? v.filter((k) => typeof k === 'string') : [];
};

export const markSeasonSeen = async (key) => {
  const seen = await loadSeenSeasons();
  if (seen.includes(key)) return;
  await storage.set(SEASON_RECAP_SEEN_KEY, [...seen, key].slice(-40));
};
