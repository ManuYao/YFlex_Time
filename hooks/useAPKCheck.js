import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  checkAPKVersion,
  forceCheckAPKVersion,
  getCurrentVersion,
  getForceCheckQuota,
  hasSeenMaintenanceMessage,
  markMaintenanceMessageSeen,
} from '../lib/apkVersionCheck';

// Pas de relecture du cache plus d'une fois par minute au retour au premier
// plan (même garde-fou que useOtaUpdate) : la vraie limite est le throttle
// 24h côté réseau, celle-ci évite juste des lectures AsyncStorage en rafale.
const RECHECK_MIN_MS = 60 * 1000;

const INITIAL_STATE = {
  checked: false,
  isBlockedByForcedUpdate: false,
  isMaintenance: false,
  maintenanceMessage: '',
  forcedUpdateMessage: '',
  downloadUrl: '',
  minVersion: '',
  currentVersion: getCurrentVersion(),
  fromCache: false,
  error: null,
};

/**
 * État partagé au niveau module — PAS un `useState` par instance.
 *
 * `useAPKCheck()` est appelé deux fois dans l'app : une fois dans
 * `app/_layout.js` (pilote le bandeau/pop-up réels), une fois dans
 * `app/settings.js` (bloc diagnostic). Avec deux state React indépendants,
 * forcer une vérification depuis Paramètres ne mettait à jour QUE le
 * diagnostic — le bandeau/pop-up réels restaient sur leur ancien résultat
 * jusqu'au prochain retour au premier plan de l'instance de `_layout.js`.
 * Bug constaté le 17/09/2026 : "Maintenance: oui" dans Paramètres, mais rien
 * ne s'affiche à l'écran.
 *
 * Toutes les instances partagent donc ce même objet et se notifient entre
 * elles au moindre changement (même principe que le pub/sub de
 * `lib/splash.js` pour `onSplashRequest`).
 */
let shared = {
  state: INITIAL_STATE,
  showMaintenanceScreen: false,
  forceCheckStatus: 'idle', // idle | checking | ok | limited | error
  forceCheckQuota: { remaining: null, limit: null, retryAt: null },
};
const listeners = new Set();

const setShared = (patch) => {
  shared = { ...shared, ...patch };
  listeners.forEach((notify) => notify(shared));
};

/**
 * Déclenche la vérification d'APK au démarrage, puis à chaque retour au
 * premier plan (les gens laissent l'app ouverte des jours). Tant que rien
 * n'a répondu, l'état reste « rien à signaler » : l'app démarre toujours
 * normalement, la vérification ne retarde jamais l'affichage.
 *
 * Page vs bandeau, pendant une maintenance :
 * - la page (`showMaintenanceScreen`) s'affiche UNE fois par message —
 *   mémorisée dans AsyncStorage, comme la feuille "Nouvelle version" ;
 * - le bandeau, lui, reste visible tant que la maintenance est annoncée.
 * Un nouveau texte dans le Gist = une nouvelle pop-up.
 */
export function useAPKCheck() {
  const [local, setLocal] = useState(shared);
  const lastRunRef = useRef(0);

  useEffect(() => {
    listeners.add(setLocal);
    return () => listeners.delete(setLocal);
  }, []);

  const run = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastRunRef.current < RECHECK_MIN_MS) return;
    lastRunRef.current = now;

    const next = await checkAPKVersion({ force });
    let showScreen = shared.showMaintenanceScreen;
    if (next.isMaintenance && next.maintenanceMessage) {
      const seen = await hasSeenMaintenanceMessage(next.maintenanceMessage);
      if (!seen) showScreen = true;
    }
    setShared({ state: next, showMaintenanceScreen: showScreen });
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Le `cancelled` protège d'un setState après démontage (l'app peut être
    // rechargée par une mise à jour OTA pendant la requête).
    const safeRun = async (force) => {
      if (cancelled) return;
      await run(force);
    };

    // `false` : la première exécution passe le garde-fou mémoire de toute
    // façon (compteur à zéro), et laisse le throttle 24h décider s'il faut
    // vraiment une requête réseau ou si le cache suffit.
    safeRun(false);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') safeRun(false);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [run]);

  const dismissMaintenanceScreen = useCallback(() => {
    markMaintenanceMessageSeen(shared.state.maintenanceMessage);
    setShared({ showMaintenanceScreen: false });
  }, []);

  // Quota affiché dès l'ouverture de Paramètres, avant tout clic — sinon
  // "Vérifier maintenant" resterait muet sur le nombre de tentatives
  // restantes tant qu'on ne l'a pas encore utilisé une fois.
  useEffect(() => {
    let cancelled = false;
    getForceCheckQuota().then((q) => {
      if (!cancelled) setShared({ forceCheckQuota: q });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Vérification forcée depuis le bouton "Vérifier maintenant" de
   * Paramètres — plafonnée à 5/heure glissante, persistée (lib/apkVersionCheck.js)
   * donc pas contournable en fermant/rouvrant l'app. Séparée de `run(true)` :
   * le check auto au démarrage/retour au premier plan n'est jamais concerné
   * par cette limite, uniquement par son throttle 24h habituel.
   *
   * Écrit dans l'état PARTAGÉ (voir plus haut) : le résultat se reflète donc
   * immédiatement dans le bandeau/pop-up réels, pas seulement ici.
   */
  const recheck = useCallback(async () => {
    setShared({ forceCheckStatus: 'checking' });
    const next = await forceCheckAPKVersion();
    const quota = await getForceCheckQuota();

    let showScreen = shared.showMaintenanceScreen;
    if (next.isMaintenance && next.maintenanceMessage) {
      const seen = await hasSeenMaintenanceMessage(next.maintenanceMessage);
      if (!seen) showScreen = true;
    }

    setShared({
      state: next,
      showMaintenanceScreen: showScreen,
      forceCheckQuota: quota,
      forceCheckStatus: next.quotaExceeded ? 'limited' : next.error ? 'error' : 'ok',
    });
  }, []);

  return {
    ...local.state,
    showMaintenanceScreen: local.showMaintenanceScreen,
    /** Rouvre la pop-up à la demande (tap sur le bandeau). */
    openMaintenanceScreen: () => setShared({ showMaintenanceScreen: true }),
    dismissMaintenanceScreen,
    /** Vérification manuelle plafonnée à 5/heure (bloc diagnostic Paramètres). */
    recheck,
    forceCheckStatus: local.forceCheckStatus,
    forceCheckQuota: local.forceCheckQuota,
  };
}
