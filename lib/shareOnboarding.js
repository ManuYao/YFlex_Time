import { storage } from './storage';

// La toute première copie d'un lien de MIX explique comment le transmettre.
// Purgée par le reset complet des Paramètres.
export const SHARE_ONBOARDED_KEY = 'flexTimer_shareOnboarded';

export async function isShareOnboarded() {
  return !!(await storage.get(SHARE_ONBOARDED_KEY));
}

export async function markShareOnboarded() {
  await storage.set(SHARE_ONBOARDED_KEY, true);
}
