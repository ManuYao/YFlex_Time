import { storage } from './storage';

export const PREMIUM_KEY = 'flexTimer_premium';

// Pas de vrai paiement pour l'instant (react-native-iap ne marche pas en
// Expo Go, il faudrait un dev client + un produit configuré dans Google Play
// Console). Le flag est un simple booléen local, activé/désactivé depuis
// app/premium.js — à remplacer par un vrai achat Google Play plus tard.
export const loadIsPremium = async () => !!(await storage.get(PREMIUM_KEY));
export const saveIsPremium = (value) => storage.set(PREMIUM_KEY, !!value);
