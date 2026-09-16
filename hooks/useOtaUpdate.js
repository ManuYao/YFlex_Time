import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

import { forceSplashNextLaunch } from '../lib/splash';

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
 * "Nouvelle version" (déclenchée depuis Home, voir hooks/useSwipeTriggeredUpdate.js).
 * Le redémarrage applique la version déjà téléchargée ; sans redémarrage elle
 * s'applique au prochain lancement à froid.
 *
 * `updateId` identifie la version téléchargée (UUID côté EAS Update) : sert à
 * ne montrer la feuille qu'une fois par mise à jour réelle, pas à chaque
 * retour au premier plan (voir lib/updatePopup.js).
 *
 * `status` / `checkNow` : diagnostic pour le bloc technique de Paramètres > À
 * propos (Aperçu de la mise à jour) — permet de vérifier ce qui se passe sur
 * un vrai APK sans brancher d'ordinateur (pas de Metro sur un build standalone).
 *
 * Désactivé en dev (Expo Go, dev-client, `expo start`) : Updates.isEnabled
 * est faux et les appels lèveraient — `diagnostics.isEnabled` le reflète.
 */
export function useOtaUpdate() {
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  const lastCheckRef = useRef(0);
  // 'idle' | 'checking' | 'up-to-date' | 'found' | 'error'
  const [status, setStatus] = useState('idle');
  const [lastCheckAt, setLastCheckAt] = useState(null);
  const [lastError, setLastError] = useState(null);

  const runCheck = useCallback(async () => {
    if (!Updates.isEnabled) {
      setStatus('error');
      setLastError('Updates désactivé (dev/Expo Go)');
      return;
    }
    setStatus('checking');
    try {
      const result = await Updates.checkForUpdateAsync();
      setLastCheckAt(Date.now());
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        setStatus('found');
      } else {
        setStatus('up-to-date');
      }
      setLastError(null);
    } catch (e) {
      setStatus('error');
      setLastError(e?.message ?? 'Erreur inconnue');
    }
  }, []);

  // Vérif automatique au retour au premier plan, throttlée — silencieuse,
  // ne touche pas `status` pour ne pas perturber le bloc diagnostic si
  // l'utilisateur est justement en train de le regarder.
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
    // Le prochain lancement (juste après ce reload) doit jouer la
    // cinématique de démarrage, comme moment "nouvelle version" — même si
    // ce n'est pas son tour dans le cycle des 10 lancements.
    await forceSplashNextLaunch();
    try {
      await Updates.reloadAsync();
    } catch {}
  }, []);

  return {
    pending: isUpdatePending,
    updateId: downloadedUpdate?.updateId,
    restart,
    checkNow: runCheck,
    status,
    lastCheckAt,
    lastError,
    diagnostics: {
      isEnabled: Updates.isEnabled,
      channel: Updates.channel,
      runtimeVersion: Updates.runtimeVersion,
      runningUpdateId: Updates.isEmbeddedLaunch ? 'embarqué (pas d’OTA)' : Updates.updateId,
    },
  };
}
