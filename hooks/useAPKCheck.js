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

const INITIAL = {
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
 * Déclenche la vérification d'APK au démarrage, puis à chaque retour au
 * premier plan (les gens laissent l'app ouverte des jours). Tant que rien
 * n'a répondu, l'état reste « rien à signaler » : l'app démarre toujours
 * normalement, la vérification ne retarde jamais l'affichage.
 *
 * Pop-up vs bandeau, pendant une maintenance :
 * - la pop-up (`showMaintenancePopup`) s'affiche UNE fois par message —
 *   mémorisée dans AsyncStorage, comme la feuille "Nouvelle version" ;
 * - le bandeau, lui, reste visible tant que la maintenance est annoncée.
 * Un nouveau texte dans le Gist = une nouvelle pop-up.
 */
export function useAPKCheck() {
  const [state, setState] = useState(INITIAL);
  const [showMaintenancePopup, setShowMaintenancePopup] = useState(false);
  const lastRunRef = useRef(0);

  // Quota du bouton "Vérifier maintenant" de Paramètres (5/heure glissante,
  // lib/apkVersionCheck.js) — distinct du check auto ci-dessous, qui garde
  // son throttle 24h normal.
  const [forceCheckStatus, setForceCheckStatus] = useState('idle'); // idle | checking | ok | limited | error
  const [forceCheckQuota, setForceCheckQuota] = useState({
    remaining: null,
    limit: null,
    retryAt: null,
  });

  const run = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastRunRef.current < RECHECK_MIN_MS) return;
    lastRunRef.current = now;

    const next = await checkAPKVersion({ force });
    setState(next);

    if (next.isMaintenance && next.maintenanceMessage) {
      const seen = await hasSeenMaintenanceMessage(next.maintenanceMessage);
      if (!seen) setShowMaintenancePopup(true);
    }
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

  const dismissMaintenancePopup = useCallback(() => {
    markMaintenanceMessageSeen(state.maintenanceMessage);
    setShowMaintenancePopup(false);
  }, [state.maintenanceMessage]);

  // Quota affiché dès l'ouverture de Paramètres, avant tout clic — sinon
  // "Vérifier maintenant" resterait muet sur le nombre de tentatives
  // restantes tant qu'on ne l'a pas encore utilisé une fois.
  useEffect(() => {
    let cancelled = false;
    getForceCheckQuota().then((q) => {
      if (!cancelled) setForceCheckQuota(q);
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
   */
  const recheck = useCallback(async () => {
    setForceCheckStatus('checking');
    const next = await forceCheckAPKVersion();
    setState(next);

    const quota = await getForceCheckQuota();
    setForceCheckQuota(quota);
    setForceCheckStatus(next.quotaExceeded ? 'limited' : next.error ? 'error' : 'ok');

    if (next.isMaintenance && next.maintenanceMessage) {
      const seen = await hasSeenMaintenanceMessage(next.maintenanceMessage);
      if (!seen) setShowMaintenancePopup(true);
    }
  }, []);

  return {
    ...state,
    showMaintenancePopup,
    /** Rouvre la pop-up à la demande (tap sur le bandeau). */
    openMaintenancePopup: () => setShowMaintenancePopup(true),
    dismissMaintenancePopup,
    /** Vérification manuelle plafonnée à 5/heure (bloc diagnostic Paramètres). */
    recheck,
    forceCheckStatus,
    forceCheckQuota,
  };
}
