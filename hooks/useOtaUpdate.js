import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

// Pas de re-vérification plus d'une fois par minute quand on revient au
// premier plan : le check est léger mais inutile en rafale.
const RECHECK_MIN_MS = 60 * 1000;

/**
 * Mises à jour "en l'air" (EAS Update).
 *
 * Au lancement, le natif vérifie et télécharge tout seul la dernière version
 * publiée (`checkAutomatically: ON_LOAD` dans app.json). Ici on complète avec
 * une vérification quand l'app revient au premier plan — les gens laissent
 * l'app ouverte des jours — et on expose `pending` pour afficher la feuille
 * "Nouvelle version" (UpdateGate). Le redémarrage applique la version déjà
 * téléchargée ; sans redémarrage elle s'applique au prochain lancement à froid.
 *
 * `updateId` identifie la version téléchargée (UUID côté EAS Update) : sert
 * à UpdateGate pour ne montrer la feuille qu'une fois par mise à jour réelle,
 * pas à chaque retour au premier plan (voir lib/updatePopup.js).
 *
 * Désactivé en dev (Expo Go, dev-client, `expo start`) : Updates.isEnabled
 * est faux et les appels lèveraient.
 */
export function useOtaUpdate() {
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  const lastCheckRef = useRef(0);

  const check = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled || isUpdatePending) return;
    const now = Date.now();
    if (now - lastCheckRef.current < RECHECK_MIN_MS) return;
    lastCheckRef.current = now;
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) await Updates.fetchUpdateAsync();
    } catch {
      // Hors ligne ou serveur injoignable : on retentera au prochain retour.
    }
  }, [isUpdatePending]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  const restart = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch {}
  }, []);

  return { pending: isUpdatePending, updateId: downloadedUpdate?.updateId, restart };
}
