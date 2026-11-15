import { storage } from './storage';

export const PREMIUM_KEY = 'flexTimer_premium';

// Pas de vrai paiement pour l'instant (react-native-iap ne marche pas en
// Expo Go, il faudrait un dev client + un produit configuré dans Google Play
// Console). Le flag est un simple booléen local, activé/désactivé depuis
// app/premium.js — à remplacer par un vrai achat Google Play plus tard.
//
// ⚠️ Le statut est lu et écrit UNIQUEMENT ici (puis par hooks/usePremium.js).
// Une copie en mémoire est partagée par toute l'app : un écran qui s'ouvre
// connaît déjà la réponse (pas de clignotement d'une pastille « Premium » le
// temps de la lecture), et un changement fait dans Paramètres ou sur la page
// Premium arrive tout de suite à tous les écrans ouverts.
let cached = null; // null = pas encore lu
let writeVersion = 0; // pour qu'une lecture lente n'écrase jamais une écriture plus récente
const listeners = new Set();

const publish = (value) => {
  if (value === cached) return;
  cached = value;
  listeners.forEach((fn) => fn(value));
};

export const getCachedPremium = () => cached;

export const subscribePremium = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const loadIsPremium = async () => {
  const version = writeVersion;
  const value = !!(await storage.get(PREMIUM_KEY));
  if (version === writeVersion) publish(value);
  return cached === null ? value : cached;
};

export const saveIsPremium = (value) => {
  writeVersion += 1;
  publish(!!value);
  return storage.set(PREMIUM_KEY, !!value);
};
